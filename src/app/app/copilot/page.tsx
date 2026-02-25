import { CopilotPanel } from '@/components/copilot-panel';
import { getPageSessionContext } from '@/lib/auth/page-session';
import { PageHeader } from '@/components/app/page-header';

export default async function CopilotPage() {
  const session = await getPageSessionContext();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Copilot"
        description="Generate practical plans, policy guidance, and control remediation steps with tenant-aware context."
        secondaryActions={[{ label: 'Security Analyst', href: '/app/security-analyst', variant: 'outline' }]}
      />
      <CopilotPanel tenantName={session.tenantName} />
    </div>
  );
}
