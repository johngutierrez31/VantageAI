import { PageHeader } from '@/components/app/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getPageSessionContext } from '@/lib/auth/page-session';
import { prisma } from '@/lib/db/prisma';
import { getTenantWorkspaceContext } from '@/lib/workspace-mode';
import { redirect } from 'next/navigation';

export default async function SettingsMembersPage() {
  const session = await getPageSessionContext();
  const workspace = await getTenantWorkspaceContext(session.tenantId);
  const canManageMembers = session.role === 'ADMIN' || session.role === 'OWNER';

  if (workspace.isDemo) {
    redirect('/app/tools?mode=demo');
  }

  if (!canManageMembers) {
    redirect('/app/command-center');
  }

  const members = await prisma.membership.findMany({
    where: { tenantId: session.tenantId, status: 'ACTIVE' },
    include: {
      user: {
        select: {
          email: true,
          name: true
        }
      }
    },
    orderBy: { createdAt: 'asc' }
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workspace Team"
        helpKey="members"
        description="See who owns reviews, approvals, and operating work across the workspace."
        secondaryActions={[
          { label: 'Connectors', href: '/app/settings/connectors', variant: 'outline' },
          { label: 'Billing', href: '/app/settings/billing', variant: 'outline' }
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle>Active Team Members</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {members.map((member) => (
            <div key={member.id} className="rounded-md border border-border p-3">
              <p className="text-sm font-semibold">{member.user.name ?? member.user.email}</p>
              <p className="text-xs text-muted-foreground">
                {member.user.email} | {member.role}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

