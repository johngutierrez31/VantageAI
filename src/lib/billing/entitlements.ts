import { PlanTier } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { getLimitsForPlan, isBillingActive } from '@/lib/billing/limits';

export type TenantEntitlements = {
  plan: PlanTier;
  status: string;
  limits: ReturnType<typeof getLimitsForPlan>;
};

export async function getTenantEntitlements(tenantId: string): Promise<TenantEntitlements> {
  const subscription = await prisma.subscription.findFirst({
    where: { tenantId },
    orderBy: { updatedAt: 'desc' }
  });

  if (!subscription) {
    return {
      plan: 'STARTER',
      status: 'active',
      limits: getLimitsForPlan('STARTER')
    };
  }

  const plan = subscription.plan ?? 'STARTER';
  const status = subscription.status;

  if (!isBillingActive(status)) {
    return {
      plan: 'STARTER',
      status,
      limits: getLimitsForPlan('STARTER')
    };
  }

  return {
    plan,
    status,
    limits: getLimitsForPlan(plan)
  };
}

function fail(feature: string): never {
  throw new Error(`Forbidden: ${feature} requires a higher subscription plan`);
}

export async function requireAIAccess(tenantId: string) {
  const entitlements = await getTenantEntitlements(tenantId);
  if (!entitlements.limits.canUseAI) fail('AI workflows');
  return entitlements;
}

export async function requirePdfExportAccess(tenantId: string) {
  const entitlements = await getTenantEntitlements(tenantId);
  if (!entitlements.limits.canExportPdf) fail('PDF export');
  return entitlements;
}

export async function requireQuestionnaireImportAccess(tenantId: string) {
  const entitlements = await getTenantEntitlements(tenantId);
  if (!entitlements.limits.canImportQuestionnaire) fail('Questionnaire import');
  return entitlements;
}

export async function requireBrandedReportAccess(tenantId: string) {
  const entitlements = await getTenantEntitlements(tenantId);
  if (!entitlements.limits.canGenerateBrandedReport) fail('Report generation');
  return entitlements;
}
