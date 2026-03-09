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
          evidenceMap: {
            select: {
              id: true,
              status: true,
              reviewDueAt: true
            }
          },
          items: {
            include: {
              draftAnswers: {
                orderBy: { createdAt: 'desc' },
                take: 1
              }
            },
            orderBy: { rowOrder: 'asc' }
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

  const [timeline, suggestedDocs, packets] = await Promise.all([
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
    }),
    prisma.trustPacket.findMany({
      where: { tenantId: session.tenantId, trustInboxItemId: item.id },
      orderBy: { updatedAt: 'desc' },
      take: 20
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
              id: item.questionnaireUpload.id,
              filename: item.questionnaireUpload.filename,
              status: item.questionnaireUpload.status,
              organizationName: item.questionnaireUpload.organizationName,
              evidenceMap: item.questionnaireUpload.evidenceMap
                ? {
                    id: item.questionnaireUpload.evidenceMap.id,
                    status: item.questionnaireUpload.evidenceMap.status,
                    reviewDueAt: item.questionnaireUpload.evidenceMap.reviewDueAt?.toISOString() ?? null
                  }
                : null,
              items: item.questionnaireUpload.items.map((row) => ({
                id: row.id,
                rowKey: row.rowKey,
                questionText: row.questionText,
                draftAnswers: row.draftAnswers.map((draft) => ({
                  answerText: draft.answerText,
                  status: draft.status,
                  confidenceScore: draft.confidenceScore
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
      packets={packets.map((packet) => ({
        id: packet.id,
        name: packet.name,
        status: packet.status,
        shareMode: packet.shareMode,
        reviewerRequired: packet.reviewerRequired,
        includedArtifactCount: packet.includedArtifactIds.length,
        staleArtifactCount: packet.staleArtifactIds.length,
        evidenceMapId: packet.evidenceMapId,
        exportCount: packet.exportCount,
        lastExportedAt: packet.lastExportedAt?.toISOString() ?? null
      }))}
    />
  );
}
