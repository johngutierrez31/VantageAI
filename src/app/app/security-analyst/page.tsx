import { SecurityAnalystPanel } from '@/components/app/security-analyst-panel';
import { getPageSessionContext } from '@/lib/auth/page-session';

export default async function SecurityAnalystPage() {
  const session = await getPageSessionContext();
  return <SecurityAnalystPanel tenantName={session.tenantName} />;
}
