import { getPageSessionContext } from '@/lib/auth/page-session';
import { prisma } from '@/lib/db/prisma';
import { TrustInboxPanel } from '@/components/app/trust-inbox-panel';

export default async function TrustInboxPage() {
  const session = await getPageSessionContext();
  const [items, uploads] = await Promise.all([
    prisma.trustInboxItem.findMany({
      where: { tenantId: session.tenantId },
      include: {
        questionnaireUpload: {
          select: {
            id: true,
            filename: true
          }
        },
        _count: {
          select: {
            attachments: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' },
      take: 200
    }),
    prisma.questionnaireUpload.findMany({
      where: { tenantId: session.tenantId },
      select: {
        id: true,
        filename: true
      },
      orderBy: { createdAt: 'desc' },
      take: 200
    })
  ]);

  return (
    <TrustInboxPanel
      items={items.map((item) => ({
        id: item.id,
        title: item.title,
        requesterEmail: item.requesterEmail,
        status: item.status,
        questionnaireUploadId: item.questionnaireUploadId,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
        _count: item._count,
        questionnaireUpload: item.questionnaireUpload
          ? {
              id: item.questionnaireUpload.id,
              filename: item.questionnaireUpload.filename
            }
          : null
      }))}
      uploads={uploads}
    />
  );
}
