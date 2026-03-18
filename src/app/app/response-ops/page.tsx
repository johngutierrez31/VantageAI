import { ResponseOpsDashboardPanel } from '@/components/app/response-ops-dashboard-panel';
import { EmptyState } from '@/components/app/empty-state';
import { getPageSessionContext } from '@/lib/auth/page-session';
import { getResponseOpsSummary } from '@/lib/response-ops/summary';
import { listIncidentScenarioSummaries } from '@/lib/response-ops/templates';
import { listTenantReviewers } from '@/lib/trust/reviewers';
import { getTenantWorkspaceContext } from '@/lib/workspace-mode';

export default async function ResponseOpsPage() {
  const session = await getPageSessionContext();
  const [workspace, summary, reviewers] = await Promise.all([
    getTenantWorkspaceContext(session.tenantId),
    getResponseOpsSummary(session.tenantId),
    listTenantReviewers(session.tenantId)
  ]);

  return (
    <div className="space-y-6">
      {workspace.isTrial && summary.incidents.length === 0 && summary.tabletops.length === 0 && summary.reports.length === 0 ? (
        <EmptyState
          title="Start your first incident workflow"
          description="Response Ops is for first-hour incident execution and follow-up. Start an incident or tabletop so decisions, tasks, and post-incident learning stay durable inside the workspace."
          actionLabel="Open Guided Response Ops Workflows"
          actionHref="/app/response-ops#guided-response-ops-workflows"
          eyebrow="Response Ops"
          supportingPoints={[
            'What it is for: incident triage, runbooks, after-action, and tabletop follow-up.',
            'First action: start incident triage or prepare a tabletop.',
            'Output: a durable incident or exercise record with owned follow-up work.'
          ]}
        />
      ) : null}

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
    </div>
  );
}
