import { getSessionContext } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { buildQuestionnaireCsv } from '@/lib/questionnaire/export';
import { handleRouteError, notFound } from '@/lib/http';
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
              orderBy: { createdAt: 'desc' },
              take: 1
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!upload) return notFound('Questionnaire upload not found');

    const csv = buildQuestionnaireCsv(
      upload.items.map((item) => {
        const latestMapping = item.mappings[0];
        const latestDraft = item.draftAnswers[0];
        const citations = Array.isArray(latestDraft?.citationsJson)
          ? (latestDraft.citationsJson as Array<{ evidenceName?: string; chunkIndex?: number }>)
          : [];

        return {
          rowKey: item.rowKey,
          questionText: item.questionText,
          mappedPrompt: latestMapping?.templateQuestion?.prompt ?? null,
          answerText: latestDraft?.answerText ?? null,
          citations
        };
      })
    );

    await writeAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      entityType: 'questionnaire_upload',
      entityId: upload.id,
      action: 'export',
      metadata: {
        itemCount: upload.items.length
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
