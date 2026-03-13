import { getPageSessionContext } from '@/lib/auth/page-session';
import { prisma } from '@/lib/db/prisma';
import { listConnectorConfigs, sanitizeConnectorConfig } from '@/lib/integrations/connectors';
import { ConnectorSettingsPanel } from '@/components/app/connector-settings-panel';

export default async function SettingsConnectorsPage() {
  const session = await getPageSessionContext();
  const [connectors, findings, risks, tasks, roadmapItems, trustPackets, boardBriefs, afterActions, quarterlyReviews] =
    await Promise.all([
      listConnectorConfigs(session.tenantId),
      prisma.finding.findMany({
        where: { tenantId: session.tenantId },
        orderBy: { updatedAt: 'desc' },
        take: 8
      }),
      prisma.riskRegisterItem.findMany({
        where: { tenantId: session.tenantId },
        orderBy: { updatedAt: 'desc' },
        take: 8
      }),
      prisma.task.findMany({
        where: { tenantId: session.tenantId },
        orderBy: { updatedAt: 'desc' },
        take: 8
      }),
      prisma.roadmapItem.findMany({
        where: { tenantId: session.tenantId },
        orderBy: { updatedAt: 'desc' },
        take: 8
      }),
      prisma.trustPacket.findMany({
        where: { tenantId: session.tenantId },
        orderBy: { updatedAt: 'desc' },
        take: 8
      }),
      prisma.boardBrief.findMany({
        where: { tenantId: session.tenantId },
        orderBy: { updatedAt: 'desc' },
        take: 8
      }),
      prisma.afterActionReport.findMany({
        where: { tenantId: session.tenantId },
        orderBy: { updatedAt: 'desc' },
        take: 8
      }),
      prisma.quarterlyReview.findMany({
        where: { tenantId: session.tenantId },
        orderBy: { updatedAt: 'desc' },
        take: 8
      })
    ]);

  return (
    <ConnectorSettingsPanel
      connectors={connectors.map((connector) => sanitizeConnectorConfig(connector))}
      syncTargets={[
        ...findings.map((finding) => ({
          entityType: 'finding' as const,
          id: finding.id,
          title: finding.title,
          status: finding.status,
          helper: `${finding.priority} priority finding in ${finding.status.toLowerCase()} status.`
        })),
        ...risks.map((risk) => ({
          entityType: 'risk' as const,
          id: risk.id,
          title: risk.title,
          status: risk.status,
          helper: `${risk.severity} severity risk targeting ${risk.targetDueAt?.toISOString() ?? 'an open-ended due date'}.`
        })),
        ...tasks.map((task) => ({
          entityType: 'task' as const,
          id: task.id,
          title: task.title,
          status: task.status,
          helper: `${task.priority} priority task${task.responseOpsPhase ? ` in ${task.responseOpsPhase.toLowerCase()} phase` : ''}.`
        })),
        ...roadmapItems.map((item) => ({
          entityType: 'roadmap_item' as const,
          id: item.id,
          title: item.title,
          status: item.status,
          helper: `${item.horizon} roadmap item with ${item.status.toLowerCase()} status.`
        }))
      ]}
      publishTargets={[
        ...trustPackets.map((packet) => ({
          artifactType: 'trust_packet' as const,
          id: packet.id,
          title: packet.name,
          helper: `${packet.shareMode.replace(/_/g, ' ')} packet in ${packet.status.toLowerCase()} status.`
        })),
        ...boardBriefs.map((brief) => ({
          artifactType: 'board_brief' as const,
          id: brief.id,
          title: brief.title,
          helper: `${brief.reportingPeriod} board brief in ${brief.status.toLowerCase()} status.`
        })),
        ...afterActions.map((report) => ({
          artifactType: 'after_action_report' as const,
          id: report.id,
          title: report.title,
          helper: `After-action report in ${report.status.toLowerCase()} status.`
        })),
        ...quarterlyReviews.map((review) => ({
          artifactType: 'quarterly_review' as const,
          id: review.id,
          title: `${review.reviewPeriod} Quarterly Review`,
          helper: `Quarterly review in ${review.status.toLowerCase()} status.`
        }))
      ]}
    />
  );
}
