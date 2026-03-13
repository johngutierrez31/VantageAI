import { AdoptionModePanel } from '@/components/app/adoption-mode-panel';
import { getPageSessionContext } from '@/lib/auth/page-session';
import { prisma } from '@/lib/db/prisma';
import { ADOPTION_START_PATHS, getTenantAdoptionModeViewModel } from '@/lib/adoption/adoption-mode';
import { listAdoptionImports } from '@/lib/adoption/imports';

export default async function AdoptionModePage() {
  const session = await getPageSessionContext();
  const [viewModel, imports, connectors, reviewers] = await Promise.all([
    getTenantAdoptionModeViewModel(session.tenantId),
    listAdoptionImports(session.tenantId),
    prisma.connectorConfig.findMany({
      where: { tenantId: session.tenantId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        provider: true,
        status: true
      }
    }),
    prisma.membership.findMany({
      where: {
        tenantId: session.tenantId,
        status: 'ACTIVE'
      },
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
      select: {
        userId: true,
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })
  ]);

  return (
    <AdoptionModePanel
      metrics={viewModel.metrics}
      startPaths={[...ADOPTION_START_PATHS]}
      valueGraph={viewModel.valueGraph}
      imports={imports.map((item: (typeof imports)[number]) => ({
        id: item.id,
        target: item.target,
        source: item.source,
        status: item.status,
        createdCount: item.createdCount,
        failedCount: item.failedCount,
        summary: item.summary,
        sourceLabel: item.sourceLabel,
        createdAt: item.createdAt.toISOString(),
        connector: item.connector
          ? {
              id: item.connector.id,
              name: item.connector.name,
              provider: item.connector.provider
            }
          : null
      }))}
      connectors={connectors}
      reviewers={reviewers.map((reviewer: (typeof reviewers)[number]) => ({
        id: reviewer.userId,
        label: reviewer.user.name ?? reviewer.user.email ?? reviewer.userId
      }))}
    />
  );
}
