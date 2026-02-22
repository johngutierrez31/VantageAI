import { TenantRole } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';

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

export async function getSessionContext(): Promise<SessionContext> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new SessionContextError('Unauthorized', 401);
  }

  if (!session.user.activeTenantId || !session.user.role || !session.user.activeTenantSlug || !session.user.activeTenantName) {
    throw new SessionContextError('Forbidden: no active tenant membership', 403);
  }

  return {
    userId: session.user.id,
    tenantId: session.user.activeTenantId,
    tenantSlug: session.user.activeTenantSlug,
    tenantName: session.user.activeTenantName,
    role: session.user.role,
    memberships: session.user.memberships
  };
}
