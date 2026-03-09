import { getPageSessionContext } from '@/lib/auth/page-session';
import { prisma } from '@/lib/db/prisma';
import { TrustPacketPanel } from '@/components/app/trust-packet-panel';

export default async function TrustPacketPage() {
  const session = await getPageSessionContext();
  const [docs, inbox, evidenceOptions, packets, evidenceMaps] = await Promise.all([
    prisma.trustDoc.findMany({
      where: { tenantId: session.tenantId },
      include: {
        evidence: {
          select: {
            id: true,
            name: true,
            mimeType: true,
            createdAt: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    }),
    prisma.trustInboxItem.findMany({
      where: { tenantId: session.tenantId },
      select: {
        id: true,
        title: true,
        status: true,
        updatedAt: true
      },
      orderBy: { updatedAt: 'desc' },
      take: 20
    }),
    prisma.evidence.findMany({
      where: { tenantId: session.tenantId },
      select: { id: true, name: true },
      orderBy: { createdAt: 'desc' },
      take: 200
    }),
    prisma.trustPacket.findMany({
      where: { tenantId: session.tenantId },
      orderBy: { updatedAt: 'desc' },
      take: 25
    }),
    prisma.evidenceMap.findMany({
      where: { tenantId: session.tenantId },
      include: {
        questionnaireUpload: {
          select: {
            id: true,
            filename: true,
            organizationName: true
          }
        },
        _count: {
          select: {
            items: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' },
      take: 25
    })
  ]);

  return (
    <TrustPacketPanel
      docs={docs.map((doc) => ({
        id: doc.id,
        category: doc.category,
        createdAt: doc.createdAt.toISOString(),
        evidence: {
          id: doc.evidence.id,
          name: doc.evidence.name,
          mimeType: doc.evidence.mimeType,
          createdAt: doc.evidence.createdAt.toISOString()
        }
      }))}
      inbox={inbox.map((item) => ({
        id: item.id,
        title: item.title,
        status: item.status,
        updatedAt: item.updatedAt.toISOString()
      }))}
      evidenceOptions={evidenceOptions}
      evidenceMaps={evidenceMaps.map((map) => ({
        id: map.id,
        name: map.name,
        status: map.status,
        itemCount: map._count.items,
        questionnaireLabel: map.questionnaireUpload.organizationName ?? map.questionnaireUpload.filename
      }))}
      packets={packets.map((packet) => ({
        id: packet.id,
        name: packet.name,
        status: packet.status,
        shareMode: packet.shareMode,
        reviewerRequired: packet.reviewerRequired,
        includedArtifactCount: packet.includedArtifactIds.length,
        staleArtifactCount: packet.staleArtifactIds.length,
        createdAt: packet.createdAt.toISOString(),
        evidenceMapId: packet.evidenceMapId,
        exportCount: packet.exportCount
      }))}
    />
  );
}
