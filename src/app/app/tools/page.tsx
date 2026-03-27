import Link from 'next/link';
import { Layers3, Wrench } from 'lucide-react';
import { PageHeader } from '@/components/app/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DemoPathCard } from '@/components/app/demo-path-card';
import { TrialOnboardingCard } from '@/components/app/trial-onboarding-card';
import { getTenantAdoptionModeViewModel } from '@/lib/adoption/adoption-mode';
import { getPageSessionContext } from '@/lib/auth/page-session';
import { getTenantEntitlements } from '@/lib/billing/entitlements';
import { getTenantDemoPathViewModel } from '@/lib/demo/demo-path';
import { getTenantTrialOnboarding } from '@/lib/trial/onboarding';
import { getTenantWorkspaceContext } from '@/lib/workspace-mode';
import {
  MODULE_CATALOG,
  formatPlanLabel,
  getModuleCommercialState
} from '@/lib/product/module-catalog';
import { workflowRoutes } from '@/lib/product/workflow-routes';

const supportingTools = [
  {
    id: 'adoption',
    title: 'Adoption Mode',
    description: 'Show how Vantage works with your existing stack through imports, connectors, and operating-layer cues.',
    href: '/app/adoption'
  },
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
    id: 'connectors',
    title: 'Connector Health',
    description: 'Configure Slack, Jira, document publishing, and outbound hooks with visible sync health.',
    href: '/app/settings/connectors'
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
  },
  {
    title: 'Integration Pack Flow',
    steps: [
      'Configure tenant-scoped connectors for Slack, Jira, and publishing',
      'Push the highest-value work items into the systems your team already uses',
      'Review connector health, recent delivery activity, and linked external objects'
    ]
  },
  {
    title: 'Adoption Mode Flow',
    steps: [
      'Import findings, risks, approved answers, or incidents from spreadsheets and connector exports',
      'Use Vantage as the operating layer above existing trust, risk, incident, and review systems',
      'Follow the value graph from trust response to evidence, risk, roadmap, board brief, and incident carry-over'
    ]
  }
] as const;

