import { getPageSessionContext } from '@/lib/auth/page-session';
import { listRoadmaps } from '@/lib/pulse/roadmap';
import { listTenantReviewers } from '@/lib/trust/reviewers';
import { PulseRoadmapPanel } from '@/components/app/pulse-roadmap-panel';

export default async function PulseRoadmapPage({
  searchParams
}: {
  searchParams?: { roadmapId?: string };
}) {
  const session = await getPageSessionContext();
  const [roadmaps, reviewers] = await Promise.all([
    listRoadmaps(session.tenantId),
    listTenantReviewers(session.tenantId)
  ]);

  return (
    <PulseRoadmapPanel
      activeRoadmapId={searchParams?.roadmapId ?? null}
      roadmaps={roadmaps.map((roadmap) => ({
        ...roadmap,
        reviewerNotes: roadmap.reviewerNotes ?? null,
        items: roadmap.items.map((item) => ({
          ...item,
          dueAt: item.dueAt?.toISOString() ?? null
        }))
      }))}
      reviewers={reviewers.map((reviewer) => ({
        id: reviewer.userId,
        label: reviewer.user.name ?? reviewer.user.email
      }))}
    />
  );
}
