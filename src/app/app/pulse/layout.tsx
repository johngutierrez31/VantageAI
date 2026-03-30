import { redirect } from 'next/navigation';
import { getPageSessionContext } from '@/lib/auth/page-session';
import { canTenantAccessModule } from '@/lib/billing/module-guards';

export default async function PulseModuleLayout({ children }: { children: React.ReactNode }) {
  const session = await getPageSessionContext();
  const allowed = await canTenantAccessModule(session.tenantId, 'pulse');

  if (!allowed) {
    redirect('/app/settings/billing?upgrade=pulse');
  }

  return children;
}

