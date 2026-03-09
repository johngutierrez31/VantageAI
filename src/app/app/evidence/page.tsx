import { PageHeader } from '@/components/app/page-header';
import { EvidenceVaultPanel } from '@/components/evidence-vault-panel';
import { EvidenceRequestsPanel } from '@/components/app/evidence-requests-panel';
import { getPageSessionContext } from '@/lib/auth/page-session';
import { prisma } from '@/lib/db/prisma';

export default async function EvidencePage() {
  const session = await getPageSessionContext();
  const requests = await prisma.evidenceRequest.findMany({
    where: { tenantId: session.tenantId },
    orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
    take: 40
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Evidence Vault"
        helpKey="evidence"
        description="Ingest supporting artifacts, track freshness, and manage evidence collection requests."
      />
      <EvidenceVaultPanel />
      <EvidenceRequestsPanel
        requests={requests.map((request) => ({
          id: request.id,
          assessmentId: request.assessmentId,
          title: request.title,
          details: request.details,
          assignee: request.assignee,
          status: request.status,
          dueDate: request.dueDate?.toISOString() ?? null
        }))}
      />
    </div>
  );
}

