import { beforeEach, describe, expect, it, vi } from 'vitest';

const { subscriptionFindFirstMock, getTenantWorkspaceContextMock } = vi.hoisted(() => ({
  subscriptionFindFirstMock: vi.fn(),
  getTenantWorkspaceContextMock: vi.fn()
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    subscription: {
      findFirst: subscriptionFindFirstMock
    },
    auditLog: {
      findMany: vi.fn()
    }
  }
}));

vi.mock('@/lib/workspace-mode', () => ({
  getTenantWorkspaceContext: getTenantWorkspaceContextMock
}));

import { getTenantEntitlements } from '@/lib/billing/entitlements';

describe('trial entitlements', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('grants active trial workspaces full enterprise access', async () => {
    getTenantWorkspaceContextMock.mockResolvedValue({
      workspaceMode: 'TRIAL',
      isTrialActive: true,
      isTrialExpired: false
    });
    subscriptionFindFirstMock.mockResolvedValue(null);

    const entitlements = await getTenantEntitlements('tenant_trial');

    expect(entitlements.plan).toBe('ENTERPRISE');
    expect(entitlements.status).toBe('trialing');
    expect(entitlements.limits.canUseAI).toBe(true);
    expect(entitlements.limits.canExportPdf).toBe(true);
  });

  it('falls back to a non-trial free state when a trial has expired', async () => {
    getTenantWorkspaceContextMock.mockResolvedValue({
      workspaceMode: 'TRIAL',
      isTrialActive: false,
      isTrialExpired: true
    });
    subscriptionFindFirstMock.mockResolvedValue({
      plan: 'ENTERPRISE',
      status: 'trialing'
    });

    const entitlements = await getTenantEntitlements('tenant_trial_expired');

    expect(entitlements.plan).toBe('FREE');
    expect(entitlements.status).toBe('trial_expired');
    expect(entitlements.limits.copilotTokensPerDay).toBe(5000);
    expect(entitlements.limits.auditExport).toBe(false);
  });

  it('preserves standard paid-plan billing behavior for non-trial workspaces', async () => {
    getTenantWorkspaceContextMock.mockResolvedValue({
      workspaceMode: 'PAID',
      isTrialActive: false,
      isTrialExpired: false
    });
    subscriptionFindFirstMock.mockResolvedValue({
      plan: 'BUSINESS',
      status: 'active'
    });

    const entitlements = await getTenantEntitlements('tenant_paid');

    expect(entitlements.plan).toBe('BUSINESS');
    expect(entitlements.status).toBe('active');
    expect(entitlements.limits.canUseAI).toBe(true);
  });
});
