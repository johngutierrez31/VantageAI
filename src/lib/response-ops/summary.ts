import { prisma } from '@/lib/db/prisma';

export async function getResponseOpsSummary(tenantId: string) {
  const now = new Date();
  const next30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const [
    activeIncidents,
    triageIncidents,
    overdueIncidentActions,
    openPostIncidentActions,
    upcomingTabletops,
    recentAfterActionReports,
    incidents,
    tabletops,
    reports
  ] = await Promise.all([
    prisma.incident.count({
      where: {
        tenantId,
        status: { in: ['NEW', 'TRIAGE', 'ACTIVE', 'CONTAINED', 'RECOVERING'] }
      }
    }),
    prisma.incident.count({
      where: {
        tenantId,
        status: { in: ['NEW', 'TRIAGE'] }
      }
    }),
    prisma.task.count({
      where: {
        tenantId,
        incidentId: { not: null },
        status: { not: 'DONE' },
        dueDate: { lt: now }
      }
    }),
    prisma.task.count({
      where: {
        tenantId,
        incidentId: { not: null },
        responseOpsPhase: 'POST_INCIDENT_REVIEW',
        status: { not: 'DONE' }
      }
    }),
    prisma.tabletopExercise.count({
      where: {
        tenantId,
        status: 'DRAFT',
        exerciseDate: {
          gte: now,
          lte: next30Days
        }
      }
    }),
    prisma.afterActionReport.count({
      where: {
        tenantId
      }
    }),
    prisma.incident.findMany({
      where: { tenantId },
      orderBy: [{ status: 'asc' }, { severity: 'desc' }, { updatedAt: 'desc' }],
      take: 12,
      include: {
        runbookPacks: {
          orderBy: { updatedAt: 'desc' },
          take: 3
        },
        afterActionReports: {
          orderBy: { updatedAt: 'desc' },
          take: 2
        }
      }
    }),
    prisma.tabletopExercise.findMany({
      where: { tenantId },
      orderBy: [{ exerciseDate: 'desc' }, { updatedAt: 'desc' }],
      take: 8
    }),
    prisma.afterActionReport.findMany({
      where: { tenantId },
      include: {
        incident: {
          select: {
            id: true,
            title: true,
            severity: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' },
      take: 8
    })
  ]);

  return {
    metrics: {
      activeIncidents,
      triageIncidents,
      overdueIncidentActions,
      openPostIncidentActions,
      upcomingTabletops,
      recentAfterActionReports
    },
    incidents,
    tabletops,
    reports
  };
}
