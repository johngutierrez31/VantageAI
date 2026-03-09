import { getSessionContext } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { buildApprovedQuestionnaireExportRows, buildQuestionnaireCsv } from '@/lib/questionnaire/export';
import { handleRouteError, notFound, badRequest } from '@/lib/http';
import { writeAuditLog } from '@/lib/audit';

function toCsvFileName(filename: string) {
  const base = filename.replace(/\.[a-z0-9]+$/i, '');
  return `${base || 'questionnaire'}-completed.csv`;
}

export async function POST(_: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionContext();

    const upload = await prisma.questionnaireUpload.findFirst({
      where: { id: params.id, tenantId: session.tenantId },
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

    if (!upload) return notFound('Questionnaire upload not found');
    const approvedCount = upload.items.filter((item) => item.draftAnswers[0]).length;
    if (!approvedCount) {
      return badRequest('No approved questionnaire answers are available to export');
    }

    const exportRows = buildApprovedQuestionnaireExportRows(
      upload.items.map((item) => {
        const latestMapping = item.mappings[0];
        const latestDraft = item.draftAnswers[0];
        const citations = Array.isArray(latestDraft?.citationsJson)
          ? (latestDraft.citationsJson as Array<{ evidenceName?: string; chunkIndex?: number }>)
          : [];

        return {
          rowKey: item.rowKey,
          questionText: item.questionText,
          normalizedQuestion: item.normalizedQuestion,
          mappedPrompt: latestMapping?.templateQuestion?.prompt ?? null,
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

    await prisma.questionnaireUpload.update({
      where: { id: upload.id },
      data: {
        status: 'EXPORTED'
      }
    });

    await writeAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      entityType: 'questionnaire_upload',
      entityId: upload.id,
      action: 'export',
      metadata: {
        itemCount: exportRows.length,
        approvedCount
      }
    });

    const fileName = toCsvFileName(upload.filename);
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileName}"`
      }
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
