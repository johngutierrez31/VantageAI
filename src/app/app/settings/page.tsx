import { PageHeader } from '@/components/app/page-header';
import { BillingPanel } from '@/components/billing-panel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getPageSessionContext } from '@/lib/auth/page-session';
import { prisma } from '@/lib/db/prisma';

export default async function SettingsPage() {
  const session = await getPageSessionContext();
  const members = await prisma.membership.findMany({
    where: { tenantId: session.tenantId, status: 'ACTIVE' },
    include: {
      user: {
        select: { email: true, name: true }
      }
    },
    orderBy: { createdAt: 'asc' }
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Manage members, integrations, and subscription settings." />

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {members.map((member) => (
            <div key={member.id} className="rounded-md border border-border p-3">
              <p className="text-sm font-semibold">{member.user.name ?? member.user.email}</p>
              <p className="text-xs text-muted-foreground">{member.user.email} - {member.role}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Integrations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Auth provider: Magic link (Auth.js)</p>
          <p>Email: Resend</p>
          <p>AI provider: OpenAI</p>
          <p>Billing provider: Stripe</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Billing</CardTitle>
        </CardHeader>
        <CardContent>
          <BillingPanel />
        </CardContent>
      </Card>
    </div>
  );
}
