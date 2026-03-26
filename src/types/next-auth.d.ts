import { TenantRole, WorkspaceMode } from '@prisma/client';
import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: DefaultSession['user'] & {
      id: string;
      role: TenantRole | null;
      activeTenantId: string | null;
      activeTenantSlug: string | null;
      activeTenantName: string | null;
      activeTenantWorkspaceMode: WorkspaceMode | null;
      memberships: Array<{
        tenantId: string;
        tenantSlug: string;
        tenantName: string;
        role: TenantRole;
        workspaceMode: WorkspaceMode;
      }>;
    };
    activeTenantId?: string | null;
  }

  interface User {
    id: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: TenantRole;
    activeTenantId?: string;
    activeTenantSlug?: string;
    activeTenantName?: string;
    activeTenantWorkspaceMode?: WorkspaceMode;
    memberships?: Array<{
      tenantId: string;
      tenantSlug: string;
      tenantName: string;
      role: TenantRole;
      workspaceMode: WorkspaceMode;
    }>;
  }
}
