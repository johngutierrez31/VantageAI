export type CommercialPlanTier = 'FREE' | 'STARTER' | 'PRO' | 'BUSINESS' | 'ENTERPRISE';

export type ModuleDefinition = {
  id: 'trustops' | 'pulse' | 'ai-governance' | 'response-ops';
  label: string;
  href: string;
  categoryLabel: string;
  summary: string;
  startLabel: string;
  startHref: string;
  includedFrom: CommercialPlanTier;
  premiumLabel: string;
  outcomes: string[];
};

export const MODULE_CATALOG: ModuleDefinition[] = [
  {
    id: 'trustops',
    label: 'TrustOps',
    href: '/app/trust',
    categoryLabel: 'Buyer Diligence Layer',
    summary: 'Run questionnaires, evidence maps, approved answers, trust packets, and buyer-safe sharing without losing internal review control.',
    startLabel: 'Start With TrustOps',
    startHref: '/app/trust',
    includedFrom: 'STARTER',
    premiumLabel: 'Operating layer for buyer readiness',
    outcomes: ['Shorten questionnaire turnaround', 'Prove buyer readiness', 'Reuse approved answers and evidence']
  },
  {
    id: 'pulse',
    label: 'Pulse',
    href: '/app/pulse',
    categoryLabel: 'Executive Risk Layer',
    summary: 'Translate live trust, finding, incident, and AI signals into a scorecard, risk register, roadmap, board brief, and quarterly review.',
    startLabel: 'Start With Pulse',
    startHref: '/app/pulse',
    includedFrom: 'PRO',
    premiumLabel: 'Recurring executive operating cadence',
    outcomes: ['Give leadership one posture view', 'Track a living risk register', 'Run a board-ready quarterly cadence']
  },
  {
    id: 'ai-governance',
    label: 'AI Governance',
    href: '/app/ai-governance',
    categoryLabel: 'Governed AI Layer',
    summary: 'Register AI use cases, review vendors, map policies, and push AI decisions into findings and Pulse without losing auditability.',
    startLabel: 'Start With AI Governance',
    startHref: '/app/ai-governance',
    includedFrom: 'BUSINESS',
    premiumLabel: 'Governed AI adoption workflow',
    outcomes: ['Govern AI adoption with durable approvals', 'Map policies and data classes', 'Push AI decisions into findings and risks']
  },
  {
    id: 'response-ops',
    label: 'Response Ops',
    href: '/app/response-ops',
    categoryLabel: 'Incident Execution Layer',
    summary: 'Run first-hour triage, task packs, after-action reviews, and tabletop follow-up while keeping incident carry-over visible in Pulse.',
    startLabel: 'Start With Response Ops',
    startHref: '/app/response-ops',
    includedFrom: 'ENTERPRISE',
    premiumLabel: 'Operational incident workflow',
    outcomes: ['Run first-hour triage', 'Capture a durable decision trail', 'Turn incidents into follow-up remediation']
  }
];

const PLAN_ORDER: Record<CommercialPlanTier, number> = {
  FREE: 0,
  STARTER: 1,
  PRO: 2,
  BUSINESS: 3,
  ENTERPRISE: 4
};

export function formatPlanLabel(plan: CommercialPlanTier) {
  return plan.charAt(0) + plan.slice(1).toLowerCase();
}

export function planIncludesModule(plan: CommercialPlanTier, module: ModuleDefinition) {
  return PLAN_ORDER[plan] >= PLAN_ORDER[module.includedFrom];
}

export function getModuleCommercialState(
  plan: CommercialPlanTier,
  module: ModuleDefinition,
  options?: {
    workspaceMode?: 'DEMO' | 'TRIAL' | 'PAID';
    isTrialActive?: boolean;
  }
) {
  if (options?.workspaceMode === 'DEMO') {
    return {
      included: true,
      badge: 'Visible in demo',
      helperText: `${module.premiumLabel}. Demo workspaces keep premium modules, AI workflows, and exports visible for evaluation without showing contradictory lockouts.`,
      upgradeCtaLabel: 'Open module'
    };
  }

  if (options?.workspaceMode === 'TRIAL' && options.isTrialActive) {
    return {
      included: true,
      badge: 'Included in 14-day trial',
      helperText: `${module.premiumLabel}. Use this module now to create durable records and evaluate the full suite in a blank workspace.`,
      upgradeCtaLabel: 'Open module'
    };
  }

  const included = planIncludesModule(plan, module);
  return {
    included,
    badge: included ? `Included in ${formatPlanLabel(plan)}` : `Packaging target: ${formatPlanLabel(module.includedFrom)}`,
    helperText: included
      ? `${module.premiumLabel}. Use this module alongside your existing systems and let Vantage carry the outputs across the suite.`
      : `${module.premiumLabel}. You can still explain the workflow now and align packaging before rollout.`,
    upgradeCtaLabel: included ? 'View module workflow' : `Review ${formatPlanLabel(module.includedFrom)} packaging`
  };
}
