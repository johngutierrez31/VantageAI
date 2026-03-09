import { ResponseOpsDashboardPanel } from '@/components/app/response-ops-dashboard-panel';
import { getPageSessionContext } from '@/lib/auth/page-session';
import { getResponseOpsSummary } from '@/lib/response-ops/summary';
import { listIncidentScenarioSummaries } from '@/lib/response-ops/templates';
import { listTenantReviewers } from '@/lib/trust/reviewers';

export default async function ResponseOpsPage() {
  const session = await getPageSessionContext();
  const [summary, reviewers] = await Promise.all([
    getResponseOpsSummary(session.tenantId),
    listTenantReviewers(session.tenantId)
  ]);

  return (
    <ResponseOpsDashboardPanel
      metrics={summary.metrics}
      incidents={summary.incidents.map((incident) => ({
        id: incident.id,
        title: incident.title,
        incidentType: incident.incidentType,
        severity: incident.severity,
        status: incident.status,
        nextUpdateDueAt: incident.nextUpdateDueAt?.toISOString() ?? null,
        updatedAt: incident.updatedAt.toISOString(),
        linkedFindingIds: incident.linkedFindingIds,
        linkedRiskIds: incident.linkedRiskIds,
        runbookPacks: incident.runbookPacks.map((pack) => ({
          id: pack.id,
          title: pack.title,
          status: pack.status
        })),
        afterActionReports: incident.afterActionReports.map((report) => ({
          id: report.id,
          status: report.status
        }))
      }))}
      tabletops={summary.tabletops.map((tabletop) => ({
        id: tabletop.id,
        title: tabletop.title,
        scenarioType: tabletop.scenarioType,
        status: tabletop.status,
        exerciseDate: tabletop.exerciseDate.toISOString(),
        linkedFindingIds: tabletop.linkedFindingIds,
        linkedRiskIds: tabletop.linkedRiskIds,
        linkedTaskIds: tabletop.linkedTaskIds
      }))}
      reports={summary.reports.map((report) => ({
        id: report.id,
        title: report.title,
        status: report.status,
        updatedAt: report.updatedAt.toISOString(),
        incident: {
          id: report.incident.id,
          title: report.incident.title,
          severity: report.incident.severity
        }
      }))}
      reviewers={reviewers.map((reviewer) => ({
        id: reviewer.userId,
        label: reviewer.user.name ?? reviewer.user.email
      }))}
      scenarios={listIncidentScenarioSummaries()}
    />
  );
}
