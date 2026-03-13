import { PageHeader } from '@/components/app/page-header';
import { BillingPanel } from '@/components/billing-panel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function SettingsBillingPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing"
        helpKey="billing"
        description="Manage plan, subscriptions, feature entitlements, and module packaging for TrustOps, Pulse, AI Governance, and Response Ops."
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

