import { PageHeader } from '@/components/app/page-header';
import { BillingPanel } from '@/components/billing-panel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function SettingsBillingPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing"
        description="Manage plan, subscriptions, and feature entitlements."
        secondaryActions={[{ label: 'Members', href: '/app/settings/members', variant: 'outline' }]}
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
