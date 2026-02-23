import { notFound } from 'next/navigation';
import { getPageSessionContext } from '@/lib/auth/page-session';
import { prisma } from '@/lib/db/prisma';
import { QuestionnaireDetailPanel } from '@/components/app/questionnaire-detail-panel';

export default async function QuestionnaireDetailPage({ params }: { params: { id: string } }) {
  const session = await getPageSessionContext();
  const [upload, templates] = await Promise.all([
    prisma.questionnaireUpload.findFirst({
      where: { id: params.id, tenantId: session.tenantId },
      include: {
        items: {
          include: {
            mappings: {
              include: {
                templateQuestion: {
                  select: {
                    id: true,
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
    }),
    prisma.template.findMany({
      where: { tenantId: session.tenantId },
      select: { id: true, name: true },
      orderBy: { updatedAt: 'desc' }
    })
  ]);

  if (!upload) notFound();

  return (
    <QuestionnaireDetailPanel
      questionnaireId={upload.id}
      filename={upload.filename}
      templates={templates}
      items={upload.items.map((item) => ({
        id: item.id,
        rowKey: item.rowKey,
        questionText: item.questionText,
        mappings: item.mappings.map((mapping) => ({
          confidence: mapping.confidence,
          status: mapping.status,
          templateQuestion: mapping.templateQuestion
            ? {
                id: mapping.templateQuestion.id,
                prompt: mapping.templateQuestion.prompt
              }
            : null
        })),
        draftAnswers: item.draftAnswers.map((draft) => ({
          answerText: draft.answerText,
          model: draft.model
        }))
      }))}
    />
  );
}
