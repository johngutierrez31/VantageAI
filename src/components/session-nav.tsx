'use client';

import Link from 'next/link';
import { signOut } from 'next-auth/react';

type Membership = {
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  role: string;
};

type Props = {
  isAuthenticated: boolean;
  activeTenantName?: string | null;
  role?: string | null;
  memberships?: Membership[];
};

export function SessionNav({ isAuthenticated, activeTenantName, role, memberships = [] }: Props) {
  if (!isAuthenticated) {
    return (
      <nav className="card" style={{ display: 'flex', gap: 16, justifyContent: 'space-between' }}>
        <div>VantageAI</div>
        <Link href="/login">Sign in</Link>
      </nav>
    );
  }

  return (
    <nav className="card" style={{ display: 'flex', gap: 16, justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ display: 'flex', gap: 16 }}>
        <Link href="/app/templates">Templates</Link>
        <Link href="/app/assessments">Assessments</Link>
        <Link href="/app/copilot">Copilot</Link>
      </div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <span>{activeTenantName ?? 'No Tenant'} / {role ?? 'NO_ROLE'}</span>
        {memberships.length > 1 ? <span>{memberships.length} tenants</span> : null}
        <button onClick={() => signOut({ callbackUrl: '/login' })}>Sign out</button>
      </div>
    </nav>
  );
}
