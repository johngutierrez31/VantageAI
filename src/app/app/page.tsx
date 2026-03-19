import { redirect } from 'next/navigation';
import { getPageSessionContext } from '@/lib/auth/page-session';
import { getTenantWorkspaceContext } from '@/lib/workspace-mode';

export default async function AppRootPage() {
  const session = await getPageSessionContext();
  const workspace = await getTenantWorkspaceContext(session.tenantId);

  redirect(workspace.isPaid ? '/app/command-center' : '/app/tools');
}
