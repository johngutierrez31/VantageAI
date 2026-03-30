import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/app/page-header';
import { getPageSessionContext } from '@/lib/auth/page-session';
import { getTenantEntitlements } from '@/lib/billing/entitlements';
import { formatPlanLabel } from '@/lib/product/module-catalog';
import { formatWorkspaceModeLabel, getTenantWorkspaceContext } from '@/lib/workspace-mode';
import { prisma } from '@/lib/db/prisma';
import { AccountPasswordForm } from '@/components/app/account-password-form';

export default async function AccountPage() {
  const session = await getPageSessionContext();
  const [workspace, entitlements, user] = await Promise.all([
    getTenantWorkspaceContext(session.tenantId),
    getTenantEntitlements(session.tenantId),
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { email: true, name: true, credential: { select: { id: true } } }
    })
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Workspace"
        description="Your active workspace profile, role, and subscription access."
      />

      <Card>
        <CardHeader>
          <CardTitle>User</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="font-semibold">Name:</span> {user?.name ?? 'Not set'}
          </p>
          <p>
            <span className="font-semibold">Email:</span> {user?.email ?? 'Unknown'}
          </p>
          <p>
            <span className="font-semibold">Role:</span> {session.role}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Subscription & Workspace</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="muted">{formatWorkspaceModeLabel(workspace.workspaceMode)} Workspace</Badge>
            <Badge variant="default">{formatPlanLabel(entitlements.plan)}</Badge>
            <Badge variant="muted">{entitlements.status}</Badge>
          </div>
          <p>
            <span className="font-semibold">Workspace:</span> {workspace.tenantName}
          </p>
          <p>
            <span className="font-semibold">Tenant Slug:</span> {workspace.tenantSlug}
          </p>
          {workspace.isTrial && workspace.trialEndsAt ? (
            <p>
              <span className="font-semibold">Trial Ends:</span> {workspace.trialEndsAt.toLocaleDateString()}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Password Login</CardTitle>
        </CardHeader>
        <CardContent>
          <AccountPasswordForm hasPassword={Boolean(user?.credential)} />
        </CardContent>
      </Card>
    </div>
  );
}
