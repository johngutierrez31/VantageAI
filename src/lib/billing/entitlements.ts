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
      plan: 'FREE',
      status: 'active',
      limits: getLimitsForPlan('FREE')
    };
  }

  const plan = subscription.plan ?? 'FREE';
  const status = subscription.status;

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

function fail(feature: string): never {
  throw new Error(`Forbidden: ${feature} requires a higher subscription plan`);
}

function asTokenCount(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return 0;
  return value;
}

function startOfUtcDay() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export async function requireCopilotQuota(tenantId: string, requestedTokens: number) {
  const entitlements = await getTenantEntitlements(tenantId);
  if (!entitlements.limits.canUseAI) fail('AI workflows');

  const todayStart = startOfUtcDay();
  const logs = await prisma.auditLog.findMany({
    where: {
      tenantId,
      action: {
        in: ['copilot_chat', 'questionnaire_draft']
      },
      createdAt: {
        gte: todayStart
      }
    },
    select: { metadata: true }
  });

  const usedTokens = logs.reduce((sum, entry) => {
    if (!entry.metadata || typeof entry.metadata !== 'object' || Array.isArray(entry.metadata)) return sum;
    return sum + asTokenCount((entry.metadata as Record<string, unknown>).aiTokens);
  }, 0);

  if (usedTokens + requestedTokens > entitlements.limits.copilotTokensPerDay) {
    throw new Error('Forbidden: AI daily token quota exceeded for current plan');
  }

  return {
    ...entitlements,
    usedTokens,
    remainingTokens: Math.max(0, entitlements.limits.copilotTokensPerDay - (usedTokens + requestedTokens))
  };
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
