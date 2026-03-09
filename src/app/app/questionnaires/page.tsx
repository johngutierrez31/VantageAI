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
      evidenceMap: {
        select: {
          id: true,
          status: true
        }
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
        organizationName: upload.organizationName,
        filename: upload.filename,
        originalFormat: upload.originalFormat,
        status: upload.status,
        assignedReviewerUserId: upload.assignedReviewerUserId,
        reviewDueAt: upload.reviewDueAt?.toISOString() ?? null,
        createdAt: upload.createdAt.toISOString(),
        itemCount: upload._count.items,
        evidenceMap: upload.evidenceMap
          ? {
              id: upload.evidenceMap.id,
              status: upload.evidenceMap.status
            }
          : null,
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
