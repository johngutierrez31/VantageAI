import { TrialStatus, WorkspaceMode, type Tenant } from '@prisma/client';
import { differenceInCalendarDays } from 'date-fns';
import { prisma } from '@/lib/db/prisma';

type TenantWorkspaceFields = Pick<
  Tenant,
  'id' | 'name' | 'slug' | 'workspaceMode' | 'trialStatus' | 'trialStartedAt' | 'trialEndsAt'
>;

export type TenantWorkspaceContext = {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  workspaceMode: WorkspaceMode;
  trialStatus: TrialStatus;
  trialStartedAt: Date | null;
  trialEndsAt: Date | null;
  isDemo: boolean;
  isTrial: boolean;
  isPaid: boolean;
  isTrialActive: boolean;
  isTrialExpired: boolean;
  trialDaysRemaining: number | null;
};

export function getTrialEndDate(startedAt: Date, trialDays = 14) {
  const endsAt = new Date(startedAt);
  endsAt.setUTCDate(endsAt.getUTCDate() + trialDays);
  return endsAt;
}

export function formatWorkspaceModeLabel(mode: WorkspaceMode) {
  switch (mode) {
    case 'DEMO':
      return 'Demo';
    case 'TRIAL':
      return 'Trial';
    case 'PAID':
    default:
      return 'Paid';
  }
}

export function buildWorkspaceContext(tenant: TenantWorkspaceFields, now = new Date()): TenantWorkspaceContext {
  const trialEndsAt = tenant.trialEndsAt ?? null;
  const trialStartedAt = tenant.trialStartedAt ?? null;
  const isTrial = tenant.workspaceMode === 'TRIAL';
  const isDemo = tenant.workspaceMode === 'DEMO';
  const isPaid = tenant.workspaceMode === 'PAID';
  const isTrialExpired = Boolean(isTrial && trialEndsAt && trialEndsAt.getTime() < now.getTime());
  const isTrialActive = Boolean(
    isTrial &&
      tenant.trialStatus === 'ACTIVE' &&
      trialStartedAt &&
      trialEndsAt &&
      trialEndsAt.getTime() >= now.getTime()
  );

  return {
    tenantId: tenant.id,
    tenantName: tenant.name,
    tenantSlug: tenant.slug,
    workspaceMode: tenant.workspaceMode,
    trialStatus: tenant.trialStatus,
    trialStartedAt,
    trialEndsAt,
    isDemo,
    isTrial,
    isPaid,
    isTrialActive,
    isTrialExpired,
    trialDaysRemaining:
      isTrial && trialEndsAt ? Math.max(0, differenceInCalendarDays(trialEndsAt, now)) : null
  };
}

export async function getTenantWorkspaceContext(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      name: true,
      slug: true,
      workspaceMode: true,
      trialStatus: true,
      trialStartedAt: true,
      trialEndsAt: true
    }
  });

  if (!tenant) {
    throw new Error(`Tenant ${tenantId} was not found`);
  }

  return buildWorkspaceContext(tenant);
}
