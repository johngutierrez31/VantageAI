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
    categoryLabel: 'Flagship',
    summary: 'Buyer diligence workflows for questionnaires, evidence maps, answer reuse, and trust-packet packaging.',
    startLabel: 'Open TrustOps',
    startHref: '/app/trust',
    includedFrom: 'STARTER',
    premiumLabel: 'Core module',
    outcomes: ['Shorten questionnaire turnaround', 'Prove buyer readiness', 'Reuse approved answers and evidence']
  },
  {
    id: 'pulse',
    label: 'Pulse',
    href: '/app/pulse',
    categoryLabel: 'Executive Add-On',
    summary: 'Executive scorecards, living cyber risk register, 30/60/90 roadmap, board briefs, and quarterly review cadence.',
    startLabel: 'Open Pulse',
    startHref: '/app/pulse',
    includedFrom: 'PRO',
    premiumLabel: 'Recurring executive workflow',
    outcomes: ['Give leadership one posture view', 'Track a living risk register', 'Run a board-ready quarterly cadence']
  },
  {
    id: 'ai-governance',
    label: 'AI Governance',
    href: '/app/ai-governance',
    categoryLabel: 'Expansion Module',
    summary: 'AI use-case registry, vendor intake, policy mapping, approvals, and Pulse-linked AI risk oversight.',
    startLabel: 'Open AI Governance',
    startHref: '/app/ai-governance',
    includedFrom: 'BUSINESS',
    premiumLabel: 'Strategic expansion module',
    outcomes: ['Govern AI adoption with durable approvals', 'Map policies and data classes', 'Push AI decisions into findings and risks']
  },
  {
    id: 'response-ops',
    label: 'Response Ops',
    href: '/app/response-ops',
    categoryLabel: 'Premium Ops',
    summary: 'Incident triage, runbook task packs, after-action reviews, tabletop workflows, and operational carry-over into Pulse.',
    startLabel: 'Open Response Ops',
    startHref: '/app/response-ops',
    includedFrom: 'ENTERPRISE',
    premiumLabel: 'Premium response workflow',
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

export function getModuleCommercialState(plan: CommercialPlanTier, module: ModuleDefinition) {
  const included = planIncludesModule(plan, module);
  return {
    included,
    badge: included ? `Included in ${formatPlanLabel(plan)}` : `Packaging target: ${formatPlanLabel(module.includedFrom)}`,
    helperText: included
      ? `${module.premiumLabel}. Keep this workflow active to increase module value and recurring usage.`
      : `${module.premiumLabel}. Open the workflow now, and use billing settings to align packaging before launch.`,
    upgradeCtaLabel: included ? 'View module workflow' : `Review ${formatPlanLabel(module.includedFrom)} packaging`
  };
}
