import { notFound } from 'next/navigation';
import { getPageSessionContext } from '@/lib/auth/page-session';
import { prisma } from '@/lib/db/prisma';
import { listTenantReviewers } from '@/lib/trust/reviewers';
import { getPolicyCatalog } from '@/lib/policy-generator/library';
import { AIUseCaseDetailPanel } from '@/components/app/ai-use-case-detail-panel';

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

export default async function AIUseCaseDetailPage({ params }: { params: { id: string } }) {
  const session = await getPageSessionContext();
  const [useCase, reviewers, vendorReviews, policyCatalog] = await Promise.all([
    prisma.aIUseCase.findFirst({
      where: {
        tenantId: session.tenantId,
        id: params.id
      },
      include: {
        vendorReview: {
          select: {
            id: true,
            vendorName: true,
            productName: true,
            status: true,
            riskTier: true
          }
        }
      }
    }),
    listTenantReviewers(session.tenantId),
    prisma.aIVendorReview.findMany({
      where: { tenantId: session.tenantId },
      orderBy: [{ updatedAt: 'desc' }, { vendorName: 'asc' }],
      take: 80,
      select: {
        id: true,
        vendorName: true,
        productName: true
      }
    }),
    getPolicyCatalog()
  ]);

  if (!useCase) notFound();

  return (
    <AIUseCaseDetailPanel
      useCase={{
        ...useCase,
        reviewDueAt: useCase.reviewDueAt?.toISOString() ?? null,
        vendorReview: useCase.vendorReview
      }}
      reviewers={reviewers.map((reviewer) => ({
        id: reviewer.userId,
        label: reviewer.user.name ?? reviewer.user.email
      }))}
      vendorOptions={vendorReviews.map((vendor) => ({
        id: vendor.id,
        label: `${vendor.vendorName} - ${vendor.productName}`
      }))}
      policyOptions={pickAiRelevantPolicies(policyCatalog.policies).map((policy) => ({
        id: policy.id,
        label: policy.title
      }))}
    />
  );
}
