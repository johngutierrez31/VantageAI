import { redirect } from 'next/navigation';
import { getPageSessionContext } from '@/lib/auth/page-session';
import { canTenantAccessModule } from '@/lib/billing/module-guards';

export default async function QuestionnairesModuleLayout({ children }: { children: React.ReactNode }) {
  const session = await getPageSessionContext();
  const allowed = await canTenantAccessModule(session.tenantId, 'trustops');

  if (!allowed) {
    redirect('/app/settings/billing?upgrade=trustops');
  }

  return children;
}

