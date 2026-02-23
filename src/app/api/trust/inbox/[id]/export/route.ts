import { getSessionContext } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { buildQuestionnaireCsv } from '@/lib/questionnaire/export';
import { handleRouteError, notFound, badRequest } from '@/lib/http';
import { writeAuditLog } from '@/lib/audit';

export async function POST(_: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionContext();
    const item = await prisma.trustInboxItem.findFirst({
      where: { id: params.id, tenantId: session.tenantId },
      select: {
        id: true,
        title: true,
        questionnaireUploadId: true
      }
    });

    if (!item) return notFound('Trust inbox item not found');
    if (!item.questionnaireUploadId) {
      return badRequest('This trust inbox item has no questionnaire upload linked');
    }

    const upload = await prisma.questionnaireUpload.findFirst({
      where: {
        id: item.questionnaireUploadId,
        tenantId: session.tenantId
      },
      include: {
        items: {
          include: {
            mappings: {
              include: {
                templateQuestion: {
                  select: {
                    prompt: true
                  }
                }
              },
              orderBy: { updatedAt: 'desc' },
              take: 1
            },
            draftAnswers: {
              orderBy: { createdAt: 'desc' },
              take: 1
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!upload) return notFound('Linked questionnaire upload not found');

    const csv = buildQuestionnaireCsv(
      upload.items.map((row) => {
        const latestDraft = row.draftAnswers[0];
        const citations = Array.isArray(latestDraft?.citationsJson)
          ? (latestDraft.citationsJson as Array<{ evidenceName?: string; chunkIndex?: number }>)
          : [];

        return {
          rowKey: row.rowKey,
          questionText: row.questionText,
          mappedPrompt: row.mappings[0]?.templateQuestion?.prompt ?? null,
          answerText: latestDraft?.answerText ?? null,
          citations
        };
      })
    );

    await writeAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      entityType: 'trust_inbox_item',
      entityId: item.id,
      action: 'export',
      metadata: {
        questionnaireUploadId: upload.id,
        rowCount: upload.items.length
      }
    });

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="trust-inbox-${item.id}-completed.csv"`
      }
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
