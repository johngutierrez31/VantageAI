import { notFound } from 'next/navigation';
import { getPageSessionContext } from '@/lib/auth/page-session';
import { prisma } from '@/lib/db/prisma';
import { TrustInboxDetailPanel } from '@/components/app/trust-inbox-detail-panel';

export default async function TrustInboxDetailPage({ params }: { params: { id: string } }) {
  const session = await getPageSessionContext();

  const item = await prisma.trustInboxItem.findFirst({
    where: { id: params.id, tenantId: session.tenantId },
    include: {
      questionnaireUpload: {
        include: {
          items: {
            include: {
              draftAnswers: {
                orderBy: { createdAt: 'desc' },
                take: 1
              }
            },
            orderBy: { createdAt: 'asc' }
          }
        }
      },
      attachments: {
        include: {
          evidence: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }
    }
  });

  if (!item) notFound();

  const [timeline, suggestedDocs] = await Promise.all([
    prisma.auditLog.findMany({
      where: {
        tenantId: session.tenantId,
        entityId: {
          in: [item.id, ...(item.questionnaireUploadId ? [item.questionnaireUploadId] : [])]
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 80
    }),
    prisma.trustDoc.findMany({
      where: { tenantId: session.tenantId },
      include: {
        evidence: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    })
  ]);

  return (
    <TrustInboxDetailPanel
      item={{
        id: item.id,
        title: item.title,
        requesterEmail: item.requesterEmail,
        status: item.status,
        notes: item.notes,
        questionnaireUploadId: item.questionnaireUploadId,
        attachments: item.attachments.map((attachment) => ({
          evidenceId: attachment.evidenceId,
          evidence: {
            id: attachment.evidence.id,
            name: attachment.evidence.name
          }
        })),
        questionnaireUpload: item.questionnaireUpload
          ? {
              filename: item.questionnaireUpload.filename,
              items: item.questionnaireUpload.items.map((row) => ({
                id: row.id,
                rowKey: row.rowKey,
                questionText: row.questionText,
                draftAnswers: row.draftAnswers.map((draft) => ({
                  answerText: draft.answerText
                }))
              }))
            }
          : null
      }}
      timeline={timeline.map((entry) => ({
        id: entry.id,
        action: entry.action,
        entityType: entry.entityType,
        createdAt: entry.createdAt.toISOString()
      }))}
      suggestedDocs={suggestedDocs.map((doc) => ({
        evidence: {
          id: doc.evidence.id,
          name: doc.evidence.name
        }
      }))}
    />
  );
}
