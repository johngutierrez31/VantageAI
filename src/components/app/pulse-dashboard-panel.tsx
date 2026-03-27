'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { ArrowRight, CalendarClock, ClipboardList, Gauge, Loader2 } from 'lucide-react';
import { KpiCard } from '@/components/app/kpi-card';
import { StatusPill } from '@/components/app/status-pill';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { workflowRoutes } from '@/lib/product/workflow-routes';
import { cn } from '@/lib/utils';

type SnapshotSummary = {
  id: string;
  reportingPeriod: string;
  periodType: 'MONTHLY' | 'QUARTERLY';
  status: string;
  overallScore: number;
  overallDelta: number | null;
  snapshotDate: string;
};

type RoadmapSummary = {
  id: string;
  name: string;
  status: string;
  reportingPeriod: string;
  items: Array<{ id: string; title: string; horizon: string; status: string; dueAt: string | null }>;
};

type BoardBriefSummary = {
  id: string;
  title: string;
  status: string;
  reportingPeriod: string;
  updatedAt: string;
};

type QuarterlyReviewSummary = {
  id: string;
  reviewPeriod: string;
  status: string;
  reviewDate: string;
};

type RiskSummary = {
  id: string;
  title: string;
  severity: string;
  status: string;
  sourceModule: string;
  ownerUserId: string | null;
  targetDueAt: string | null;
};

type PulseMetrics = {
  currentPostureScore: number | null;
  postureDelta: number | null;
  openTopRisks: number;
  overdueRoadmapItems: number;
  overdueTasks: number;
  openTrustFindings: number;
  trustOverdueReviews: number;
  openAiReviews: number;
  highRiskAiUseCases: number;
  conditionalAiApprovalsPending: number;
  aiVendorsPendingReview: number;
  activeIncidents: number;
  overdueIncidentActions: number;
  openPostIncidentActions: number;
  upcomingTabletops: number;
  recentAfterActionReports: number;
};

type PulseWorkflow = 'scorecard' | 'roadmap' | 'board-brief' | 'quarterly-review' | null;

async function apiRequest(url: string, options?: RequestInit) {
  const response = await fetch(url, options);
  const text = await response.text();
  if (!response.ok) {
    throw new Error(text || `Request failed with ${response.status}`);
  }
  return text ? JSON.parse(text) : null;
}

