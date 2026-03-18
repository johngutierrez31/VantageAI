import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MembershipStatus, PlanTier, TrialStatus, WorkspaceMode } from '@prisma/client';

const { prismaMock, writeAuditLogMock } = vi.hoisted(() => ({
  prismaMock: {
    tenant: {
      findUnique: vi.fn()
    },
    user: {
      upsert: vi.fn()
    },
    $transaction: vi.fn()
  },
  writeAuditLogMock: vi.fn()
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: prismaMock
}));

vi.mock('@/lib/audit', () => ({
  writeAuditLog: writeAuditLogMock
}));

import { provisionWorkspace } from '@/lib/tenants/provision';

describe('trial workspace provisioning', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.tenant.findUnique.mockResolvedValue(null);
    prismaMock.user.upsert.mockResolvedValue({
      id: 'user_trial_owner',
      email: 'owner@acme.test',
      name: 'Owner'
    });
  });

  it('creates a brand-new trial workspace with full-access trial subscription metadata', async () => {
    const tenantCreate = vi.fn().mockResolvedValue({
      id: 'tenant_trial',
      name: 'Acme Security',
      slug: 'acme-security',
      workspaceMode: WorkspaceMode.TRIAL,
      trialStatus: TrialStatus.ACTIVE,
      trialStartedAt: new Date('2026-03-17T12:00:00.000Z'),
      trialEndsAt: new Date('2026-03-31T12:00:00.000Z')
    });
    const membershipCreate = vi.fn().mockResolvedValue({
      id: 'membership_trial',
      tenantId: 'tenant_trial',
      userId: 'user_trial_owner',
      role: 'OWNER',
      status: MembershipStatus.ACTIVE
    });
    const tenantBrandingCreate = vi.fn().mockResolvedValue({
      id: 'branding_trial',
      tenantId: 'tenant_trial',
      companyName: 'Acme Security'
    });
    const subscriptionCreate = vi.fn().mockResolvedValue({
      id: 'subscription_trial',
      plan: PlanTier.ENTERPRISE,
      status: 'trialing',
      currentPeriodEnd: new Date('2026-03-31T12:00:00.000Z')
    });

    prismaMock.$transaction.mockImplementation(async (callback) =>
      callback({
        tenant: { create: tenantCreate },
        membership: { create: membershipCreate },
        tenantBranding: { create: tenantBrandingCreate },
        subscription: { create: subscriptionCreate }
      })
    );

    const result = await provisionWorkspace({
      name: 'Acme Security',
      ownerEmail: 'owner@acme.test',
      ownerName: 'Owner',
      mode: 'TRIAL'
    });

    expect(tenantCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Acme Security',
          slug: 'acme-security',
          workspaceMode: WorkspaceMode.TRIAL,
          trialStatus: TrialStatus.ACTIVE
        })
      })
    );
    expect(membershipCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: 'tenant_trial',
          userId: 'user_trial_owner',
          role: 'OWNER',
          status: MembershipStatus.ACTIVE
        })
      })
    );
    expect(subscriptionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: 'tenant_trial',
          plan: PlanTier.ENTERPRISE,
          status: 'trialing'
        })
      })
    );
    expect(writeAuditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant_trial',
        actorUserId: 'user_trial_owner',
        action: 'trial_workspace_provisioned',
        metadata: expect.objectContaining({
          workspaceMode: WorkspaceMode.TRIAL
        })
      })
    );
    expect(result.subscription).toMatchObject({
      plan: PlanTier.ENTERPRISE,
      status: 'trialing'
    });
  });

  it('keeps paid workspace provisioning separate from the trial path', async () => {
    const tenantCreate = vi.fn().mockResolvedValue({
      id: 'tenant_paid',
      name: 'Northbridge',
      slug: 'northbridge',
      workspaceMode: WorkspaceMode.PAID,
      trialStatus: TrialStatus.NOT_STARTED,
      trialStartedAt: null,
      trialEndsAt: null
    });
    const membershipCreate = vi.fn().mockResolvedValue({
      id: 'membership_paid',
      tenantId: 'tenant_paid',
      userId: 'user_trial_owner',
      role: 'OWNER',
      status: MembershipStatus.ACTIVE
    });
    const tenantBrandingCreate = vi.fn().mockResolvedValue({
      id: 'branding_paid',
      tenantId: 'tenant_paid',
      companyName: 'Northbridge'
    });
    const subscriptionCreate = vi.fn();

    prismaMock.$transaction.mockImplementation(async (callback) =>
      callback({
        tenant: { create: tenantCreate },
        membership: { create: membershipCreate },
        tenantBranding: { create: tenantBrandingCreate },
        subscription: { create: subscriptionCreate }
      })
    );

    const result = await provisionWorkspace({
      name: 'Northbridge',
      ownerEmail: 'owner@acme.test',
      mode: 'PAID'
    });

    expect(tenantCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          workspaceMode: WorkspaceMode.PAID,
          trialStatus: TrialStatus.NOT_STARTED,
          trialStartedAt: null,
          trialEndsAt: null
        })
      })
    );
    expect(subscriptionCreate).not.toHaveBeenCalled();
    expect(writeAuditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant_paid',
        action: 'create'
      })
    );
    expect(result.subscription).toBeNull();
  });
});
