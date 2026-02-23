import { PlanTier } from '@prisma/client';

export type PlanLimits = {
  maxTemplates: number;
  maxAssessmentsPerMonth: number;
  maxEvidenceItems: number;
  canExportPdf: boolean;
  canUseAI: boolean;
  canImportQuestionnaire: boolean;
  canGenerateBrandedReport: boolean;
};

const limitsByPlan: Record<PlanTier, PlanLimits> = {
  STARTER: {
    maxTemplates: 5,
    maxAssessmentsPerMonth: 20,
    maxEvidenceItems: 100,
    canExportPdf: true,
    canUseAI: true,
    canImportQuestionnaire: true,
    canGenerateBrandedReport: true
  },
  PRO: {
    maxTemplates: 25,
    maxAssessmentsPerMonth: 100,
    maxEvidenceItems: 500,
    canExportPdf: true,
    canUseAI: true,
    canImportQuestionnaire: true,
    canGenerateBrandedReport: true
  },
  PARTNER: {
    maxTemplates: 999,
    maxAssessmentsPerMonth: 9999,
    maxEvidenceItems: 10000,
    canExportPdf: true,
    canUseAI: true,
    canImportQuestionnaire: true,
    canGenerateBrandedReport: true
  }
};

export function getLimitsForPlan(plan: PlanTier | null | undefined): PlanLimits {
  return limitsByPlan[plan ?? 'STARTER'];
}

export function isBillingActive(status: string | null | undefined) {
  if (!status) return false;
  return ['active', 'trialing', 'past_due'].includes(status);
}
