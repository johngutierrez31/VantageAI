import { notFound } from 'next/navigation';
import { getPageSessionContext } from '@/lib/auth/page-session';
import { prisma } from '@/lib/db/prisma';
import { listTenantReviewers } from '@/lib/trust/reviewers';
import { getPolicyCatalog } from '@/lib/policy-generator/library';
import { AIVendorReviewDetailPanel } from '@/components/app/ai-vendor-review-detail-panel';

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

export default async function AIVendorDetailPage({ params }: { params: { id: string } }) {
  const session = await getPageSessionContext();
  const [vendorReview, reviewers, policyCatalog] = await Promise.all([
    prisma.aIVendorReview.findFirst({
      where: {
        tenantId: session.tenantId,
        id: params.id
      },
      include: {
        useCases: {
          select: {
            id: true,
            name: true,
            status: true,
            riskTier: true
          },
          orderBy: {
            updatedAt: 'desc'
          }
        }
      }
    }),
    listTenantReviewers(session.tenantId),
    getPolicyCatalog()
  ]);

  if (!vendorReview) notFound();

  return (
    <AIVendorReviewDetailPanel
      vendorReview={{
        ...vendorReview,
        reviewDueAt: vendorReview.reviewDueAt?.toISOString() ?? null
      }}
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
