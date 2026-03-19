import { MembershipStatus, TenantRole } from '@prisma/client';
import { cookies } from 'next/headers';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db/prisma';
import { getDemoTenantSlug, getDemoUserEmail, isDemoModeEnabled } from '@/lib/auth/demo';

const ACTIVE_TENANT_COOKIE = 'vantage_active_tenant';

export type SessionContext = {
  userId: string;
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  role: TenantRole;
  memberships: Array<{
    tenantId: string;
    tenantSlug: string;
    tenantName: string;
    role: TenantRole;
  }>;
};

export class SessionContextError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'SessionContextError';
    this.statusCode = statusCode;
  }
}

async function buildDemoSessionContext(): Promise<SessionContext> {
  const configuredEmail = getDemoUserEmail();
  const fallbackEmail = 'morgan.hale@astera.example';
  const candidateEmails = Array.from(new Set([configuredEmail, fallbackEmail].filter(Boolean)));
  const preferredTenantSlug = getDemoTenantSlug();

  const demoUsers = await prisma.user.findMany({
    where: { email: { in: candidateEmails } },
    select: {
      id: true,
      email: true,
      memberships: {
        where: { status: MembershipStatus.ACTIVE },
        include: {
          tenant: {
            select: { id: true, slug: true, name: true }
          }
        },
        orderBy: { createdAt: 'asc' }
      }
    }
  });
  const user =
    candidateEmails
      .map((email) => demoUsers.find((entry) => entry.email === email))
      .find(Boolean) ?? null;

  if (!user) {
    throw new Error(`Demo mode is enabled, but no configured demo user was found for ${candidateEmails.join(', ')}.`);
  }

  if (!user.memberships.length) {
    throw new Error(`Demo mode user "${user.email}" does not have an active tenant membership.`);
  }

  const activeMembership = preferredTenantSlug
    ? user.memberships.find((membership) => membership.tenant.slug === preferredTenantSlug)
    : user.memberships[0];

  if (!activeMembership) {
    throw new Error(
      `Demo mode tenant slug "${preferredTenantSlug}" was not found for user "${user.email}".`
    );
  }

  return {
    userId: user.id,
    tenantId: activeMembership.tenantId,
    tenantSlug: activeMembership.tenant.slug,
    tenantName: activeMembership.tenant.name,
    role: activeMembership.role,
    memberships: user.memberships.map((membership) => ({
      tenantId: membership.tenantId,
      tenantSlug: membership.tenant.slug,
      tenantName: membership.tenant.name,
      role: membership.role
    }))
  };
}

export async function getSessionContext(): Promise<SessionContext> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    if (isDemoModeEnabled()) {
      return buildDemoSessionContext();
    }

    throw new SessionContextError('Unauthorized', 401);
  }

  if (!session.user.activeTenantId || !session.user.role || !session.user.activeTenantSlug || !session.user.activeTenantName) {
    throw new SessionContextError('Forbidden: no active tenant membership', 403);
  }

  const memberships = session.user.memberships ?? [];
  const cookieTenantId = cookies().get(ACTIVE_TENANT_COOKIE)?.value;
  const activeFromCookie = cookieTenantId ? memberships.find((membership) => membership.tenantId === cookieTenantId) : null;
  const activeFromSession = memberships.find((membership) => membership.tenantId === session.user.activeTenantId);
  const activeMembership = activeFromCookie ?? activeFromSession ?? memberships[0];

  if (!activeMembership) {
    throw new SessionContextError('Forbidden: no active tenant membership', 403);
  }

  return {
    userId: session.user.id,
    tenantId: activeMembership.tenantId,
    tenantSlug: activeMembership.tenantSlug,
    tenantName: activeMembership.tenantName,
    role: activeMembership.role,
    memberships
  };
}