const guidedSkills = [
  ['Open Adoption Mode', 'Show a new operator where Vantage fits before they commit to a broader rollout.', '/app/adoption'],
  ['Plan Stack Import', 'Bring in findings, risks, approved answers, or incidents without overclaiming unsupported imports.', '/app/adoption'],
  ['Explain Value Path', 'Show how trust, risk, roadmap, board reporting, AI review, and incident carry-over connect.', '/app/adoption'],
  ['Recommend Next Workflow', 'Use the operating-layer framing to move a new operator into the strongest starting workflow.', '/app/adoption'],
  ['Draft Questionnaire Answers', 'Create evidence-backed answer drafts with confidence and review routing.', workflowRoutes.questionnairesIntake()],
  ['Build Evidence Map', 'Persist a buyer-ready evidence map with support strength, next actions, and related findings.', workflowRoutes.questionnairesEvidenceMapEntry()],
  ['Promote Approved Answers to Library', 'Curate reusable buyer-safe answers, ownership, and reuse quality from approved drafts.', '/app/trust/answer-library'],
  ['Review TrustOps Queue', 'Assign reviewers, set due dates, and control SLA risk across questionnaires, evidence maps, and trust packets.', '/app/trust/reviews'],
  ['Assemble Buyer Trust Packet', 'Package approved responses, evidence-map summaries, policy artifacts, and approved contacts into a buyer-ready export.', workflowRoutes.trustPacketAssembly()],
  ['Publish Trust Room', 'Turn an approved trust packet into a buyer-facing trust room with protected-link or request-gated access.', workflowRoutes.trustRoomPublish()],
  ['Prepare Buyer Packet', 'Open TrustOps packet assembly and package only the approved external-safe materials.', workflowRoutes.trustPacketAssembly()],
  ['Review Access Requests', 'Assign an internal owner, approve or deny buyer access requests, and issue gated room links.', workflowRoutes.trustRoomAccessRequests()],
  ['Summarize Buyer Engagement', 'Review buyer room views, downloads, request counts, and the sections buyers actually opened.', workflowRoutes.trustRoomEngagement()],
  ['Configure Connectors', 'Set up Slack, Jira, Confluence, and outbound hooks with tenant-scoped settings and health checks.', '/app/settings/connectors'],
  ['Send to Slack', 'Push a high-signal buyer, incident, or leadership update into Slack with a deep link back into Vantage.', '/app/settings/connectors'],
  ['Sync to Jira', 'Create or refresh Jira issues for risks, findings, incident follow-up tasks, and roadmap items.', '/app/settings/connectors'],
  ['Publish to Docs', 'Publish a board brief, trust packet summary, after-action report, or quarterly review into Confluence.', '/app/settings/connectors'],
  ['Review Connector Health', 'See configured connectors, last sync/publish, linked objects, and recent errors without leaving Vantage.', '/app/settings/connectors'],
  ['Generate Executive Scorecard', 'Persist a Pulse snapshot with explainable posture categories, deltas, and measured inputs.', workflowRoutes.pulseScorecard()],
  ['Build Risk Register', 'Normalize and maintain executive risks from findings, evidence gaps, overdue work, and manual input.', '/app/pulse/risks'],
  ['Generate 30/60/90 Roadmap', 'Turn current risk pressure into a reviewed remediation plan with owners, due dates, and expected impact.', workflowRoutes.pulseRoadmap()],
  ['Draft Board Brief', 'Translate posture and remediation trends into a persisted executive-ready brief.', workflowRoutes.pulseBoardBrief()],
  ['Prepare Quarterly Review', 'Assemble the recurring leadership review package from the current scorecard, roadmap, and board brief.', workflowRoutes.pulseQuarterlyReview()],
  ['Register AI Use Case', 'Create a durable AI use case record with typed data classes, approval state, and Pulse hooks.', workflowRoutes.aiUseCaseCreate()],
  ['Start AI Vendor Intake', 'Review vendor retention, training behavior, logging support, and approval conditions.', workflowRoutes.aiVendorIntakeCreate()],
  ['Map AI Policies', 'Surface matched policy templates, unmet requirements, and approval blockers.', workflowRoutes.aiUseCaseCreate('policy-mapping')],
  ['Review AI Governance Queue', 'Assign reviewers, set due dates, and work overdue AI decisions.', workflowRoutes.aiReviewQueue()],
  ['Generate AI Governance Summary', 'Open the operator dashboard for AI adoption, open reviews, and Pulse-linked risk pressure.', '/app/ai-governance'],
  ['Start Incident Triage', 'Create a durable incident record, first-hour checklist, decision log scaffold, and incident-linked runbook pack.', workflowRoutes.responseIncidentTriage()],
  ['Launch Runbook Pack', 'Generate phase-based incident tasks for triage, containment, communications, recovery, and follow-up.', workflowRoutes.runbookLauncher()],
  ['Update Incident Timeline', 'Capture durable incident events and decision points without mixing internal-only notes into shareable outputs.', workflowRoutes.responseIncidentTimeline()],
  ['Draft After-Action Report', 'Build a review-gated incident report from the incident record, timeline, tasks, findings, and risks.', workflowRoutes.responseAfterAction()],
  ['Prepare Tabletop Exercise', 'Create a lightweight exercise with scenario prompts, gap capture, and follow-up generation.', workflowRoutes.responseTabletop()]
] as const;

