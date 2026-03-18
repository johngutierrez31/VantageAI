import { PageHeader } from '@/components/app/page-header';
import { BillingPanel } from '@/components/billing-panel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getPageSessionContext } from '@/lib/auth/page-session';
import { getTenantWorkspaceContext } from '@/lib/workspace-mode';

export default async function SettingsBillingPage() {
  const session = await getPageSessionContext();
  const workspace = await getTenantWorkspaceContext(session.tenantId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing"
        helpKey={workspace.isTrial ? undefined : 'billing'}
        description="Review workspace access, trial or subscription status, and included product coverage across TrustOps, Pulse, AI Governance, and Response Ops."
        secondaryActions={[
          { label: 'Members', href: '/app/settings/members', variant: 'outline' },
          { label: 'Connectors', href: '/app/settings/connectors', variant: 'outline' }
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
        </CardHeader>
        <CardContent>
          <BillingPanel />
        </CardContent>
      </Card>
    </div>
  );
}

