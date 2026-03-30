import type { PlanTier, WorkspaceMode } from '@prisma/client';

export type CommercialModuleId = 'trustops' | 'pulse' | 'ai-governance' | 'response-ops';

const PLAN_ORDER: Record<PlanTier, number> = {
  FREE: 0,
  STARTER: 1,
  PRO: 2,
  BUSINESS: 3,
  ENTERPRISE: 4
};

const MODULE_MIN_PLAN: Record<CommercialModuleId, PlanTier> = {
  trustops: 'STARTER',
  pulse: 'PRO',
  'ai-governance': 'BUSINESS',
  'response-ops': 'ENTERPRISE'
};

const MODULE_PATH_PREFIXES: Array<{ moduleId: CommercialModuleId; prefixes: string[] }> = [
  {
    moduleId: 'trustops',
    prefixes: ['/app/trust', '/app/questionnaires', '/api/trust', '/api/questionnaires', '/api/answer-library', '/api/evidence-maps']
  },
  {
    moduleId: 'pulse',
    prefixes: ['/app/pulse', '/api/pulse']
  },
  {
    moduleId: 'ai-governance',
    prefixes: ['/app/ai-governance', '/api/ai-governance']
  },
  {
    moduleId: 'response-ops',
    prefixes: ['/app/response-ops', '/api/response-ops']
  }
];

export function getModuleRequirement(pathname: string): CommercialModuleId | null {
  for (const entry of MODULE_PATH_PREFIXES) {
    if (entry.prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
      return entry.moduleId;
    }
  }
  return null;
}

export function canAccessModule(args: {
  moduleId: CommercialModuleId;
  plan: PlanTier;
  workspaceMode?: WorkspaceMode | null;
}) {
  if (args.workspaceMode === 'DEMO' || args.workspaceMode === 'TRIAL') return true;
  const requiredPlan = MODULE_MIN_PLAN[args.moduleId];
  return PLAN_ORDER[args.plan] >= PLAN_ORDER[requiredPlan];
}

