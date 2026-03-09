import { getPageSessionContext } from '@/lib/auth/page-session';
import { prisma } from '@/lib/db/prisma';
import { getAIGovernanceSummary } from '@/lib/ai-governance/summary';
import { AIGovernanceDashboardPanel } from '@/components/app/ai-governance-dashboard-panel';

export default async function AIGovernancePage() {
  const session = await getPageSessionContext();
  const [summary, topRisks] = await Promise.all([
    getAIGovernanceSummary(session.tenantId),
    prisma.riskRegisterItem.findMany({
      where: {
        tenantId: session.tenantId,
        sourceModule: 'AI_GOVERNANCE',
        status: { in: ['OPEN', 'IN_REVIEW', 'MITIGATING', 'ACCEPTED'] }
      },
      orderBy: [{ severity: 'desc' }, { targetDueAt: 'asc' }, { updatedAt: 'desc' }],
      take: 5,
      select: {
        id: true,
        title: true,
        severity: true,
        status: true,
        targetDueAt: true
      }
    })
  ]);

  return (
    <AIGovernanceDashboardPanel
      metrics={{
        totalUseCases: summary.totalUseCases,
        totalVendorReviews: summary.totalVendorReviews,
        pendingReviews: summary.pendingReviews,
        highRiskCount: summary.highRiskCount,
        rejectedCount: summary.rejectedCount,
        conditionalApprovalCount: summary.conditionalApprovalCount,
        overdueReviews: summary.overdueReviews,
        vendorPendingReviewCount: summary.vendorPendingReviewCount,
        linkedOpenFindingsCount: summary.linkedOpenFindingsCount,
        linkedOpenRisksCount: summary.linkedOpenRisksCount
      }}
      recentDecisions={summary.recentDecisions}
      topRisks={topRisks.map((risk) => ({
        ...risk,
        targetDueAt: risk.targetDueAt?.toISOString() ?? null
      }))}
    />
  );
}
