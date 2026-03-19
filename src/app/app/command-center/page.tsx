import Link from 'next/link';
import { AlertTriangle, ArrowRight, CalendarClock, Shield, Sparkles, TrendingUp } from 'lucide-react';
import { PageHeader } from '@/components/app/page-header';
import { KpiCard } from '@/components/app/kpi-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CommandCenterOperations } from '@/components/app/command-center-operations';
import { DemoPathCard } from '@/components/app/demo-path-card';
import { TrialOnboardingCard } from '@/components/app/trial-onboarding-card';
import { getTenantAdoptionModeViewModel } from '@/lib/adoption/adoption-mode';
import { getPageSessionContext } from '@/lib/auth/page-session';
import { getTenantDemoPathViewModel } from '@/lib/demo/demo-path';
import { buildSevenDayMissionQueue, getTenantSecurityPulse } from '@/lib/intel/pulse';
import { getSoloCisoCapabilities, getTrendSignals, type TrendSeverity } from '@/lib/intel/trends';
import { workflowRoutes } from '@/lib/product/workflow-routes';
import { getTenantTrialOnboarding } from '@/lib/trial/onboarding';
import { getTenantWorkspaceContext } from '@/lib/workspace-mode';

function severityClasses(severity: TrendSeverity) {
  if (severity === 'critical') {
    return 'border-danger/40 bg-danger/10 text-danger';
  }

  if (severity === 'high') {
    return 'border-warning/50 bg-warning/10 text-warning';
  }

  return 'border-border bg-muted/20 text-muted-foreground';
}

