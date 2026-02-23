import { getPageSessionContext } from '@/lib/auth/page-session';
import { prisma } from '@/lib/db/prisma';
import { TrustPacketPanel } from '@/components/app/trust-packet-panel';

export default async function TrustPacketPage() {
  const session = await getPageSessionContext();
  const [docs, inbox, evidenceOptions] = await Promise.all([
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
    />
  );
}
