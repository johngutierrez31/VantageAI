import { describe, expect, it } from 'vitest';
import { buildWorkspaceContext, formatWorkspaceModeLabel, getTrialEndDate } from '@/lib/workspace-mode';

describe('workspace mode helpers', () => {
  it('marks an active trial with days remaining', () => {
    const startedAt = new Date('2026-03-01T00:00:00.000Z');
    const endsAt = getTrialEndDate(startedAt, 14);

    const context = buildWorkspaceContext(
      {
        id: 'tenant_trial',
        name: 'Trial Workspace',
        slug: 'trial-workspace',
        workspaceMode: 'TRIAL',
        trialStatus: 'ACTIVE',
        trialStartedAt: startedAt,
        trialEndsAt: endsAt
      } as const,
      new Date('2026-03-05T00:00:00.000Z')
    );

    expect(context.isTrial).toBe(true);
    expect(context.isTrialActive).toBe(true);
    expect(context.isDemo).toBe(false);
    expect(context.trialDaysRemaining).toBe(10);
  });

  it('marks a demo workspace separately from trial and paid', () => {
    const context = buildWorkspaceContext(
      {
        id: 'tenant_demo',
        name: 'Demo Workspace',
        slug: 'demo-workspace',
        workspaceMode: 'DEMO',
        trialStatus: 'NOT_STARTED',
        trialStartedAt: null,
        trialEndsAt: null
      } as const,
      new Date('2026-03-05T00:00:00.000Z')
    );

    expect(context.isDemo).toBe(true);
    expect(context.isTrial).toBe(false);
    expect(context.isPaid).toBe(false);
    expect(formatWorkspaceModeLabel(context.workspaceMode)).toBe('Demo');
  });

  it('marks an expired trial correctly', () => {
    const context = buildWorkspaceContext(
      {
        id: 'tenant_trial_expired',
        name: 'Expired Trial',
        slug: 'expired-trial',
        workspaceMode: 'TRIAL',
        trialStatus: 'ACTIVE',
        trialStartedAt: new Date('2026-02-01T00:00:00.000Z'),
        trialEndsAt: new Date('2026-02-15T00:00:00.000Z')
      } as const,
      new Date('2026-03-05T00:00:00.000Z')
    );

    expect(context.isTrial).toBe(true);
    expect(context.isTrialActive).toBe(false);
    expect(context.isTrialExpired).toBe(true);
    expect(context.trialDaysRemaining).toBe(0);
  });
});
