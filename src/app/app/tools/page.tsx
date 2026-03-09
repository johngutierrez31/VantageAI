import Link from 'next/link';
import { Layers3, Wrench } from 'lucide-react';
import { PageHeader } from '@/components/app/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getPageSessionContext } from '@/lib/auth/page-session';
import { getTenantEntitlements } from '@/lib/billing/entitlements';
import {
  MODULE_CATALOG,
  formatPlanLabel,
  getModuleCommercialState
} from '@/lib/product/module-catalog';

const supportingTools = [
  {
    id: 'command-center',
    title: 'Command Center',
    description: 'Cross-module operating center for open work, module carry-over, and leadership-ready priorities.',
    href: '/app/command-center'
  },
  {
    id: 'questionnaires',
    title: 'Questionnaires',
    description: 'Import, draft, review, and export approved questionnaire answers.',
    href: '/app/questionnaires'
  },
  {
    id: 'copilot',
    title: 'Copilot',
    description: 'Workflow launcher and evidence-aware guidance across the suite.',
    href: '/app/copilot'
  },
  {
    id: 'security-analyst',
    title: 'Security Analyst',
    description: 'Structured threat, incident, and architecture analysis workflows.',
    href: '/app/security-analyst'
  },
  {
    id: 'runbooks',
    title: 'Runbooks',
    description: 'Prebuilt task packs for incident response and operational follow-through.',
    href: '/app/runbooks'
  },
  {
    id: 'policies',
    title: 'Policies',
    description: 'Generate policy artifacts in markdown, HTML, and printable PDF.',
    href: '/app/policies'
  },
  {
    id: 'cyber-range',
    title: 'Cyber Range',
    description: 'Design simulation architecture and export operation plans.',
    href: '/app/cyber-range'
  }
] as const;

const workflowCards = [
  {
    title: 'Buyer Diligence Flow',
    steps: [
      'Import questionnaire and normalize rows',
      'Draft answers from approved evidence and answer library',
      'Approve responses and assemble trust packet'
    ]
  },
  {
    title: 'Executive Pulse Flow',
    steps: [
      'Generate an executive scorecard from live findings, tasks, assessments, and TrustOps signals',
      'Sync the living risk register and generate a 30/60/90 roadmap',
      'Draft the board brief and finalize the quarterly review cadence'
    ]
  },
  {
    title: 'AI Governance Flow',
    steps: [
      'Register the AI use case with workflow type, data classes, and owner',
      'Run vendor intake and policy mapping to surface blockers or approval conditions',
      'Push high-risk or rejected AI items into findings, tasks, and Pulse risks'
    ]
  },
  {
    title: 'Incident Readiness Flow',
    steps: [
      'Start incident triage with a first-hour checklist and runbook pack',
      'Maintain the incident timeline, shared tasks, and after-action review artifact',
      'Push follow-up findings, risks, tasks, and tabletop gaps into Pulse and quarterly cadence'
    ]
  }
] as const;

