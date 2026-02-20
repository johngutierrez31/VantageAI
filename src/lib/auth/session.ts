import { headers } from 'next/headers';

export type SessionContext = {
  userId: string;
  tenantId: string;
  role: 'ADMIN' | 'ANALYST' | 'VIEWER' | 'CLIENT_VIEWER';
};

const DEMO_USER_ID = 'user_demo_admin';
const DEMO_TENANT_ID = 'tenant_demo';

export async function getSessionContext(): Promise<SessionContext> {
  const h = headers();
  return {
    userId: h.get('x-user-id') ?? DEMO_USER_ID,
    tenantId: h.get('x-tenant-id') ?? DEMO_TENANT_ID,
    role: (h.get('x-role') as SessionContext['role']) ?? 'ADMIN'
  };
}