export default async function CommandCenterPage() {
  const session = await getPageSessionContext();
  const [pulse, trends, demoPath, adoptionMode, workspace, trialOnboarding] = await Promise.all([
    getTenantSecurityPulse(session.tenantId),
    Promise.resolve(getTrendSignals()),
    getTenantDemoPathViewModel(session.tenantId),
    getTenantAdoptionModeViewModel(session.tenantId),
    getTenantWorkspaceContext(session.tenantId),
    getTenantTrialOnboarding(session.tenantId)
  ]);

  const capabilities = getSoloCisoCapabilities();
  const missionQueue = buildSevenDayMissionQueue(pulse, trends);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Command Center"
        helpKey={workspace.isTrial ? undefined : 'commandCenter'}
        description={
          workspace.isTrial
            ? 'Start the workspace with real operator records: buyer diligence, posture, AI review, incident response, and evidence work that stays durable and tenant-scoped.'
            : 'See the whole operating picture in one screen: buyer pressure, top risks, governed AI decisions, executive carry-over, and the next action that matters.'
        }
        primaryAction={{
          label: workspace.isTrial ? 'Open Questionnaires' : 'Open TrustOps Intake',
          href: workspace.isTrial ? workflowRoutes.questionnairesIntake() : '/app/trust/inbox'
        }}
        secondaryActions={[
          { label: workspace.isTrial ? 'Tools Hub' : 'Show The Story', href: '/app/tools', variant: 'outline' },
          { label: 'Pulse', href: workflowRoutes.pulseScorecard(), variant: 'outline' },
          { label: 'AI Governance', href: workflowRoutes.aiUseCaseCreate(), variant: 'outline' },
          { label: 'Response Ops', href: workflowRoutes.responseIncidentTriage(), variant: 'outline' }
        ]}
      >
        <p className="text-xs text-muted-foreground">
          Workspace: {session.tenantName}
          {workspace.isTrial && workspace.trialEndsAt ? ` | Trial ends ${workspace.trialEndsAt.toLocaleDateString()}` : ''}
          {!workspace.isTrial ? ` | Pulse captured at ${new Date(pulse.capturedAt).toLocaleString()}` : ''}
        </p>
        <p className="text-xs text-muted-foreground">
          {workspace.isTrial
            ? 'Start with the first checklist item that matches the pressure you have today. Each action creates a real record inside this blank workspace.'
            : 'Start with the current buyer request, then open Pulse for the executive summary and AI Governance for the escalated review.'}
        </p>
      </PageHeader>

      {workspace.isDemo ? (
        <Card className="border-primary/30 bg-gradient-to-r from-card via-card to-muted/20">
          <CardContent className="grid gap-4 p-5 md:grid-cols-[1.1fr_0.9fr]">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded border border-warning/40 bg-warning/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-warning">
                  Demo Workspace
                </span>
                <span className="rounded border border-border bg-background px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Sample Tenant
                </span>
              </div>
              <p className="mt-3 text-lg font-semibold">One coherent story, ready for prospects and partners</p>
              <p className="mt-2 text-sm text-muted-foreground">
                A buyer request from Northbridge Payments exposed one trust-language gap, one AI approval condition, and one live vendor-linked incident. The rest of the suite shows how those issues are reviewed, assigned, and reported upward.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {[
                'Buyer request and trust packet are review-gated and citation-backed.',
                'Executive scorecard and board brief reflect live module carry-over.',
                'AI use case and incident follow-up stay owned across the suite.'
              ].map((item) => (
                <div key={item} className="rounded-md border border-border bg-background/60 p-3 text-sm text-muted-foreground">
                  {item}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {workspace.isTrial ? (
        <TrialOnboardingCard
          trialDaysRemaining={workspace.trialDaysRemaining}
          trialEndsAt={workspace.trialEndsAt?.toISOString() ?? null}
          completedCount={trialOnboarding.completedCount}
          totalCount={trialOnboarding.totalCount}
          items={trialOnboarding.items}
        />
      ) : null}

      <div className="grid gap-4 lg:grid-cols-4">
        <KpiCard
          label="Open Remediation Tasks"
          value={String(pulse.openTasks)}
          hint={`${pulse.criticalTasks} critical | ${pulse.overdueTasks} overdue`}
          icon={<AlertTriangle className="h-5 w-5" />}
        />
        <KpiCard
          label="In-Progress Assessments"
          value={String(pulse.assessmentsInProgress)}
          hint="Convert active assessments into execution-ready tasks"
          icon={<Shield className="h-5 w-5" />}
        />
        <KpiCard
          label="Trust / Evidence Backlog"
          value={String(pulse.pendingEvidenceRequests + pulse.trustInboxBacklog)}
          hint={`${pulse.pendingEvidenceRequests} evidence requests | ${pulse.trustInboxBacklog} trust inbox items`}
          icon={<CalendarClock className="h-5 w-5" />}
        />
        <KpiCard
          label="External Pressure Signals"
          value={String(trends.length)}
          hint="Tracked high-confidence 2025-2026 trend signals"
          icon={<TrendingUp className="h-5 w-5" />}
        />
      </div>

      {workspace.isDemo ? <DemoPathCard demoPath={demoPath} /> : null}

      {!workspace.isTrial ? (
        <Card>
          <CardHeader>
            <CardTitle>Work With Your Existing Stack</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <KpiCard
              label="Configured Connectors"
              value={String(adoptionMode.metrics.connectorCount)}
              hint="Slack, Jira, publishing, and downstream hooks already configured"
              icon={<Shield className="h-5 w-5" />}
            />
            <KpiCard
              label="Imported Records"
              value={String(adoptionMode.metrics.importCount)}
              hint="Durable adoption imports already recorded"
              icon={<TrendingUp className="h-5 w-5" />}
            />
            <KpiCard
              label="Reusable Trust Answers"
              value={String(adoptionMode.metrics.approvedAnswerCount)}
              hint="Bring approved answers forward before the next questionnaire lands"
              icon={<CalendarClock className="h-5 w-5" />}
            />
            <KpiCard
              label="Open Risks"
              value={String(adoptionMode.metrics.openRiskCount)}
              hint="Imported or generated risk carry-over already visible in Pulse"
              icon={<AlertTriangle className="h-5 w-5" />}
            />
            <div className="flex items-center">
              <Button asChild size="sm" variant="outline">
                <Link href="/app/adoption">Open Adoption Mode</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Pulse Executive Layer</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <KpiCard
            label="Current Posture Score"
            value={pulse.currentPostureScore === null ? 'N/A' : pulse.currentPostureScore.toFixed(1)}
            hint={
              pulse.postureDelta === null
                ? 'Generate the first Pulse snapshot'
                : `${pulse.postureDelta >= 0 ? '+' : ''}${pulse.postureDelta.toFixed(1)} vs prior snapshot`
            }
            icon={<TrendingUp className="h-5 w-5" />}
          />
          <KpiCard
            label="Open Top Risks"
            value={String(pulse.openTopRisks)}
            hint="High and critical risk-register items"
            icon={<AlertTriangle className="h-5 w-5" />}
          />
          <KpiCard
            label="Overdue Roadmap Items"
            value={String(pulse.overdueRoadmapItems)}
            hint="30/60/90 plan items past target date"
            icon={<CalendarClock className="h-5 w-5" />}
          />
          <KpiCard
            label="Open Trust Carry-Over"
            value={String(pulse.openTrustFindings)}
            hint="TrustOps gaps still affecting posture"
            icon={<Shield className="h-5 w-5" />}
          />
          <KpiCard
            label="Executive Workflow"
            value={pulse.latestBoardBriefId ? 'Live' : 'Ready'}
            hint="Open Pulse to manage scorecards, risks, roadmap, and board reporting"
            icon={<TrendingUp className="h-5 w-5" />}
          />
          <div className="flex flex-wrap gap-2 md:col-span-2 xl:col-span-5">
            <Button asChild size="sm" variant="outline">
              <Link href={pulse.latestPulseSnapshotId ? `/app/pulse/snapshots/${pulse.latestPulseSnapshotId}` : workflowRoutes.pulseScorecard()}>
                Pulse Snapshot
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/app/pulse/risks">Risk Register</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href={pulse.latestRoadmapId ? workflowRoutes.pulseRoadmapRecord(pulse.latestRoadmapId) : workflowRoutes.pulseRoadmap()}>
                Roadmap
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href={pulse.latestBoardBriefId ? `/app/pulse/board-briefs/${pulse.latestBoardBriefId}` : workflowRoutes.pulseBoardBrief()}>
                Board Brief
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link
                href={
                  pulse.latestQuarterlyReviewId
                    ? `/app/pulse/quarterly-reviews/${pulse.latestQuarterlyReviewId}`
                    : workflowRoutes.pulseQuarterlyReview()
                }
              >
                Quarterly Review
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI Governance Carry-Over</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <KpiCard
            label="Open AI Reviews"
            value={String(pulse.openAiReviews)}
            hint="Use case and vendor approvals still in queue"
            icon={<CalendarClock className="h-5 w-5" />}
          />
          <KpiCard
            label="High-Risk AI Items"
            value={String(pulse.highRiskAiUseCases)}
            hint="High and critical AI workflows or vendor reviews"
            icon={<AlertTriangle className="h-5 w-5" />}
          />
          <KpiCard
            label="Rejected AI Items"
            value={String(pulse.rejectedAiUseCases)}
            hint="AI workflows or vendor reviews blocked from approval"
            icon={<Shield className="h-5 w-5" />}
          />
          <KpiCard
            label="Conditional Approvals"
            value={String(pulse.conditionalAiApprovalsPending)}
            hint="AI approvals with follow-up conditions still pending"
            icon={<TrendingUp className="h-5 w-5" />}
          />
          <KpiCard
            label="Vendor Reviews Pending"
            value={String(pulse.aiVendorsPendingReview)}
            hint="AI vendor intake records awaiting decision"
            icon={<CalendarClock className="h-5 w-5" />}
          />
          <div className="flex flex-wrap gap-2 md:col-span-2 xl:col-span-5">
            <Button asChild size="sm" variant="outline">
              <Link href="/app/ai-governance">AI Governance Dashboard</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href={workflowRoutes.aiUseCaseCreate()}>AI Use Cases</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href={workflowRoutes.aiVendorIntakeCreate()}>Vendor Intake</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/app/ai-governance/reviews">AI Review Queue</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Response Ops Carry-Over</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <KpiCard
            label="Active Incidents"
            value={String(pulse.activeIncidents)}
            hint={`${pulse.triageIncidents} incident(s) still in triage`}
            icon={<AlertTriangle className="h-5 w-5" />}
          />
          <KpiCard
            label="Overdue Incident Actions"
            value={String(pulse.overdueIncidentActions)}
            hint="Incident-linked tasks that are past due"
            icon={<CalendarClock className="h-5 w-5" />}
          />
          <KpiCard
            label="Post-Incident Actions"
            value={String(pulse.openPostIncidentActions)}
            hint="After-action follow-ups still open"
            icon={<Shield className="h-5 w-5" />}
          />
          <KpiCard
            label="Upcoming Tabletops"
            value={String(pulse.upcomingTabletops)}
            hint="Draft exercises in the next 30 days"
            icon={<TrendingUp className="h-5 w-5" />}
          />
          <KpiCard
            label="After-Action Reports"
            value={String(pulse.recentAfterActionReports)}
            hint="Durable review artifacts already captured"
            icon={<Shield className="h-5 w-5" />}
          />
          <div className="flex flex-wrap gap-2 md:col-span-2 xl:col-span-5">
            <Button asChild size="sm" variant="outline">
              <Link href={workflowRoutes.responseIncidentTriage()}>Response Ops Dashboard</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href={workflowRoutes.runbookLauncher()}>Runbooks</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/app/findings">Findings Workbench</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>TrustOps Current Pressure</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <KpiCard
            label="Questionnaires Awaiting Review"
            value={String(pulse.trustQuestionnairesAwaitingReview)}
            hint="Drafted or needs-review trust responses"
            icon={<CalendarClock className="h-5 w-5" />}
          />
          <KpiCard
            label="Overdue Trust Reviews"
            value={String(pulse.trustOverdueReviews)}
            hint="Questionnaire, evidence-map, and packet SLAs"
            icon={<AlertTriangle className="h-5 w-5" />}
          />
          <KpiCard
            label="Open TrustOps Findings"
            value={String(pulse.openTrustFindings)}
            hint="Evidence gaps and rejected trust answers"
            icon={<Shield className="h-5 w-5" />}
          />
          <KpiCard
            label="Answer Reuse Count"
            value={String(pulse.answerLibraryReuseCount)}
            hint="Approved-answer library reuses recorded"
            icon={<TrendingUp className="h-5 w-5" />}
          />
          <KpiCard
            label="Trust Packets"
            value={String(pulse.trustPacketsCreated)}
            hint={`${pulse.trustPacketsExported} exported buyer package(s)`}
            icon={<Shield className="h-5 w-5" />}
          />
        </CardContent>
      </Card>

      <CommandCenterOperations missions={missionQueue} />

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle>7-Day Weekly Execution Queue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {missionQueue.map((mission) => (
              <div key={mission.id} className="rounded-md border border-border bg-background/60 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold">
                    {mission.day}: {mission.title}
                  </p>
                  <span
                    className={`rounded border px-2 py-0.5 text-xs font-medium ${
                      mission.priority === 'P0'
                        ? 'border-danger/40 bg-danger/10 text-danger'
                        : mission.priority === 'P1'
                          ? 'border-warning/50 bg-warning/10 text-warning'
                          : 'border-border bg-muted/20 text-muted-foreground'
                    }`}
                  >
                    {mission.priority}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{mission.why}</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {mission.actions.map((action) => (
                    <li key={action}>{action}</li>
                  ))}
                </ul>
                <div className="mt-3">
                  <Button asChild size="sm" variant="outline">
                    <Link href={mission.linkedRoute}>
                      Open Workflow <ArrowRight className="ml-1 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>What To Open Next</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {capabilities.map((capability) => (
              <div key={capability.id} className="rounded-md border border-border bg-background/60 p-3">
                <p className="text-sm font-semibold">{capability.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{capability.outcome}</p>
                <p className="mt-2 text-xs text-muted-foreground">Cadence: {capability.cadence}</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {capability.actions.map((action) => (
                    <li key={action}>{action}</li>
                  ))}
                </ul>
                <div className="mt-2">
                  <Link href={capability.linkedRoute} className="text-xs underline">
                    Open {capability.linkedRoute}
                  </Link>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Threat Trend Radar (2025-2026)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {trends.map((trend) => (
            <div key={trend.id} className="rounded-md border border-border bg-background/60 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold">{trend.title}</p>
                <span className={`rounded border px-2 py-0.5 text-xs font-medium ${severityClasses(trend.severity)}`}>
                  {trend.severity.toUpperCase()}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{trend.summary}</p>
              <p className="mt-2 text-xs text-muted-foreground">{trend.whyItMatters}</p>
              <div className="mt-2 grid gap-2 md:grid-cols-3">
                {trend.metrics.map((metric) => (
                  <div key={`${trend.id}-${metric.label}`} className="rounded border border-border bg-card/40 p-2">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{metric.label}</p>
                    <p className="text-sm font-semibold">{metric.value}</p>
                  </div>
                ))}
              </div>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {trend.operatorActions.map((action) => (
                  <li key={action}>{action}</li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-muted-foreground">Sources:</p>
              <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                {trend.sourceSet.map((source) => (
                  <li key={`${trend.id}-${source.url}`}>
                    <a href={source.url} target="_blank" rel="noreferrer">
                      {source.name} ({source.publishedOn})
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

