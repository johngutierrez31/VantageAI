import { getPageSessionContext } from '@/lib/auth/page-session';
import { prisma } from '@/lib/db/prisma';
import { getAIGovernanceSummary } from '@/lib/ai-governance/summary';
import { AIGovernanceDashboardPanel } from '@/components/app/ai-governance-dashboard-panel';
import { EmptyState } from '@/components/app/empty-state';
import { getTenantWorkspaceContext } from '@/lib/workspace-mode';

export default async function AIGovernancePage() {
  const session = await getPageSessionContext();
  const [workspace, summary, topRisks] = await Promise.all([
    getTenantWorkspaceContext(session.tenantId),
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
    <div className="space-y-6">
      {workspace.isTrial && summary.totalUseCases === 0 && summary.totalVendorReviews === 0 && topRisks.length === 0 ? (
        <EmptyState
          title="Register your first AI workflow"
          description="AI Governance is for approved, reviewable AI adoption. Start with one real use case or vendor intake so policy fit, conditions, and downstream risks stay explicit from day one."
          actionLabel="Open Guided AI Workflows"
          actionHref="/app/ai-governance#guided-ai-governance-workflows"
          eyebrow="AI Governance"
          supportingPoints={[
            'What it is for: governed AI adoption and vendor review.',
            'First action: register one AI use case or vendor intake.',
            'Output: a durable approval record with policy mapping and risk carry-over.'
          ]}
        />
      ) : null}

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
    </div>
  );
}
