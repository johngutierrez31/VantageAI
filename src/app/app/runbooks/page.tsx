import { PageHeader } from '@/components/app/page-header';
import { RunbooksPanel } from '@/components/app/runbooks-panel';
import { getPageSessionContext } from '@/lib/auth/page-session';
import { getSecurityRunbooks } from '@/lib/intel/runbooks';

export default async function RunbooksPage() {
  await getPageSessionContext();
  const runbooks = getSecurityRunbooks();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Response Runbooks"
        description="Pre-built incident and resilience runbooks that can be instantiated into task packs for immediate execution."
        primaryAction={{ label: 'Open Command Center', href: '/app/command-center' }}
        secondaryActions={[
          { label: 'Security Analyst', href: '/app/security-analyst', variant: 'outline' },
          { label: 'Findings', href: '/app/findings', variant: 'outline' }
        ]}
        volumeLabel="Volume II"
      />
      <RunbooksPanel runbooks={runbooks} />
    </div>
  );
}

