import Link from 'next/link';
import { AlertTriangle, ArrowRight, CalendarClock, Shield, TrendingUp } from 'lucide-react';
import { PageHeader } from '@/components/app/page-header';
import { KpiCard } from '@/components/app/kpi-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CommandCenterOperations } from '@/components/app/command-center-operations';
import { getPageSessionContext } from '@/lib/auth/page-session';
import { buildSevenDayMissionQueue, getTenantSecurityPulse } from '@/lib/intel/pulse';
import { getSoloCisoCapabilities, getTrendSignals, type TrendSeverity } from '@/lib/intel/trends';

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
  const [pulse, trends] = await Promise.all([
    getTenantSecurityPulse(session.tenantId),
    Promise.resolve(getTrendSignals())
  ]);

  const capabilities = getSoloCisoCapabilities();
  const missionQueue = buildSevenDayMissionQueue(pulse, trends);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Command Center"
        helpKey="commandCenter"
        description="Run the VantageAI security operating system from one cross-module surface: open work, executive carry-over, trust pressure, incident activity, and guided next actions."
        primaryAction={{ label: 'Open Copilot', href: '/app/copilot' }}
        secondaryActions={[
          { label: 'Pulse', href: '/app/pulse', variant: 'outline' },
          { label: 'AI Governance', href: '/app/ai-governance', variant: 'outline' },
          { label: 'Response Ops', href: '/app/response-ops', variant: 'outline' },
          { label: 'TrustOps', href: '/app/trust', variant: 'outline' },
          { label: 'Security Analyst', href: '/app/security-analyst', variant: 'outline' },
          { label: 'Runbooks', href: '/app/runbooks', variant: 'outline' },
          { label: 'Findings Workbench', href: '/app/findings', variant: 'outline' },
          { label: 'Billing & Packaging', href: '/app/settings/billing', variant: 'outline' }
        ]}
      >
        <p className="text-xs text-muted-foreground">
          Workspace: {session.tenantName} | Pulse captured at {new Date(pulse.capturedAt).toLocaleString()}
        </p>
      </PageHeader>

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
              <Link href={pulse.latestPulseSnapshotId ? `/app/pulse/snapshots/${pulse.latestPulseSnapshotId}` : '/app/pulse'}>
                Pulse Snapshot
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/app/pulse/risks">Risk Register</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/app/pulse/roadmap">Roadmap</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href={pulse.latestBoardBriefId ? `/app/pulse/board-briefs/${pulse.latestBoardBriefId}` : '/app/pulse'}>
                Board Brief
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link
                href={
                  pulse.latestQuarterlyReviewId
                    ? `/app/pulse/quarterly-reviews/${pulse.latestQuarterlyReviewId}`
                    : '/app/pulse'
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
          <CardTitle>AI Governance Operational Layer</CardTitle>
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
              <Link href="/app/ai-governance/use-cases">AI Use Cases</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/app/ai-governance/vendors">Vendor Intake</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/app/ai-governance/reviews">AI Review Queue</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Response Ops Operational Layer</CardTitle>
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
              <Link href="/app/response-ops">Response Ops Dashboard</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/app/runbooks">Runbooks</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/app/findings">Findings Workbench</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>TrustOps Operational Pulse</CardTitle>
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
            <CardTitle>7-Day Mission Queue</CardTitle>
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
            <CardTitle>Module Launch Map</CardTitle>
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
          <CardTitle>Threat Trend Radar (2025-2026)</CardTitle>
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

