'use client';

import Link from 'next/link';
import { AlertTriangle, Bot, ClipboardList, ExternalLink, FileCheck, ShieldCheck } from 'lucide-react';
import { KpiCard } from '@/components/app/kpi-card';
import { StatusPill } from '@/components/app/status-pill';
import { PageHeader } from '@/components/app/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { workflowRoutes } from '@/lib/product/workflow-routes';

type DashboardMetrics = {
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
};

type DecisionRow = {
  id: string;
  type: 'AI_USE_CASE' | 'AI_VENDOR_REVIEW';
  title: string;
  status: string;
  riskTier: string;
  updatedAt: string;
  href: string;
};

type RiskRow = {
  id: string;
  title: string;
  severity: string;
  status: string;
  targetDueAt: string | null;
};

export function AIGovernanceDashboardPanel({
  metrics,
  recentDecisions,
  topRisks
}: {
  metrics: DashboardMetrics;
  recentDecisions: DecisionRow[];
  topRisks: RiskRow[];
}) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Governance"
        helpKey="aiGovernance"
        description="AI Governance is the governed AI adoption layer: register use cases, review vendors, map policies and data classes, and carry high-risk AI decisions into findings and Pulse."
        primaryAction={{ label: 'Register AI Use Case', href: workflowRoutes.aiUseCaseCreate() }}
        secondaryActions={[
          { label: 'Adoption Mode', href: '/app/adoption', variant: 'outline' },
          { label: 'Vendor Intake', href: workflowRoutes.aiVendorIntakeCreate(), variant: 'outline' },
          { label: 'Review Queue', href: workflowRoutes.aiReviewQueue(), variant: 'outline' },
          { label: 'Pulse Risks', href: '/app/pulse/risks', variant: 'outline' }
        ]}
      >
        <p className="text-xs text-muted-foreground">
          Start here: review the proposed AI workflow, confirm the vendor and policy fit, then carry the remaining conditions into findings and Pulse.
        </p>
      </PageHeader>

      <Card className="border-primary/30 bg-gradient-to-r from-card via-card to-muted/20">
        <CardContent className="grid gap-4 p-5 md:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">Current Decision Story</p>
            <p className="mt-3 text-lg font-semibold">
              Productive AI can move forward here, but only when the team can show exactly what is approved, what is blocked, and why.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              The sample tenant shows one TrustOps copilot under conditional approval and one customer-revenue workflow held in review until vendor, data-class, and buyer-safe controls are defensible.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {[
              'Risk tier, ownership, and review status are immediately visible.',
              'Policy links and blockers make approvals board-safe and buyer-safe.',
              'Open AI work feeds findings and Pulse instead of sitting in a silo.'
            ].map((item) => (
              <div key={item} className="rounded-md border border-border bg-background/60 p-3 text-sm text-muted-foreground">
                {item}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          label="AI Use Cases"
          value={String(metrics.totalUseCases)}
          hint={`${metrics.pendingReviews} pending review`}
          icon={<Bot className="h-5 w-5" />}
        />
        <KpiCard
          label="Vendor Intakes"
          value={String(metrics.totalVendorReviews)}
          hint={`${metrics.vendorPendingReviewCount} pending vendor reviews`}
          icon={<ExternalLink className="h-5 w-5" />}
        />
        <KpiCard
          label="High-Risk AI Items"
          value={String(metrics.highRiskCount)}
          hint={`${metrics.rejectedCount} rejected`}
          icon={<AlertTriangle className="h-5 w-5" />}
        />
        <KpiCard
          label="Conditional Approvals"
          value={String(metrics.conditionalApprovalCount)}
          hint="Tracked follow-up conditions"
          icon={<FileCheck className="h-5 w-5" />}
        />
        <KpiCard
          label="Pulse Hooks"
          value={String(metrics.linkedOpenRisksCount + metrics.linkedOpenFindingsCount)}
          hint={`${metrics.linkedOpenRisksCount} risks | ${metrics.linkedOpenFindingsCount} findings`}
          icon={<ShieldCheck className="h-5 w-5" />}
        />
      </div>

      <Card id="guided-ai-governance-workflows">
        <CardHeader>
          <CardTitle>Guided AI Governance Workflows</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {[
            [
              'Register AI Use Case',
              'Create a durable use-case record with data classes, policy mapping, risk tier, and review gating.',
              workflowRoutes.aiUseCaseCreate()
            ],
            [
              'Start AI Vendor Intake',
              'Review an AI vendor/product for retention, training behavior, logging, and approval conditions.',
              workflowRoutes.aiVendorIntakeCreate()
            ],
            [
              'Review AI Queue',
              'Assign reviewers, set due dates, and control overdue AI approval work.',
              workflowRoutes.aiReviewQueue()
            ],
            [
              'Map Policies and Data Classes',
              'See matched policy templates, unmet requirements, prohibited conditions, and approval blockers.',
              workflowRoutes.aiUseCaseCreate('policy-mapping')
            ],
            [
              'Track AI-Driven Pulse Risk',
              'Open linked findings and risk register items created from rejected or high-risk AI workflows.',
              '/app/pulse/risks'
            ],
            [
              'Generate AI Governance Summary',
              'Use the module dashboard and Pulse layer to summarize adoption, review backlog, and decision pressure.',
              '/app/ai-governance'
            ]
          ].map(([title, description, href]) => (
            <div key={title} className="rounded-md border border-border p-3">
              <p className="text-sm font-semibold">{title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
              <Button asChild size="sm" variant="outline" className="mt-3">
                <Link href={href}>Open Workflow</Link>
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Recent Decisions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentDecisions.length ? (
              recentDecisions.map((decision) => (
                <div key={`${decision.type}-${decision.id}`} className="rounded-md border border-border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">{decision.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {decision.type === 'AI_USE_CASE' ? 'AI Use Case' : 'AI Vendor Review'} updated{' '}
                        {new Date(decision.updatedAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusPill status={decision.riskTier} />
                      <StatusPill status={decision.status} />
                    </div>
                  </div>
                  <Button asChild size="sm" variant="outline" className="mt-3">
                    <Link href={decision.href}>Open Record</Link>
                  </Button>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Register the first AI use case or vendor review to create a durable decision trail here.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI Governance Risk Pressure</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-1">
              <div className="rounded-md border border-border p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Overdue Reviews</p>
                <p className="text-2xl font-semibold">{metrics.overdueReviews}</p>
              </div>
              <div className="rounded-md border border-border p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Open AI Findings</p>
                <p className="text-2xl font-semibold">{metrics.linkedOpenFindingsCount}</p>
              </div>
              <div className="rounded-md border border-border p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Open AI Risks</p>
                <p className="text-2xl font-semibold">{metrics.linkedOpenRisksCount}</p>
              </div>
            </div>
            {topRisks.length ? (
              topRisks.map((risk) => (
                <div key={risk.id} className="rounded-md border border-border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{risk.title}</p>
                    <div className="flex items-center gap-2">
                      <StatusPill status={risk.severity} />
                      <StatusPill status={risk.status} />
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {risk.targetDueAt ? `Due ${new Date(risk.targetDueAt).toLocaleDateString()}` : 'No target due date'}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Open AI findings and Pulse-linked risks will appear here once decisions create follow-up work.</p>
            )}
            <Button asChild size="sm" variant="outline">
              <Link href="/app/pulse/risks">Open Pulse Risk Register</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>What This Module Controls</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            'Use-case registry with durable approval state',
            'Vendor intake and third-party AI review workflow',
            'Policy and data-class mapping with explicit blockers',
            'Pulse-ready findings and risk hooks for leadership reporting'
          ].map((item) => (
            <div key={item} className="rounded-md border border-border bg-background/60 p-3 text-sm text-muted-foreground">
              {item}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

