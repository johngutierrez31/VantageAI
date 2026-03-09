import { getPageSessionContext } from '@/lib/auth/page-session';
import { prisma } from '@/lib/db/prisma';
import { listTenantReviewers } from '@/lib/trust/reviewers';
import { getPolicyCatalog } from '@/lib/policy-generator/library';
import { AIVendorReviewPanel } from '@/components/app/ai-vendor-review-panel';

function pickAiRelevantPolicies(
  policies: Awaited<ReturnType<typeof getPolicyCatalog>>['policies']
) {
  const keywords = ['ai', 'data', 'privacy', 'vendor', 'third party', 'access', 'logging', 'monitoring', 'acceptable'];
  return policies
    .filter((policy) => {
      const haystack = [policy.title, policy.category, policy.type, ...policy.tags, ...policy.frameworks]
        .join(' ')
        .toLowerCase();
      return keywords.some((keyword) => haystack.includes(keyword));
    })
    .slice(0, 12);
}

export default async function AIVendorsPage() {
  const session = await getPageSessionContext();
  const [vendorReviews, reviewers, policyCatalog] = await Promise.all([
    prisma.aIVendorReview.findMany({
      where: { tenantId: session.tenantId },
      orderBy: [{ updatedAt: 'desc' }, { vendorName: 'asc' }],
      take: 200
    }),
    listTenantReviewers(session.tenantId),
    getPolicyCatalog()
  ]);

  return (
    <AIVendorReviewPanel
      vendorReviews={vendorReviews.map((review) => ({
        ...review,
        reviewDueAt: review.reviewDueAt?.toISOString() ?? null
      }))}
      reviewers={reviewers.map((reviewer) => ({
        id: reviewer.userId,
        label: reviewer.user.name ?? reviewer.user.email
      }))}
      policyOptions={pickAiRelevantPolicies(policyCatalog.policies).map((policy) => ({
        id: policy.id,
        label: policy.title
      }))}
    />
  );
}
