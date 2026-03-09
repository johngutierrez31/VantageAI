import { IncidentDetailPanel } from '@/components/app/incident-detail-panel';
import { getPageSessionContext } from '@/lib/auth/page-session';
import { getIncidentDetail } from '@/lib/response-ops/records';
import { getSecurityRunbooks } from '@/lib/intel/runbooks';
import { listTenantReviewers } from '@/lib/trust/reviewers';

export default async function IncidentDetailPage({ params }: { params: { id: string } }) {
  const session = await getPageSessionContext();
  const [detail, reviewers] = await Promise.all([
    getIncidentDetail(session.tenantId, params.id),
    listTenantReviewers(session.tenantId)
  ]);

  return (
    <IncidentDetailPanel
      incident={{
        id: detail.incident.id,
        title: detail.incident.title,
        description: detail.incident.description,
        incidentType: detail.incident.incidentType,
        severity: detail.incident.severity,
        status: detail.incident.status,
        detectionSource: detail.incident.detectionSource,
        reportedBy: detail.incident.reportedBy,
        incidentOwnerUserId: detail.incident.incidentOwnerUserId,
        communicationsOwnerUserId: detail.incident.communicationsOwnerUserId,
        affectedSystems: detail.incident.affectedSystems,
        affectedServices: detail.incident.affectedServices,
        affectedVendorNames: detail.incident.affectedVendorNames,
        executiveSummary: detail.incident.executiveSummary,
        internalNotes: detail.incident.internalNotes,
        startedAt: detail.incident.startedAt.toISOString(),
        nextUpdateDueAt: detail.incident.nextUpdateDueAt?.toISOString() ?? null,
        aiUseCase: detail.incident.aiUseCase ? { id: detail.incident.aiUseCase.id, name: detail.incident.aiUseCase.name } : null,
        aiVendorReview: detail.incident.aiVendorReview ? { id: detail.incident.aiVendorReview.id, vendorName: detail.incident.aiVendorReview.vendorName } : null,
        questionnaireUpload: detail.incident.questionnaireUpload ? { id: detail.incident.questionnaireUpload.id, label: detail.incident.questionnaireUpload.organizationName ?? detail.incident.questionnaireUpload.filename } : null,
        trustInboxItem: detail.incident.trustInboxItem ? { id: detail.incident.trustInboxItem.id, title: detail.incident.trustInboxItem.title } : null,
        linkedFindingIds: detail.incident.linkedFindingIds,
        linkedRiskIds: detail.incident.linkedRiskIds,
        timelineEvents: detail.incident.timelineEvents.map((event) => ({ ...event, createdAt: event.createdAt.toISOString() })),
        runbookPacks: detail.incident.runbookPacks.map((pack) => ({
          id: pack.id,
          title: pack.title,
          runbookId: pack.runbookId,
          status: pack.status,
          tasks: pack.tasks.map((task) => ({
            id: task.id,
            title: task.title,
            status: task.status,
            priority: task.priority,
            assignee: task.assignee,
            dueDate: task.dueDate?.toISOString() ?? null,
            responseOpsPhase: task.responseOpsPhase
          }))
        })),
        tasks: detail.incident.tasks.map((task) => ({
          id: task.id,
          title: task.title,
          status: task.status,
          priority: task.priority,
          assignee: task.assignee,
          dueDate: task.dueDate?.toISOString() ?? null,
          responseOpsPhase: task.responseOpsPhase
        })),
        findings: detail.incident.findings.map((finding) => ({
          id: finding.id,
          title: finding.title,
          status: finding.status,
          priority: finding.priority,
          sourceType: finding.sourceType
        })),
        afterActionReport: detail.incident.afterActionReports[0]
          ? {
              id: detail.incident.afterActionReports[0].id,
              status: detail.incident.afterActionReports[0].status,
              summary: detail.incident.afterActionReports[0].summary,
              affectedScope: detail.incident.afterActionReports[0].affectedScope,
              currentStatus: detail.incident.afterActionReports[0].currentStatus,
              lessonsLearned: detail.incident.afterActionReports[0].lessonsLearned,
              followUpActions: detail.incident.afterActionReports[0].followUpActions,
              decisionsNeeded: detail.incident.afterActionReports[0].decisionsNeeded,
              reviewerNotes: detail.incident.afterActionReports[0].reviewerNotes,
              exportCount: detail.incident.afterActionReports[0].exportCount
            }
          : null
      }}
      risks={detail.risks.map((risk) => ({
        id: risk.id,
        title: risk.title,
        severity: risk.severity,
        status: risk.status,
        targetDueAt: risk.targetDueAt?.toISOString() ?? null
      }))}
      reviewers={reviewers.map((reviewer) => ({ id: reviewer.userId, label: reviewer.user.name ?? reviewer.user.email }))}
      runbooks={getSecurityRunbooks().map((runbook) => ({ id: runbook.id, title: runbook.title }))}
    />
  );
}
