import { getPageSessionContext } from '@/lib/auth/page-session';
import { listTenantReviewers } from '@/lib/trust/reviewers';
import { listAIGovernanceReviewItems } from '@/lib/ai-governance/records';
import { AIReviewQueuePanel } from '@/components/app/ai-review-queue-panel';

export default async function AIGovernanceReviewQueuePage() {
  const session = await getPageSessionContext();
  const [items, reviewers] = await Promise.all([
    listAIGovernanceReviewItems(session.tenantId),
    listTenantReviewers(session.tenantId)
  ]);

  const reviewerLabels = new Map(
    reviewers.map((reviewer) => [reviewer.userId, reviewer.user.name ?? reviewer.user.email])
  );

  return (
    <AIReviewQueuePanel
      items={items.map((item) => ({
        ...item,
        ownerLabel: item.type === 'AI_USE_CASE' ? item.ownerRef : item.ownerRef ? reviewerLabels.get(item.ownerRef) ?? item.ownerRef : null,
        assignedReviewerLabel: item.assignedReviewerUserId ? reviewerLabels.get(item.assignedReviewerUserId) ?? null : null
      }))}
      reviewers={reviewers.map((reviewer) => ({
        id: reviewer.userId,
        label: reviewer.user.name ?? reviewer.user.email
      }))}
    />
  );
}
