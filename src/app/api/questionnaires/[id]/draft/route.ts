import { NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/rbac/authorize';
import { questionnaireDraftSchema } from '@/lib/validation/questionnaire';
import { generateDraftAnswer } from '@/lib/questionnaire/drafting';
import { deriveQuestionnaireUploadStatus } from '@/lib/trust/packets';
import { resolveTrustFindingsForQuestionnaireItem, syncTrustFinding } from '@/lib/trust/findings';
import { requireCopilotQuota } from '@/lib/billing/entitlements';
import { handleRouteError, notFound, badRequest } from '@/lib/http';
import { writeAuditLog } from '@/lib/audit';

function latestMapping<T>(items: T[]) {
  return items[0];
}

function estimateTokens(value: string) {
  if (!value) return 0;
  return Math.ceil(value.length / 4);
}

function dedupe(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value))
    )
  );
}

async function ensureMissingEvidenceTask(args: {
  tenantId: string;
  questionnaireUploadId: string;
  questionnaireItemId: string;
  trustInboxItemId?: string | null;
  title: string;
  description: string;
  controlCode?: string | null;
  assignee?: string | null;
  priority: 'MEDIUM' | 'HIGH';
  createdBy: string;
}) {
  const existing = await prisma.task.findFirst({
    where: {
      tenantId: args.tenantId,
      questionnaireItemId: args.questionnaireItemId,
      title: args.title,
      status: { in: ['TODO', 'IN_PROGRESS', 'BLOCKED'] }
    },
    select: { id: true }
  });

  if (existing) {
    return { id: existing.id, created: false };
  }

  const task = await prisma.task.create({
    data: {
      tenantId: args.tenantId,
      questionnaireUploadId: args.questionnaireUploadId,
      questionnaireItemId: args.questionnaireItemId,
      trustInboxItemId: args.trustInboxItemId,
      title: args.title,
      controlCode: args.controlCode,
      description: args.description,
      assignee: args.assignee,
      priority: args.priority,
      createdBy: args.createdBy
    }
  });

  return { id: task.id, created: true };
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionContext();
    requireRole(session, 'MEMBER');
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
                    guidance: true,
                    control: {
                      select: {
                        id: true,
                        code: true
                      }
                    }
                  }
                }
              }
            }
          },
          orderBy: { rowOrder: 'asc' }
        },
        trustInboxItem: {
          select: {
            id: true,
            status: true
          }
        }
      }
    });

    if (!upload) return notFound('Questionnaire upload not found');

    const requestedIds = new Set(payload.itemIds ?? []);
    const maxItems = payload.maxItems ?? 100;
    const targetItems = upload.items
      .filter((item) => (requestedIds.size ? requestedIds.has(item.id) : true))
      .slice(0, maxItems);
    if (!targetItems.length) {
      return badRequest('No questionnaire items were selected for drafting');
    }

    const estimatedRequestTokens = targetItems.reduce((sum, item) => {
      const mapping = latestMapping(item.mappings);
      const guidance = mapping?.templateQuestion?.guidance ?? mapping?.templateQuestion?.prompt ?? '';
      return sum + estimateTokens(item.questionText) + estimateTokens(guidance);
    }, 0);

    await requireCopilotQuota(session.tenantId, estimatedRequestTokens);

    const approvedAnswers = await prisma.approvedAnswer.findMany({
      where: {
        tenantId: session.tenantId,
        status: 'ACTIVE'
      },
      orderBy: { updatedAt: 'desc' },
      take: 250
    });
    const approvedAnswerCandidates = approvedAnswers.map((answer) => ({
      id: answer.id,
      normalizedQuestion: answer.normalizedQuestion,
      questionText: answer.questionText,
      answerText: answer.answerText,
      mappedControlIds: answer.mappedControlIds,
      supportingEvidenceIds: answer.supportingEvidenceIds,
      scope: answer.scope
    }));

    const drafted = [];
    const latestStatuses: Array<{ status: 'DRAFT' | 'NEEDS_REVIEW' | 'APPROVED' | 'REJECTED' }> = [];
    let followUpTaskCount = 0;
    let aiTokens = estimatedRequestTokens;
    for (const item of targetItems) {
      const mapping = latestMapping(item.mappings);
      const mappedQuestion = mapping?.templateQuestion;
      const mappedControlIds = dedupe([mappedQuestion?.control?.id]);

      const draft = await generateDraftAnswer({
        tenantId: session.tenantId,
        questionText: item.questionText,
        guidance: mappedQuestion?.guidance ?? mappedQuestion?.prompt ?? null,
        mappedControlIds,
        approvedAnswers: approvedAnswerCandidates
      });

      const stored = await prisma.draftAnswer.create({
        data: {
          tenantId: session.tenantId,
          questionnaireItemId: item.id,
          normalizedQuestion: draft.normalizedQuestion,
          mappedControlIds: draft.mappedControlIds,
          supportingEvidenceIds: draft.supportingEvidenceIds,
          answerText: draft.answerText,
          citationsJson: draft.citations,
          model: draft.model,
          confidenceScore: draft.confidenceScore,
          reviewRequired: draft.reviewRequired,
          status: draft.reviewRequired ? 'NEEDS_REVIEW' : 'DRAFT',
          reviewReason: draft.reviewReason,
          notesForReviewer: draft.notesForReviewer,
          createdBy: session.userId
        }
      });

      latestStatuses.push({ status: stored.status });

      if (draft.approvedAnswerId) {
        await prisma.approvedAnswer.update({
          where: { id: draft.approvedAnswerId },
          data: {
            lastUsedAt: new Date(),
            usageCount: {
              increment: 1
            }
          }
        });
      }

      if (payload.createFollowUpTasks !== false && ['WEAK', 'MISSING'].includes(draft.supportStrength)) {
        const task = await ensureMissingEvidenceTask({
          tenantId: session.tenantId,
          questionnaireUploadId: upload.id,
          questionnaireItemId: item.id,
          trustInboxItemId: upload.trustInboxItem?.id ?? null,
          title: `Collect support for ${item.rowKey} questionnaire response`,
          description: [
            `Question: ${item.questionText}`,
            mappedQuestion?.prompt ? `Mapped question: ${mappedQuestion.prompt}` : null,
            draft.reviewReason ? `Reason: ${draft.reviewReason}` : null,
            draft.supportingEvidenceIds.length
              ? `Current evidence ids: ${draft.supportingEvidenceIds.join(', ')}`
              : 'No approved supporting evidence is linked yet.',
            'Next action: attach approved evidence or revise the response before approval.'
          ]
            .filter(Boolean)
            .join('\n'),
          controlCode: mappedQuestion?.control?.code ?? null,
          assignee: upload.assignedReviewerUserId ?? upload.reviewerUserId ?? null,
          priority: draft.supportStrength === 'MISSING' ? 'HIGH' : 'MEDIUM',
          createdBy: session.userId
        });

        if (task.created) {
          followUpTaskCount += 1;

          await writeAuditLog({
            tenantId: session.tenantId,
            actorUserId: session.userId,
            entityType: 'task',
            entityId: task.id,
            action: 'create',
            metadata: {
              questionnaireUploadId: upload.id,
              questionnaireItemId: item.id,
              source: 'missing_evidence_follow_up'
            }
          });
        }

        const finding = await syncTrustFinding({
          tenantId: session.tenantId,
          sourceType: 'TRUSTOPS_EVIDENCE_GAP',
          questionnaireUploadId: upload.id,
          questionnaireItemId: item.id,
          taskId: task.id,
          ownerUserId: upload.assignedReviewerUserId ?? null,
          createdBy: session.userId,
          title: `Evidence gap for ${item.rowKey}`,
          description: [
            `Question: ${item.questionText}`,
            draft.reviewReason ? `Reason: ${draft.reviewReason}` : null,
            draft.supportingEvidenceIds.length
              ? `Current evidence ids: ${draft.supportingEvidenceIds.join(', ')}`
              : 'No approved evidence linked yet.',
            'TrustOps finding created from questionnaire drafting.'
          ]
            .filter(Boolean)
            .join('\n'),
          controlCode: mappedQuestion?.control?.code ?? null,
          supportStrength: draft.supportStrength,
          priority: draft.supportStrength === 'MISSING' ? 'HIGH' : 'MEDIUM'
        });

        await writeAuditLog({
          tenantId: session.tenantId,
          actorUserId: session.userId,
          entityType: 'finding',
          entityId: finding.id,
          action: 'sync',
          metadata: {
            questionnaireUploadId: upload.id,
            questionnaireItemId: item.id,
            source: 'questionnaire_draft',
            supportStrength: draft.supportStrength,
            taskId: task.id
          }
        });
      } else {
        await resolveTrustFindingsForQuestionnaireItem({
          tenantId: session.tenantId,
          questionnaireItemId: item.id,
          sourceType: 'TRUSTOPS_EVIDENCE_GAP'
        });
      }

      drafted.push({
        itemId: item.id,
        rowKey: item.rowKey,
        questionText: item.questionText,
        mappedPrompt: mappedQuestion?.prompt ?? null,
        normalizedQuestion: stored.normalizedQuestion,
        answerText: stored.answerText,
        citations: draft.citations,
        model: stored.model,
        confidenceScore: stored.confidenceScore,
        reviewRequired: stored.reviewRequired,
        status: stored.status,
        reviewReason: stored.reviewReason,
        mappedControlIds: stored.mappedControlIds,
        supportingEvidenceIds: stored.supportingEvidenceIds
      });
      aiTokens += estimateTokens(stored.answerText);
    }

    const nextUploadStatus = deriveQuestionnaireUploadStatus(latestStatuses, upload.items.length);
    await prisma.questionnaireUpload.update({
      where: { id: upload.id },
      data: {
        status: nextUploadStatus
      }
    });

    if (upload.trustInboxItem?.id) {
      await prisma.trustInboxItem.update({
        where: { id: upload.trustInboxItem.id },
        data: {
          status: nextUploadStatus === 'APPROVED' ? 'DRAFT_READY' : 'IN_REVIEW'
        }
      });
    }

    await writeAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      entityType: 'questionnaire_upload',
      entityId: upload.id,
      action: 'questionnaire_draft',
      metadata: {
        draftCount: drafted.length,
        aiTokens,
        followUpTaskCount,
        uploadStatus: nextUploadStatus
      }
    });

    return NextResponse.json({
      questionnaireId: upload.id,
      draftCount: drafted.length,
      followUpTaskCount,
      status: nextUploadStatus,
      drafts: drafted
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
