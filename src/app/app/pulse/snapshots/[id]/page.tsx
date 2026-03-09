import { getPageSessionContext } from '@/lib/auth/page-session';
import { prisma } from '@/lib/db/prisma';
import { PulseSnapshotDetailPanel } from '@/components/app/pulse-snapshot-detail-panel';

export default async function PulseSnapshotDetailPage({ params }: { params: { id: string } }) {
  const session = await getPageSessionContext();
  const snapshot = await prisma.pulseSnapshot.findFirstOrThrow({
    where: {
      tenantId: session.tenantId,
      id: params.id
    },
    include: {
      categoryScores: {
        orderBy: { categoryKey: 'asc' }
      },
      roadmaps: {
        select: { id: true, name: true, status: true },
        orderBy: { updatedAt: 'desc' }
      },
      boardBriefs: {
        select: { id: true, title: true, status: true },
        orderBy: { updatedAt: 'desc' }
      },
      quarterlyReviews: {
        select: { id: true, reviewPeriod: true, status: true },
        orderBy: { reviewDate: 'desc' }
      }
    }
  });

  return (
    <PulseSnapshotDetailPanel
      snapshot={{
        ...snapshot,
        measuredInputsJson: snapshot.measuredInputsJson as Record<string, unknown>
      }}
    />
  );
}