export function PulseDashboardPanel({
  readOnly,
  activeWorkflow,
  metrics,
  snapshots,
  roadmaps,
  boardBriefs,
  quarterlyReviews,
  risks
}: {
  readOnly: boolean;
  activeWorkflow: PulseWorkflow;
  metrics: PulseMetrics;
  snapshots: SnapshotSummary[];
  roadmaps: RoadmapSummary[];
  boardBriefs: BoardBriefSummary[];
  quarterlyReviews: QuarterlyReviewSummary[];
  risks: RiskSummary[];
}) {
  const router = useRouter();
  const [periodType, setPeriodType] = useState<'MONTHLY' | 'QUARTERLY'>('QUARTERLY');
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const latestSnapshot = snapshots[0] ?? null;
  const latestRoadmap = roadmaps[0] ?? null;
  const latestBoardBrief = boardBriefs[0] ?? null;
  const latestQuarterlyReview = quarterlyReviews[0] ?? null;
  const workflowNarrative =
    activeWorkflow === 'scorecard'
      ? {
          title: 'Generate Executive Scorecard',
          description:
            'Create a durable Pulse snapshot from live findings, trust backlog, AI review pressure, and incident carry-over. Publishing the snapshot establishes the source record for roadmap, board brief, and quarterly review work.'
        }
      : activeWorkflow === 'roadmap'
        ? {
            title: 'Generate 30/60/90 Roadmap',
            description:
              'Build the remediation plan from the latest approved posture snapshot so roadmap items inherit current score pressure, ownership, and due dates.'
          }
        : activeWorkflow === 'board-brief'
          ? {
              title: 'Draft Board Brief',
              description:
                'Draft a board-ready artifact from the latest snapshot and roadmap so leadership commentary stays tied to the same measured source package.'
            }
          : activeWorkflow === 'quarterly-review'
            ? {
                title: 'Prepare Quarterly Review',
                description:
                  'Assemble the quarterly leadership review from the latest snapshot, roadmap, and board brief so the review package is a distinct durable record rather than a dashboard state.'
              }
            : null;

  const workflowCards = useMemo(
    () => [
      {
        id: 'snapshot',
        workflow: 'scorecard' as const,
        sectionId: 'pulse-scorecard-workflow',
        title: 'Generate Executive Scorecard',
        description: 'Produces a persisted Pulse snapshot with explainable category scores, measured inputs, and review state.',
        buttonLabel: 'Generate Scorecard',
        onClick: async () => {
          const created = await apiRequest('/api/pulse/snapshots', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ periodType })
          });
          return { redirectHref: `/app/pulse/snapshots/${created.id}` };
        },
        disabled: readOnly
      },
      {
        id: 'risks',
        workflow: null,
        sectionId: 'pulse-risk-workflow',
        title: 'Build Risk Register',
        description: 'Creates or refreshes tenant-scoped risks from findings, evidence gaps, assessment gaps, and overdue remediation work.',
        buttonLabel: 'Sync Risks',
        onClick: async () => {
          await apiRequest('/api/pulse/risks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode: 'sync' })
          });
        },
        disabled: readOnly
      },
      {
        id: 'roadmap',
        workflow: 'roadmap' as const,
        sectionId: 'pulse-roadmap-workflow',
        title: 'Generate 30/60/90 Roadmap',
        description: 'Produces a persisted executive roadmap from current risk pressure and weak scorecard categories.',
        buttonLabel: 'Generate Roadmap',
        onClick: async () => {
          if (!latestSnapshot) return;
          const created = await apiRequest('/api/pulse/roadmaps', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ snapshotId: latestSnapshot.id })
          });
          return { redirectHref: workflowRoutes.pulseRoadmapRecord(created.id) };
        },
        disabled: readOnly || !latestSnapshot
      },
      {
        id: 'brief',
        workflow: 'board-brief' as const,
        sectionId: 'pulse-board-brief-workflow',
        title: 'Draft Board Brief',
        description: 'Produces a persisted executive brief using the latest scorecard, top risks, overdue actions, and roadmap summary.',
        buttonLabel: 'Draft Brief',
        onClick: async () => {
          if (!latestSnapshot || !latestRoadmap) return;
          const created = await apiRequest('/api/pulse/board-briefs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ snapshotId: latestSnapshot.id, roadmapId: latestRoadmap.id })
          });
          return { redirectHref: `/app/pulse/board-briefs/${created.id}` };
        },
        disabled: readOnly || !latestSnapshot || !latestRoadmap
      },
      {
        id: 'quarterly-review',
        workflow: 'quarterly-review' as const,
        sectionId: 'pulse-quarterly-review-workflow',
        title: 'Prepare Quarterly Review',
        description: 'Creates the recurring leadership review record with linked snapshot, roadmap, board brief, and top risks.',
        buttonLabel: 'Prepare Review',
        onClick: async () => {
          if (!latestSnapshot || !latestRoadmap || !latestBoardBrief) return;
          const created = await apiRequest('/api/pulse/quarterly-reviews', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              snapshotId: latestSnapshot.id,
              roadmapId: latestRoadmap.id,
              boardBriefId: latestBoardBrief.id
            })
          });
          return { redirectHref: `/app/pulse/quarterly-reviews/${created.id}` };
        },
        disabled: readOnly || !latestSnapshot || !latestRoadmap || !latestBoardBrief
      }
    ],
    [latestBoardBrief, latestRoadmap, latestSnapshot, periodType, readOnly]
  );

  async function runAction(
    actionId: string,
    callback: () => Promise<{ redirectHref?: string } | void>
  ) {
    setBusyAction(actionId);
    setError(null);
    try {
      const result = await callback();
      if (result?.redirectHref) {
        router.push(result.redirectHref);
        return;
      }
      router.refresh();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : String(nextError));
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border-primary/30 bg-gradient-to-r from-card via-card to-muted/20">
        <CardContent className="grid gap-4 p-5 md:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">Executive Story</p>
            <p className="mt-3 text-lg font-semibold">
              Pulse translates live operating work into a posture summary leadership can actually use.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              This scorecard reflects trust review pressure, AI governance conditions, overdue remediation, and incident carry-over instead of a disconnected reporting layer.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {[
              'Score changes are tied to real workflow signals.',
              'Top risks and roadmap items remain owned and due-dated.',
              'Board and quarterly outputs stay anchored to the latest snapshot.'
            ].map((item) => (
              <div key={item} className="rounded-md border border-border bg-background/60 p-3 text-sm text-muted-foreground">
                {item}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {workflowNarrative ? (
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="space-y-2 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">Workflow Mode</p>
            <p className="text-lg font-semibold">{workflowNarrative.title}</p>
            <p className="text-sm text-muted-foreground">{workflowNarrative.description}</p>
          </CardContent>
        </Card>
      ) : null}
      {readOnly ? (
        <Card className="border-warning/40 bg-warning/10">
          <CardContent className="p-4 text-sm text-muted-foreground">
            Pulse generation workflows are read-only in this demo workspace. Open existing snapshots, roadmap items, and executive artifacts to review outputs.
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Current Posture Score"
          value={metrics.currentPostureScore === null ? 'N/A' : metrics.currentPostureScore.toFixed(1)}
          hint={metrics.postureDelta === null ? 'No prior snapshot yet' : `${metrics.postureDelta >= 0 ? '+' : ''}${metrics.postureDelta.toFixed(1)} vs prior snapshot`}
          icon={<Gauge className="h-5 w-5" />}
        />
        <KpiCard
          label="Open Top Risks"
          value={String(metrics.openTopRisks)}
          hint="High and critical open risk register items"
          icon={<ClipboardList className="h-5 w-5" />}
        />
        <KpiCard
          label="Overdue Roadmap Items"
          value={String(metrics.overdueRoadmapItems)}
          hint={`${metrics.overdueTasks} overdue remediation task(s) still open`}
          icon={<CalendarClock className="h-5 w-5" />}
        />
        <KpiCard
          label="Trust Carry-Over"
          value={String(metrics.openTrustFindings + metrics.trustOverdueReviews)}
          hint={`${metrics.openTrustFindings} open TrustOps finding(s) | ${metrics.trustOverdueReviews} overdue review(s)`}
          icon={<ArrowRight className="h-5 w-5" />}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>AI Governance Carry-Over</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Open AI Reviews"
            value={String(metrics.openAiReviews)}
            hint={`${metrics.aiVendorsPendingReview} vendor review(s) awaiting decision`}
            icon={<ClipboardList className="h-5 w-5" />}
          />
          <KpiCard
            label="High-Risk AI Items"
            value={String(metrics.highRiskAiUseCases)}
            hint="High and critical AI use cases or vendor reviews"
            icon={<Gauge className="h-5 w-5" />}
          />
          <KpiCard
            label="Conditional AI Approvals"
            value={String(metrics.conditionalAiApprovalsPending)}
            hint="AI approvals still carrying follow-up conditions"
            icon={<CalendarClock className="h-5 w-5" />}
          />
          <div className="flex items-center">
            <Button asChild size="sm" variant="outline">
              <Link href="/app/ai-governance">Open AI Governance</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card id="guided-pulse-workflows">
        <CardHeader>
          <CardTitle>Response Ops Carry-Over</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <KpiCard
            label="Active Incidents"
            value={String(metrics.activeIncidents)}
            hint="Open incidents still affecting posture"
            icon={<ClipboardList className="h-5 w-5" />}
          />
          <KpiCard
            label="Overdue Incident Actions"
            value={String(metrics.overdueIncidentActions)}
            hint="Incident-linked tasks past due"
            icon={<CalendarClock className="h-5 w-5" />}
          />
          <KpiCard
            label="Post-Incident Actions"
            value={String(metrics.openPostIncidentActions)}
            hint="After-action follow-ups still open"
            icon={<Gauge className="h-5 w-5" />}
          />
          <KpiCard
            label="Upcoming Tabletops"
            value={String(metrics.upcomingTabletops)}
            hint="Draft exercises in the next 30 days"
            icon={<ClipboardList className="h-5 w-5" />}
          />
          <KpiCard
            label="After-Action Reports"
            value={String(metrics.recentAfterActionReports)}
            hint="Response review artifacts captured"
            icon={<CalendarClock className="h-5 w-5" />}
          />
          <div className="flex items-center">
            <Button asChild size="sm" variant="outline">
              <Link href="/app/response-ops">Open Response Ops</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle>Guided Pulse Workflows</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Launch scorecards, risks, roadmap, board reporting, and quarterly review as durable product records.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Snapshot cadence</span>
            <Select value={periodType} onChange={(event) => setPeriodType(event.target.value as 'MONTHLY' | 'QUARTERLY')}>
              <option value="QUARTERLY">Quarterly</option>
              <option value="MONTHLY">Monthly</option>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {workflowCards.map((workflow) => (
            <div
              key={workflow.id}
              id={workflow.sectionId}
              className={cn(
                'rounded-md border border-border p-3',
                workflow.workflow !== null && workflow.workflow === activeWorkflow
                  ? 'border-primary/50 bg-primary/5 shadow-sm'
                  : null
              )}
            >
              <p className="text-sm font-semibold">{workflow.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{workflow.description}</p>
              <Button
                className="mt-3"
                size="sm"
                onClick={() => runAction(workflow.id, workflow.onClick)}
                disabled={workflow.disabled || busyAction !== null}
              >
                {busyAction === workflow.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {readOnly ? 'Read-only in demo' : workflow.buttonLabel}
              </Button>
              {workflow.id === 'snapshot' && latestSnapshot ? (
                <Button asChild size="sm" variant="ghost" className="mt-2">
                  <Link href={`/app/pulse/snapshots/${latestSnapshot.id}`}>Open latest snapshot</Link>
                </Button>
              ) : null}
              {workflow.id === 'brief' && latestBoardBrief ? (
                <Button asChild size="sm" variant="ghost" className="mt-2">
                  <Link href={`/app/pulse/board-briefs/${latestBoardBrief.id}`}>Open latest board brief</Link>
                </Button>
              ) : null}
              {workflow.id === 'roadmap' && latestRoadmap ? (
                <Button asChild size="sm" variant="ghost" className="mt-2">
                  <Link href={workflowRoutes.pulseRoadmapRecord(latestRoadmap.id)}>Open latest roadmap</Link>
                </Button>
              ) : null}
              {workflow.id === 'quarterly-review' && latestQuarterlyReview ? (
                <Button asChild size="sm" variant="ghost" className="mt-2">
                  <Link href={`/app/pulse/quarterly-reviews/${latestQuarterlyReview.id}`}>Open latest quarterly review</Link>
                </Button>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>

      {error ? (
        <Card>
          <CardContent className="pt-6 text-sm text-danger">{error}</CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Latest Executive Scorecard</CardTitle>
          </CardHeader>
          <CardContent>
            {latestSnapshot ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{latestSnapshot.reportingPeriod}</p>
                    <p className="text-xs text-muted-foreground">
                      Captured {new Date(latestSnapshot.snapshotDate).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusPill status={latestSnapshot.status} />
                    <StatusPill status={latestSnapshot.periodType} />
                  </div>
                </div>
                <p className="text-3xl font-semibold">{latestSnapshot.overallScore.toFixed(1)} / 100</p>
                <p className="text-sm text-muted-foreground">
                  {latestSnapshot.overallDelta === null
                    ? 'No prior snapshot available yet.'
                    : `Delta vs prior snapshot: ${latestSnapshot.overallDelta >= 0 ? '+' : ''}${latestSnapshot.overallDelta.toFixed(1)}`}
                </p>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/app/pulse/snapshots/${latestSnapshot.id}`}>Open Snapshot Detail</Link>
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Generate the first executive scorecard to establish a posture baseline and trendline.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Current Workflow State</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span>Latest roadmap</span>
              {latestRoadmap ? <StatusPill status={latestRoadmap.status} /> : <span className="text-muted-foreground">None</span>}
            </div>
            <div className="flex items-center justify-between gap-2">
              <span>Latest board brief</span>
              {latestBoardBrief ? <StatusPill status={latestBoardBrief.status} /> : <span className="text-muted-foreground">None</span>}
            </div>
            <div className="flex items-center justify-between gap-2">
              <span>Latest quarterly review</span>
              {latestQuarterlyReview ? <StatusPill status={latestQuarterlyReview.status} /> : <span className="text-muted-foreground">None</span>}
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button asChild size="sm" variant="outline">
                <Link href="/app/pulse/risks">Open Risk Register</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href="/app/pulse/roadmap">Open Roadmap</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Top Risks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {risks.length ? (
              risks.slice(0, 5).map((risk) => (
                <div key={risk.id} className="rounded-md border border-border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{risk.title}</p>
                    <div className="flex items-center gap-2">
                      <StatusPill status={risk.severity} />
                      <StatusPill status={risk.status} />
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {risk.sourceModule} {risk.targetDueAt ? `| due ${new Date(risk.targetDueAt).toLocaleDateString()}` : ''}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Sync the risk register from findings, trust gaps, AI reviews, and overdue work to populate this view.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Roadmap</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {latestRoadmap ? (
              <>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{latestRoadmap.name}</p>
                  <StatusPill status={latestRoadmap.status} />
                </div>
                {latestRoadmap.items.slice(0, 5).map((item) => (
                  <div key={item.id} className="rounded-md border border-border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{item.title}</p>
                      <StatusPill status={item.status} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.horizon.replace('DAYS_', '')} day horizon{item.dueAt ? ` | due ${new Date(item.dueAt).toLocaleDateString()}` : ''}
                    </p>
                  </div>
                ))}
                <Button asChild size="sm" variant="outline">
                  <Link href="/app/pulse/roadmap">Open Roadmap</Link>
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Generate a 30/60/90 roadmap once the current risk picture is stable enough to assign owners and dates.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Board and Review Cadence</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {latestBoardBrief ? (
              <div className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{latestBoardBrief.title}</p>
                  <StatusPill status={latestBoardBrief.status} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Updated {new Date(latestBoardBrief.updatedAt).toLocaleString()}</p>
                <Button asChild size="sm" variant="outline" className="mt-3">
                  <Link href={`/app/pulse/board-briefs/${latestBoardBrief.id}`}>Open Board Brief</Link>
                </Button>
              </div>
            ) : null}
            {latestQuarterlyReview ? (
              <div className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">Quarterly Review {latestQuarterlyReview.reviewPeriod}</p>
                  <StatusPill status={latestQuarterlyReview.status} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Review date {new Date(latestQuarterlyReview.reviewDate).toLocaleDateString()}</p>
                <Button asChild size="sm" variant="outline" className="mt-3">
                  <Link href={`/app/pulse/quarterly-reviews/${latestQuarterlyReview.id}`}>Open Quarterly Review</Link>
                </Button>
              </div>
            ) : null}
            {!latestBoardBrief && !latestQuarterlyReview ? (
              <p className="text-sm text-muted-foreground">Draft the board brief and quarterly review after the scorecard and roadmap are current.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
