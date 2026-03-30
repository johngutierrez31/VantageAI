import { redirect } from 'next/navigation';
import { getPageSessionContext } from '@/lib/auth/page-session';
import { getTenantEntitlements } from '@/lib/billing/entitlements';
import { getTenantWorkspaceContext } from '@/lib/workspace-mode';

export default async function AppRootPage() {
  const session = await getPageSessionContext();
  const [workspace, entitlements] = await Promise.all([
    getTenantWorkspaceContext(session.tenantId),
    getTenantEntitlements(session.tenantId)
  ]);

  if (workspace.isDemo || entitlements.plan === 'FREE') {
    redirect('/app/tools');
  }

  redirect('/app/command-center');
}
