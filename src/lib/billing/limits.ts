import { PlanTier } from '@prisma/client';

export type PlanLimits = {
  maxTemplates: number;
  maxAssessmentsPerMonth: number;
  canExportPdf: boolean;
  canUseAI: boolean;
};

const limitsByPlan: Record<PlanTier, PlanLimits> = {
  STARTER: { maxTemplates: 5, maxAssessmentsPerMonth: 20, canExportPdf: true, canUseAI: false },
  PRO: { maxTemplates: 25, maxAssessmentsPerMonth: 100, canExportPdf: true, canUseAI: true },
  PARTNER: { maxTemplates: 999, maxAssessmentsPerMonth: 9999, canExportPdf: true, canUseAI: true }
};

export function getLimitsForPlan(plan: PlanTier | null | undefined): PlanLimits {
  return limitsByPlan[plan ?? 'STARTER'];
}