export default async function ToolsHubPage() {
  const session = await getPageSessionContext();
  const [entitlements, demoPath, adoptionMode, workspace, trialOnboarding] = await Promise.all([
    getTenantEntitlements(session.tenantId),
    getTenantDemoPathViewModel(session.tenantId),
    getTenantAdoptionModeViewModel(session.tenantId),
    getTenantWorkspaceContext(session.tenantId),
    getTenantTrialOnboarding(session.tenantId)
  ]);

  const visibleSupportingTools = workspace.isTrial
    ? supportingTools.filter((tool) => !['adoption', 'connectors'].includes(tool.id))
    : supportingTools;
  const demoRestrictedToolIds = new Set(['connectors']);
  const visibleSupportingToolsForWorkspace = workspace.isDemo
    ? visibleSupportingTools.filter((tool) => !demoRestrictedToolIds.has(tool.id))
    : visibleSupportingTools;
  const visibleWorkflowCards = workspace.isTrial
    ? workflowCards.filter((workflow) => !['Integration Pack Flow', 'Adoption Mode Flow'].includes(workflow.title))
    : workflowCards;
  const visibleGuidedSkills = workspace.isTrial
    ? guidedSkills.filter(
        ([title, , href]) =>
          !href.startsWith('/app/adoption') &&
          ![
            'Configure Connectors',
            'Send to Slack',
            'Sync to Jira',
            'Publish to Docs',
            'Review Connector Health'
          ].includes(title)
      )
    : guidedSkills;
  const demoRestrictedGuidedSkills = new Set([
    'Configure Connectors',
    'Send to Slack',
    'Sync to Jira',
    'Publish to Docs',
    'Review Connector Health'
  ]);
  const visibleGuidedSkillsForWorkspace = workspace.isDemo
    ? visibleGuidedSkills.filter(([title]) => !demoRestrictedGuidedSkills.has(title))
    : visibleGuidedSkills;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tools Hub"
        helpKey={workspace.isTrial ? undefined : 'toolsHub'}
        description={
          workspace.isTrial
            ? 'Open the shortest path into the first real workflows that make this blank workspace useful: TrustOps, Pulse, AI Governance, Response Ops, evidence, and policy work.'
            : 'Launch the VantageCISO operating layer by job to be done: TrustOps for buyer diligence, Pulse for executive cadence, AI Governance for governed adoption, Response Ops for incident execution, and Adoption Mode for working with your existing stack.'
        }
        primaryAction={{
          label: workspace.isDemo ? 'Start Demo Story' : 'Open Command Center',
          href: workspace.isDemo ? '/app/trust/inbox' : '/app/command-center'
        }}
        secondaryActions={[
          ...(workspace.isDemo ? [{ label: 'Command Center', href: '/app/command-center', variant: 'outline' as const }] : []),
          ...(!workspace.isTrial ? [{ label: 'Adoption Mode', href: '/app/adoption', variant: 'outline' as const }] : []),
          { label: 'Pulse', href: '/app/pulse', variant: 'outline' },
          { label: 'AI Governance', href: '/app/ai-governance', variant: 'outline' },
          { label: 'Response Ops', href: '/app/response-ops', variant: 'outline' },
          { label: 'TrustOps', href: '/app/trust', variant: 'outline' },
          ...(!workspace.isTrial && !workspace.isDemo
            ? [{ label: 'Connectors', href: '/app/settings/connectors', variant: 'outline' as const }]
            : []),
          ...(!workspace.isTrial && !workspace.isDemo
            ? [{ label: 'Billing & Packaging', href: '/app/settings/billing', variant: 'outline' as const }]
            : [])
        ]}
      >
        <p className="text-xs text-muted-foreground">
          {workspace.isTrial
            ? `14-day full-access trial${workspace.trialDaysRemaining !== null ? ` | ${workspace.trialDaysRemaining} day${workspace.trialDaysRemaining === 1 ? '' : 's'} remaining` : ''} | Use this page to open the right workflow and build the first durable records in your blank workspace.`
            : workspace.isDemo
              ? 'Demo-unlocked workspace | Premium modules, AI workflows, and export paths are visible for evaluation, so every launcher can open a real workflow instead of a gated dead end.'
              : `Current plan: ${formatPlanLabel(entitlements.plan)} | Use this page to open the right module, show where to start, and explain how Vantage works alongside the rest of the stack.`}
        </p>
      </PageHeader>

      {workspace.isTrial ? (
        <TrialOnboardingCard
          trialDaysRemaining={workspace.trialDaysRemaining}
          trialEndsAt={workspace.trialEndsAt?.toISOString() ?? null}
          completedCount={trialOnboarding.completedCount}
          totalCount={trialOnboarding.totalCount}
          items={trialOnboarding.items}
        />
      ) : null}

      {workspace.isDemo ? <DemoPathCard demoPath={demoPath} compact /> : null}

      {!workspace.isTrial ? (
        <Card>
          <CardHeader>
            <CardTitle>Operating Layer / Adoption Story</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-md border border-border p-3">
              <p className="text-sm font-semibold">Start with the urgent job</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Questionnaire response, board brief, AI review, incident, or stack-fit conversation.
              </p>
            </div>
            <div className="rounded-md border border-border p-3">
              <p className="text-sm font-semibold">Import what already exists</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {adoptionMode.metrics.importCount} adoption import{adoptionMode.metrics.importCount === 1 ? '' : 's'} recorded so far.
              </p>
            </div>
            <div className="rounded-md border border-border p-3">
              <p className="text-sm font-semibold">Keep the existing stack</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {adoptionMode.metrics.connectorCount} connector{adoptionMode.metrics.connectorCount === 1 ? '' : 's'} can keep Slack, Jira, and publishing in the loop.
              </p>
            </div>
            <div className="rounded-md border border-border p-3">
              <p className="text-sm font-semibold">Show the carry-over</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Move trust work into evidence, findings, risks, roadmap, board reporting, and response follow-up.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers3 className="h-4 w-4" />
            Suite Modules
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {MODULE_CATALOG.map((module) => {
            const commercialState = getModuleCommercialState(entitlements.plan, module, {
              workspaceMode: workspace.workspaceMode,
              isTrialActive: workspace.isTrialActive
            });
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
                  {!commercialState.included && !workspace.isDemo ? (
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
        {visibleSupportingToolsForWorkspace.map((tool) => (
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
          {visibleWorkflowCards.map((workflow) => (
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
          {visibleGuidedSkillsForWorkspace.map(([title, description, href]) => (
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


