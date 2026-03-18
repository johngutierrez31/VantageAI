import { PageHeader } from '@/components/app/page-header';
import { EmptyState } from '@/components/app/empty-state';
import { PulseDashboardPanel } from '@/components/app/pulse-dashboard-panel';
import { getPageSessionContext } from '@/lib/auth/page-session';
import { getTenantSecurityPulse } from '@/lib/intel/pulse';
import { prisma } from '@/lib/db/prisma';
import { getTenantWorkspaceContext } from '@/lib/workspace-mode';

export default async function PulsePage() {
  const session = await getPageSessionContext();
  const [workspace, metrics, snapshots, roadmaps, boardBriefs, quarterlyReviews, risks] = await Promise.all([
    getTenantWorkspaceContext(session.tenantId),
    getTenantSecurityPulse(session.tenantId),
    prisma.pulseSnapshot.findMany({
      where: { tenantId: session.tenantId },
      orderBy: { snapshotDate: 'desc' },
      take: 12,
      select: {
        id: true,
        reportingPeriod: true,
        periodType: true,
        status: true,
        overallScore: true,
        overallDelta: true,
        snapshotDate: true
      }
    }),
    prisma.pulseRoadmap.findMany({
      where: { tenantId: session.tenantId },
      include: {
        items: {
          orderBy: [{ horizon: 'asc' }, { dueAt: 'asc' }]
        }
      },
      orderBy: { updatedAt: 'desc' },
      take: 6
    }),
    prisma.boardBrief.findMany({
      where: { tenantId: session.tenantId },
      orderBy: { updatedAt: 'desc' },
      take: 6,
      select: {
        id: true,
        title: true,
        status: true,
        reportingPeriod: true,
        updatedAt: true
      }
    }),
    prisma.quarterlyReview.findMany({
      where: { tenantId: session.tenantId },
      orderBy: { reviewDate: 'desc' },
      take: 6,
      select: {
        id: true,
        reviewPeriod: true,
        status: true,
        reviewDate: true
      }
    }),
    prisma.riskRegisterItem.findMany({
      where: {
        tenantId: session.tenantId,
        status: { in: ['OPEN', 'IN_REVIEW', 'MITIGATING', 'ACCEPTED'] }
      },
      orderBy: [{ severity: 'desc' }, { targetDueAt: 'asc' }, { updatedAt: 'desc' }],
      take: 8,
      select: {
        id: true,
        title: true,
        severity: true,
        status: true,
        sourceModule: true,
        ownerUserId: true,
        targetDueAt: true
      }
    })
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pulse"
        helpKey="pulse"
        description="Pulse is the executive risk and reporting layer: turn live trust, finding, AI, and incident signals into a scorecard, risk register, roadmap, board brief, and quarterly review."
        primaryAction={{ label: 'Open Command Center', href: '/app/command-center' }}
        secondaryActions={[
          { label: 'Adoption Mode', href: '/app/adoption', variant: 'outline' },
          { label: 'Risk Register', href: '/app/pulse/risks', variant: 'outline' },
          { label: 'Roadmap', href: '/app/pulse/roadmap', variant: 'outline' },
          { label: 'AI Governance', href: '/app/ai-governance', variant: 'outline' },
          { label: 'TrustOps', href: '/app/trust', variant: 'outline' }
        ]}
      >
        <p className="text-xs text-muted-foreground">
          Start here: generate the scorecard first, then sync risks, build the roadmap, draft the board brief, and finalize the quarterly review.
        </p>
      </PageHeader>

      {workspace.isTrial &&
      snapshots.length === 0 &&
      roadmaps.length === 0 &&
      boardBriefs.length === 0 &&
      quarterlyReviews.length === 0 &&
      risks.length === 0 ? (
        <EmptyState
          title="Generate your first Pulse snapshot"
          description="Pulse is where the suite becomes an executive operating cadence. Start with the scorecard, then let risks, roadmap items, and board-ready reporting accumulate from real workspace signals."
          actionLabel="Open Guided Pulse Workflows"
          actionHref="/app/pulse#guided-pulse-workflows"
          eyebrow="Pulse"
          supportingPoints={[
            'What it is for: executive posture, risks, roadmap, and board reporting.',
            'First action: generate the scorecard from current tenant signals.',
            'Output: a persisted snapshot that can drive risks, roadmap, and quarterly review.'
          ]}
        />
      ) : null}

      <PulseDashboardPanel
        metrics={{
          currentPostureScore: metrics.currentPostureScore,
          postureDelta: metrics.postureDelta,
          openTopRisks: metrics.openTopRisks,
          overdueRoadmapItems: metrics.overdueRoadmapItems,
          overdueTasks: metrics.overdueTasks,
          openTrustFindings: metrics.openTrustFindings,
          trustOverdueReviews: metrics.trustOverdueReviews,
          openAiReviews: metrics.openAiReviews,
          highRiskAiUseCases: metrics.highRiskAiUseCases,
          conditionalAiApprovalsPending: metrics.conditionalAiApprovalsPending,
          aiVendorsPendingReview: metrics.aiVendorsPendingReview,
          activeIncidents: metrics.activeIncidents,
          overdueIncidentActions: metrics.overdueIncidentActions,
          openPostIncidentActions: metrics.openPostIncidentActions,
          upcomingTabletops: metrics.upcomingTabletops,
          recentAfterActionReports: metrics.recentAfterActionReports
        }}
        snapshots={snapshots.map((snapshot) => ({
          ...snapshot,
          snapshotDate: snapshot.snapshotDate.toISOString()
        }))}
        roadmaps={roadmaps.map((roadmap) => ({
          ...roadmap,
          items: roadmap.items.map((item) => ({
            ...item,
            dueAt: item.dueAt?.toISOString() ?? null
          }))
        }))}
        boardBriefs={boardBriefs.map((brief) => ({
          ...brief,
          updatedAt: brief.updatedAt.toISOString()
        }))}
        quarterlyReviews={quarterlyReviews.map((review) => ({
          ...review,
          reviewDate: review.reviewDate.toISOString()
        }))}
        risks={risks.map((risk) => ({
          ...risk,
          targetDueAt: risk.targetDueAt?.toISOString() ?? null
        }))}
      />
    </div>
  );
}

