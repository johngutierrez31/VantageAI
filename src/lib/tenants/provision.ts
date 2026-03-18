import { MembershipStatus, PlanTier, Prisma, TrialStatus, WorkspaceMode } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { writeAuditLog } from '@/lib/audit';
import { getTrialEndDate } from '@/lib/workspace-mode';

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

async function findAvailableSlug(baseSlug: string) {
  let slug = baseSlug || `workspace-${Date.now()}`;
  let suffix = 1;

  while (true) {
    const exists = await prisma.tenant.findUnique({ where: { slug } });
    if (!exists) return slug;
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }
}

type WorkspaceModeRequest = 'PAID' | 'TRIAL';

type ProvisionWorkspaceArgs = {
  name: string;
  slug?: string;
  ownerEmail: string;
  ownerName?: string | null;
  mode?: WorkspaceModeRequest;
  trialDays?: number;
};

export async function findUserWithActiveMemberships(email: string) {
  return prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      memberships: {
        where: { status: MembershipStatus.ACTIVE },
        select: {
          tenantId: true,
          role: true,
          tenant: {
            select: {
              id: true,
              name: true,
              slug: true,
              workspaceMode: true
            }
          }
        }
      }
    }
  });
}

export async function provisionWorkspace(args: ProvisionWorkspaceArgs) {
  const mode = args.mode ?? 'PAID';
  const trialDays = args.trialDays ?? 14;
  const rawSlug = args.slug ?? slugify(args.name);
  const slug = await findAvailableSlug(rawSlug);
  const startedAt = new Date();
  const endsAt = mode === 'TRIAL' ? getTrialEndDate(startedAt, trialDays) : null;

  const user = await prisma.user.upsert({
    where: { email: args.ownerEmail },
    update: {
      name: args.ownerName ?? undefined,
      emailVerified: new Date()
    },
    create: {
      email: args.ownerEmail,
      name: args.ownerName ?? null,
      emailVerified: new Date()
    }
  });

  const created = await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: {
        name: args.name,
        slug,
        workspaceMode: mode === 'TRIAL' ? WorkspaceMode.TRIAL : WorkspaceMode.PAID,
        trialStatus: mode === 'TRIAL' ? TrialStatus.ACTIVE : TrialStatus.NOT_STARTED,
        trialStartedAt: mode === 'TRIAL' ? startedAt : null,
        trialEndsAt: endsAt
      }
    });

    const membership = await tx.membership.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
        role: 'OWNER',
        status: MembershipStatus.ACTIVE
      }
    });

    await tx.tenantBranding.create({
      data: {
        tenantId: tenant.id,
        companyName: args.name
      }
    });

    let subscription: { id: string; plan: PlanTier; status: string; currentPeriodEnd: Date | null } | null = null;

    if (mode === 'TRIAL') {
      subscription = await tx.subscription.create({
        data: {
          tenantId: tenant.id,
          plan: PlanTier.ENTERPRISE,
          status: 'trialing',
          currentPeriodStart: startedAt,
          currentPeriodEnd: endsAt
        },
        select: {
          id: true,
          plan: true,
          status: true,
          currentPeriodEnd: true
        }
      });
    }

    return { tenant, membership, subscription };
  });

  await writeAuditLog({
    tenantId: created.tenant.id,
    actorUserId: user.id,
    entityType: 'tenant',
    entityId: created.tenant.id,
    action: mode === 'TRIAL' ? 'trial_workspace_provisioned' : 'create',
    metadata: {
      slug: created.tenant.slug,
      membershipRole: created.membership.role,
      workspaceMode: created.tenant.workspaceMode,
      trialEndsAt: created.tenant.trialEndsAt?.toISOString() ?? null
    } as Prisma.JsonObject
  });

  return {
    tenant: created.tenant,
    membership: created.membership,
    subscription: created.subscription,
    user
  };
}
