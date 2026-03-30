import { redirect } from 'next/navigation';
import { getPageSessionContext } from '@/lib/auth/page-session';
import { canTenantAccessModule } from '@/lib/billing/module-guards';

export default async function AIGovernanceModuleLayout({ children }: { children: React.ReactNode }) {
  const session = await getPageSessionContext();
  const allowed = await canTenantAccessModule(session.tenantId, 'ai-governance');

  if (!allowed) {
    redirect('/app/settings/billing?upgrade=ai-governance');
  }

  return children;
}

