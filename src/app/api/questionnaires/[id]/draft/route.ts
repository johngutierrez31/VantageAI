import { NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/rbac/authorize';
import { questionnaireDraftSchema } from '@/lib/validation/questionnaire';
import { generateDraftAnswer } from '@/lib/questionnaire/drafting';
import { requireAIAccess, requireCopilotQuota } from '@/lib/billing/entitlements';
import { handleRouteError, notFound } from '@/lib/http';
import { writeAuditLog } from '@/lib/audit';

function latestMapping<T>(items: T[]) {
  return items[0];
}

function estimateTokens(value: string) {
  if (!value) return 0;
  return Math.ceil(value.length / 4);
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionContext();
    requireRole(session, 'MEMBER');
    await requireAIAccess(session.tenantId);
    const payload = questionnaireDraftSchema.parse(await request.json());

    const upload = await prisma.questionnaireUpload.findFirst({
      where: { id: params.id, tenantId: session.tenantId },
      include: {
        items: {
          include: {
            mappings: {
              orderBy: { updatedAt: 'desc' },
              include: {
                templateQuestion: {
                  select: {
                    id: true,
                    prompt: true,
                    guidance: true
                  }
                }
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!upload) return notFound('Questionnaire upload not found');

    const requestedIds = new Set(payload.itemIds ?? []);
    const maxItems = payload.maxItems ?? 100;
    const targetItems = upload.items
      .filter((item) => (requestedIds.size ? requestedIds.has(item.id) : true))
      .slice(0, maxItems);

    const estimatedRequestTokens = targetItems.reduce((sum, item) => {
      const mapping = latestMapping(item.mappings);
      const guidance = mapping?.templateQuestion?.guidance ?? mapping?.templateQuestion?.prompt ?? '';
      return sum + estimateTokens(item.questionText) + estimateTokens(guidance);
    }, 0);

    await requireCopilotQuota(session.tenantId, estimatedRequestTokens);

    const drafted = [];
    let aiTokens = estimatedRequestTokens;
    for (const item of targetItems) {
      const mapping = latestMapping(item.mappings);
      const mappedQuestion = mapping?.templateQuestion;

      const draft = await generateDraftAnswer({
        tenantId: session.tenantId,
        questionText: item.questionText,
        guidance: mappedQuestion?.guidance ?? mappedQuestion?.prompt ?? null
      });

      const stored = await prisma.draftAnswer.create({
        data: {
          tenantId: session.tenantId,
          questionnaireItemId: item.id,
          answerText: draft.answerText,
          citationsJson: draft.citations,
          model: draft.model,
          createdBy: session.userId
        }
      });

      drafted.push({
        itemId: item.id,
        rowKey: item.rowKey,
        questionText: item.questionText,
        mappedPrompt: mappedQuestion?.prompt ?? null,
        answerText: stored.answerText,
        citations: draft.citations,
        model: stored.model
      });
      aiTokens += estimateTokens(stored.answerText);
    }

    await writeAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      entityType: 'questionnaire_upload',
      entityId: upload.id,
      action: 'questionnaire_draft',
      metadata: {
        draftCount: drafted.length,
        aiTokens
      }
    });

    return NextResponse.json({
      questionnaireId: upload.id,
      draftCount: drafted.length,
      drafts: drafted
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
