import { PlanTier } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { getLimitsForPlan, isBillingActive } from '@/lib/billing/limits';
import { getTenantWorkspaceContext } from '@/lib/workspace-mode';

export type TenantEntitlements = {
  plan: PlanTier;
  status: string;
  limits: ReturnType<typeof getLimitsForPlan>;
};

export async function getTenantEntitlements(tenantId: string): Promise<TenantEntitlements> {
  const [workspace, subscription] = await Promise.all([
    getTenantWorkspaceContext(tenantId),
    prisma.subscription.findFirst({
      where: { tenantId },
      orderBy: { updatedAt: 'desc' }
    })
  ]);

  if (workspace.isDemo) {
    return {
      plan: 'ENTERPRISE',
      status: 'demo_unlocked',
      limits: getLimitsForPlan('ENTERPRISE')
    };
  }

  if (workspace.isTrialActive) {
    return {
      plan: 'ENTERPRISE',
      status: 'trialing',
      limits: getLimitsForPlan('ENTERPRISE')
    };
  }

  if (!subscription) {
    return {
      plan: 'FREE',
      status: workspace.isTrialExpired ? 'trial_expired' : 'active',
      limits: getLimitsForPlan('FREE')
    };
  }

  const plan = subscription.plan ?? 'FREE';
  const status = subscription.status;

  if (workspace.isTrialExpired && status === 'trialing') {
    return {
      plan: 'FREE',
      status: 'trial_expired',
      limits: getLimitsForPlan('FREE')
    };
  }

  if (!isBillingActive(status)) {
    return {
      plan: 'FREE',
      status,
      limits: getLimitsForPlan('FREE')
    };
  }

  return {
    plan,
    status,
    limits: getLimitsForPlan(plan)
  };
}

export async function requireCopilotQuota(tenantId: string, requestedTokens: number) {
  const entitlements = await getTenantEntitlements(tenantId);
  return {
    ...entitlements,
    requestedTokens,
    usedTokens: 0,
    remainingTokens: Number.MAX_SAFE_INTEGER
  };
}

export async function requireAIAccess(tenantId: string) {
  return getTenantEntitlements(tenantId);
}

export async function requirePdfExportAccess(tenantId: string) {
  const entitlements = await getTenantEntitlements(tenantId);
  if (!entitlements.limits.canExportPdf) throw new Error('Forbidden: PDF export requires a higher subscription plan');
  return entitlements;
}

export async function requireQuestionnaireImportAccess(tenantId: string) {
  const entitlements = await getTenantEntitlements(tenantId);
  if (!entitlements.limits.canImportQuestionnaire) {
    throw new Error('Forbidden: Questionnaire import requires a higher subscription plan');
  }
  return entitlements;
}

export async function requireBrandedReportAccess(tenantId: string) {
  const entitlements = await getTenantEntitlements(tenantId);
  if (!entitlements.limits.canGenerateBrandedReport) {
    throw new Error('Forbidden: Report generation requires a higher subscription plan');
  }
  return entitlements;
}
