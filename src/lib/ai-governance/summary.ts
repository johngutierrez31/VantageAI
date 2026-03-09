import { prisma } from '@/lib/db/prisma';

export type AIGovernanceSummary = {
  capturedAt: string;
  totalUseCases: number;
  totalVendorReviews: number;
  pendingReviews: number;
  highRiskCount: number;
  rejectedCount: number;
  conditionalApprovalCount: number;
  overdueReviews: number;
  vendorPendingReviewCount: number;
  linkedOpenFindingsCount: number;
  linkedOpenRisksCount: number;
  recentDecisions: Array<{
    id: string;
    type: 'AI_USE_CASE' | 'AI_VENDOR_REVIEW';
    title: string;
    status: string;
    riskTier: string;
    updatedAt: string;
    href: string;
  }>;
};

export async function getAIGovernanceSummary(tenantId: string): Promise<AIGovernanceSummary> {
  const now = new Date();

  const [
    totalUseCases,
    totalVendorReviews,
    pendingUseCaseReviews,
    pendingVendorReviews,
    highRiskUseCases,
    highRiskVendorReviews,
    rejectedUseCases,
    rejectedVendorReviews,
    conditionalUseCases,
    conditionalVendorReviews,
    overdueUseCaseReviews,
    overdueVendorReviews,
    linkedOpenFindingsCount,
    linkedOpenRisksCount,
    recentUseCases,
    recentVendorReviews
  ] = await Promise.all([
    prisma.aIUseCase.count({ where: { tenantId } }),
    prisma.aIVendorReview.count({ where: { tenantId } }),
    prisma.aIUseCase.count({
      where: {
        tenantId,
        status: { in: ['DRAFT', 'NEEDS_REVIEW'] }
      }
    }),
    prisma.aIVendorReview.count({
      where: {
        tenantId,
        status: { in: ['DRAFT', 'NEEDS_REVIEW'] }
      }
    }),
    prisma.aIUseCase.count({
      where: {
        tenantId,
        riskTier: { in: ['HIGH', 'CRITICAL'] },
        status: { not: 'ARCHIVED' }
      }
    }),
    prisma.aIVendorReview.count({
      where: {
        tenantId,
        riskTier: { in: ['HIGH', 'CRITICAL'] },
        status: { not: 'ARCHIVED' }
      }
    }),
    prisma.aIUseCase.count({ where: { tenantId, status: 'REJECTED' } }),
    prisma.aIVendorReview.count({ where: { tenantId, status: 'REJECTED' } }),
    prisma.aIUseCase.count({ where: { tenantId, status: 'APPROVED_WITH_CONDITIONS' } }),
    prisma.aIVendorReview.count({ where: { tenantId, status: 'APPROVED_WITH_CONDITIONS' } }),
    prisma.aIUseCase.count({
      where: {
        tenantId,
        status: { in: ['DRAFT', 'NEEDS_REVIEW'] },
        reviewDueAt: { lt: now }
      }
    }),
    prisma.aIVendorReview.count({
      where: {
        tenantId,
        status: { in: ['DRAFT', 'NEEDS_REVIEW'] },
        reviewDueAt: { lt: now }
      }
    }),
    prisma.finding.count({
      where: {
        tenantId,
        status: { in: ['OPEN', 'IN_PROGRESS'] },
        sourceType: { in: ['AI_GOVERNANCE_HIGH_RISK', 'AI_GOVERNANCE_REJECTION', 'AI_VENDOR_REVIEW'] }
      }
    }),
    prisma.riskRegisterItem.count({
      where: {
        tenantId,
        sourceModule: 'AI_GOVERNANCE',
        status: { in: ['OPEN', 'IN_REVIEW', 'MITIGATING', 'ACCEPTED'] }
      }
    }),
    prisma.aIUseCase.findMany({
      where: {
        tenantId,
        status: { in: ['APPROVED', 'APPROVED_WITH_CONDITIONS', 'REJECTED'] }
      },
      orderBy: { updatedAt: 'desc' },
      take: 4,
      select: {
        id: true,
        name: true,
        status: true,
        riskTier: true,
        updatedAt: true
      }
    }),
    prisma.aIVendorReview.findMany({
      where: {
        tenantId,
        status: { in: ['APPROVED', 'APPROVED_WITH_CONDITIONS', 'REJECTED'] }
      },
      orderBy: { updatedAt: 'desc' },
      take: 4,
      select: {
        id: true,
        vendorName: true,
        productName: true,
        status: true,
        riskTier: true,
        updatedAt: true
      }
    })
  ]);

  const recentDecisions = [
    ...recentUseCases.map((useCase) => ({
      id: useCase.id,
      type: 'AI_USE_CASE' as const,
      title: useCase.name,
      status: useCase.status,
      riskTier: useCase.riskTier,
      updatedAt: useCase.updatedAt.toISOString(),
      href: `/app/ai-governance/use-cases/${useCase.id}`
    })),
    ...recentVendorReviews.map((vendor) => ({
      id: vendor.id,
      type: 'AI_VENDOR_REVIEW' as const,
      title: `${vendor.vendorName} - ${vendor.productName}`,
      status: vendor.status,
      riskTier: vendor.riskTier,
      updatedAt: vendor.updatedAt.toISOString(),
      href: `/app/ai-governance/vendors/${vendor.id}`
    }))
  ]
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .slice(0, 6);

  return {
    capturedAt: now.toISOString(),
    totalUseCases,
    totalVendorReviews,
    pendingReviews: pendingUseCaseReviews + pendingVendorReviews,
    highRiskCount: highRiskUseCases + highRiskVendorReviews,
    rejectedCount: rejectedUseCases + rejectedVendorReviews,
    conditionalApprovalCount: conditionalUseCases + conditionalVendorReviews,
    overdueReviews: overdueUseCaseReviews + overdueVendorReviews,
    vendorPendingReviewCount: pendingVendorReviews,
    linkedOpenFindingsCount,
    linkedOpenRisksCount,
    recentDecisions
  };
}
