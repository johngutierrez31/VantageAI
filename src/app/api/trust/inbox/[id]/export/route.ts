import { getSessionContext } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { buildApprovedQuestionnaireExportRows, buildQuestionnaireCsv } from '@/lib/questionnaire/export';
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
              where: { status: 'APPROVED' },
              orderBy: { createdAt: 'desc' },
              take: 1
            }
          },
          orderBy: { rowOrder: 'asc' }
        }
      }
    });

    if (!upload) return notFound('Linked questionnaire upload not found');
    const approvedCount = upload.items.filter((row) => row.draftAnswers[0]).length;
    if (!approvedCount) {
      return badRequest('No approved questionnaire answers are available to export');
    }

    const exportRows = buildApprovedQuestionnaireExportRows(
      upload.items.map((row) => {
        const latestDraft = row.draftAnswers[0];
        const citations = Array.isArray(latestDraft?.citationsJson)
          ? (latestDraft.citationsJson as Array<{ evidenceName?: string; chunkIndex?: number }>)
          : [];

        return {
          rowKey: row.rowKey,
          questionText: row.questionText,
          normalizedQuestion: row.normalizedQuestion,
          mappedPrompt: row.mappings[0]?.templateQuestion?.prompt ?? null,
          draft: latestDraft
            ? {
                answerText: latestDraft.answerText,
                status: latestDraft.status,
                confidenceScore: latestDraft.confidenceScore,
                mappedControlIds: latestDraft.mappedControlIds,
                supportingEvidenceIds: latestDraft.supportingEvidenceIds,
                citations
              }
            : null
        };
      })
    );
    const csv = buildQuestionnaireCsv(exportRows);

    await prisma.$transaction([
      prisma.questionnaireUpload.update({
        where: { id: upload.id },
        data: { status: 'EXPORTED' }
      }),
      prisma.trustInboxItem.update({
        where: { id: item.id },
        data: { status: 'DELIVERED' }
      })
    ]);

    await writeAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      entityType: 'trust_inbox_item',
      entityId: item.id,
      action: 'export',
      metadata: {
        questionnaireUploadId: upload.id,
        rowCount: exportRows.length,
        approvedCount
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
