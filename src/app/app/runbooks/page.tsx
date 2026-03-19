import { PageHeader } from '@/components/app/page-header';
import { RunbooksPanel } from '@/components/app/runbooks-panel';
import { getPageSessionContext } from '@/lib/auth/page-session';
import { prisma } from '@/lib/db/prisma';
import { getSecurityRunbooks } from '@/lib/intel/runbooks';

export default async function RunbooksPage({
  searchParams
}: {
  searchParams?: { workflow?: string; incidentId?: string };
}) {
  const session = await getPageSessionContext();
  const runbooks = getSecurityRunbooks();
  const incidents = await prisma.incident.findMany({
    where: { tenantId: session.tenantId },
    orderBy: [{ status: 'asc' }, { severity: 'desc' }, { updatedAt: 'desc' }],
    take: 20,
    select: {
      id: true,
      title: true,
      status: true,
      severity: true
    }
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Runbooks"
        helpKey="runbooks"
        description="Pre-built response and resilience workflows that can be instantiated into task packs for immediate execution."
        primaryAction={{ label: 'Open Command Center', href: '/app/command-center' }}
        secondaryActions={[
          { label: 'Security Analyst', href: '/app/security-analyst', variant: 'outline' },
          { label: 'Findings', href: '/app/findings', variant: 'outline' }
        ]}
      />
      <RunbooksPanel
        activeWorkflow={searchParams?.workflow ?? null}
        initialIncidentId={searchParams?.incidentId ?? null}
        incidents={incidents}
        runbooks={runbooks}
      />
    </div>
  );
}

