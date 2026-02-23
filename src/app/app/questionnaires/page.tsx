import { getPageSessionContext } from '@/lib/auth/page-session';
import { prisma } from '@/lib/db/prisma';
import { QuestionnaireUploadsPanel } from '@/components/app/questionnaire-uploads-panel';

export default async function QuestionnairesPage() {
  const session = await getPageSessionContext();
  const uploads = await prisma.questionnaireUpload.findMany({
    where: { tenantId: session.tenantId },
    include: {
      _count: {
        select: { items: true }
      },
      trustInboxItem: {
        select: {
          id: true,
          title: true,
          status: true
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 100
  });

  return (
    <QuestionnaireUploadsPanel
      uploads={uploads.map((upload) => ({
        id: upload.id,
        filename: upload.filename,
        originalFormat: upload.originalFormat,
        createdAt: upload.createdAt.toISOString(),
        itemCount: upload._count.items,
        trustInboxItem: upload.trustInboxItem
          ? {
              id: upload.trustInboxItem.id,
              title: upload.trustInboxItem.title,
              status: upload.trustInboxItem.status
            }
          : null
      }))}
    />
  );
}