const guidedSkills = [
  ['Draft Questionnaire Answers', 'Create evidence-backed answer drafts with confidence and review routing.', '/app/questionnaires'],
  ['Build Evidence Map', 'Persist a buyer-ready evidence map with support strength, next actions, and related findings.', '/app/questionnaires'],
  ['Promote Approved Answers to Library', 'Curate reusable buyer-safe answers, ownership, and reuse quality from approved drafts.', '/app/trust/answer-library'],
  ['Review TrustOps Queue', 'Assign reviewers, set due dates, and control SLA risk across questionnaires, evidence maps, and trust packets.', '/app/trust/reviews'],
  ['Assemble Buyer Trust Packet', 'Package approved responses, evidence-map summaries, policy artifacts, and approved contacts into a buyer-ready export.', '/app/trust'],
  ['Generate Executive Scorecard', 'Persist a Pulse snapshot with explainable posture categories, deltas, and measured inputs.', '/app/pulse'],
  ['Build Risk Register', 'Normalize and maintain executive risks from findings, evidence gaps, overdue work, and manual input.', '/app/pulse/risks'],
  ['Generate 30/60/90 Roadmap', 'Turn current risk pressure into a reviewed remediation plan with owners, due dates, and expected impact.', '/app/pulse/roadmap'],
  ['Draft Board Brief', 'Translate posture and remediation trends into a persisted executive-ready brief.', '/app/pulse'],
  ['Prepare Quarterly Review', 'Assemble the recurring leadership review package from the current scorecard, roadmap, and board brief.', '/app/pulse'],
  ['Register AI Use Case', 'Create a durable AI use case record with typed data classes, approval state, and Pulse hooks.', '/app/ai-governance/use-cases'],
  ['Start AI Vendor Intake', 'Review vendor retention, training behavior, logging support, and approval conditions.', '/app/ai-governance/vendors'],
  ['Map AI Policies', 'Surface matched policy templates, unmet requirements, and approval blockers.', '/app/ai-governance/use-cases'],
  ['Review AI Governance Queue', 'Assign reviewers, set due dates, and work overdue AI decisions.', '/app/ai-governance/reviews'],
  ['Generate AI Governance Summary', 'Open the operator dashboard for AI adoption, open reviews, and Pulse-linked risk pressure.', '/app/ai-governance'],
  ['Start Incident Triage', 'Create a durable incident record, first-hour checklist, decision log scaffold, and incident-linked runbook pack.', '/app/response-ops'],
  ['Launch Runbook Pack', 'Generate phase-based incident tasks for triage, containment, communications, recovery, and follow-up.', '/app/response-ops'],
  ['Update Incident Timeline', 'Capture durable incident events and decision points without mixing internal-only notes into shareable outputs.', '/app/response-ops'],
  ['Draft After-Action Report', 'Build a review-gated incident report from the incident record, timeline, tasks, findings, and risks.', '/app/response-ops'],
  ['Prepare Tabletop Exercise', 'Create a lightweight exercise with scenario prompts, gap capture, and follow-up generation.', '/app/response-ops']
] as const;

export default async function ToolsHubPage() {
  const session = await getPageSessionContext();
  const entitlements = await getTenantEntitlements(session.tenantId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tools Hub"
        description="Launch the VantageAI suite by module: TrustOps for buyer diligence, Pulse for executive cadence, AI Governance for governed adoption, and Response Ops for premium incident execution."
        primaryAction={{ label: 'Open Command Center', href: '/app/command-center' }}
        secondaryActions={[
          { label: 'Pulse', href: '/app/pulse', variant: 'outline' },
          { label: 'AI Governance', href: '/app/ai-governance', variant: 'outline' },
          { label: 'Response Ops', href: '/app/response-ops', variant: 'outline' },
          { label: 'TrustOps', href: '/app/trust', variant: 'outline' },
          { label: 'Billing & Packaging', href: '/app/settings/billing', variant: 'outline' }
        ]}
      >
        <p className="text-xs text-muted-foreground">
          Current plan: {formatPlanLabel(entitlements.plan)} | Use this page to open the right module and show the right workflow during demos.
        </p>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers3 className="h-4 w-4" />
            Suite Modules
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {MODULE_CATALOG.map((module) => {
            const commercialState = getModuleCommercialState(entitlements.plan, module);
            return (
              <div key={module.id} className="rounded-md border border-border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{module.categoryLabel}</p>
                    <p className="text-lg font-semibold">{module.label}</p>
                  </div>
                  <span className="rounded border border-border bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-foreground">
                    {commercialState.badge}
                  </span>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{module.summary}</p>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {module.outcomes.map((outcome) => (
                    <li key={outcome}>{outcome}</li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-muted-foreground">{commercialState.helperText}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button asChild size="sm">
                    <Link href={module.startHref}>{module.startLabel}</Link>
                  </Button>
                  {!commercialState.included ? (
                    <Button asChild size="sm" variant="outline">
                      <Link href="/app/settings/billing">{commercialState.upgradeCtaLabel}</Link>
                    </Button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {supportingTools.map((tool) => (
          <Card key={tool.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Wrench className="h-4 w-4" />
                {tool.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{tool.description}</p>
              <Button asChild size="sm" variant="outline">
                <Link href={tool.href}>Open Workspace</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Integrated Workflows</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {workflowCards.map((workflow) => (
            <div key={workflow.title} className="rounded-md border border-border p-3">
              <p className="text-sm font-semibold">{workflow.title}</p>
              <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
                {workflow.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Guided Workflows</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {guidedSkills.map(([title, description, href]) => (
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
    </div>
  );
}
