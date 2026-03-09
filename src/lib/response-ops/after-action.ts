import { prisma } from '@/lib/db/prisma';

type AfterActionStatus = 'DRAFT' | 'NEEDS_REVIEW' | 'APPROVED';

function uniq(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function buildAffectedScope(args: {
  affectedSystems: string[];
  affectedServices: string[];
  affectedVendorNames: string[];
}) {
  const parts = [
    args.affectedSystems.length ? `Systems: ${args.affectedSystems.join(', ')}` : null,
    args.affectedServices.length ? `Services: ${args.affectedServices.join(', ')}` : null,
    args.affectedVendorNames.length ? `Vendors: ${args.affectedVendorNames.join(', ')}` : null
  ].filter(Boolean);

  return parts.length ? parts.join(' | ') : 'Affected scope is still being refined.';
}

function buildLessonsLearned(args: {
  blockedTaskCount: number;
  hasCommunicationsOwner: boolean;
  hasEvidenceCollectionAction: boolean;
  hasAiLink: boolean;
}) {
  const lessons: string[] = [];

  if (!args.hasCommunicationsOwner) {
    lessons.push('Assign a communications owner at declaration so leadership and customer updates do not stall.');
  }
  if (!args.hasEvidenceCollectionAction) {
    lessons.push('Create a dedicated evidence-collection workstream earlier in the first hour.');
  }
  if (args.blockedTaskCount > 0) {
    lessons.push('Blocked incident tasks delayed response progress and should trigger faster escalation.');
  }
  if (args.hasAiLink) {
    lessons.push('AI governance review should be pulled into incident handling faster when AI workflows are involved.');
  }

  if (!lessons.length) {
    lessons.push('Response execution was durable enough to convert directly into owned process improvements.');
  }

  return lessons;
}

async function ensurePostIncidentTasks(args: {
  tenantId: string;
  incidentId: string;
  createdBy: string;
  incidentTitle: string;
  incidentOwnerUserId: string | null;
  followUpActions: string[];
}) {
  const existing = await prisma.task.findMany({
    where: {
      tenantId: args.tenantId,
      incidentId: args.incidentId,
      responseOpsPhase: 'POST_INCIDENT_REVIEW',
      status: { not: 'DONE' }
    },
    select: {
      id: true,
      title: true
    }
  });

  const existingByTitle = new Map(existing.map((task) => [task.title, task.id]));
  const createdTaskIds: string[] = [];

  for (const action of args.followUpActions) {
    const title = `[After Action] ${action}`;
    const existingId = existingByTitle.get(title);
    if (existingId) {
      createdTaskIds.push(existingId);
      continue;
    }

    const task = await prisma.task.create({
      data: {
        tenantId: args.tenantId,
        incidentId: args.incidentId,
        title,
        description: `Follow-up action from after-action review for ${args.incidentTitle}.`,
        assignee: args.incidentOwnerUserId ?? null,
        priority: 'HIGH',
        responseOpsPhase: 'POST_INCIDENT_REVIEW',
        createdBy: args.createdBy
      }
    });

    createdTaskIds.push(task.id);
  }

  return createdTaskIds;
}

export async function generateAfterActionReportRecord(args: {
  tenantId: string;
  userId: string;
  incidentId: string;
  title?: string;
}) {
  const incident = await prisma.incident.findFirstOrThrow({
    where: {
      tenantId: args.tenantId,
      id: args.incidentId
    },
    include: {
      timelineEvents: {
        orderBy: { createdAt: 'asc' }
      },
      tasks: {
        orderBy: [{ responseOpsOrder: 'asc' }, { dueDate: 'asc' }, { createdAt: 'asc' }]
      },
      findings: {
        where: {
          status: { in: ['OPEN', 'IN_PROGRESS'] }
        },
        orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }]
      }
    }
  });

  const risks = await prisma.riskRegisterItem.findMany({
    where: {
      tenantId: args.tenantId,
      linkedIncidentIds: { has: incident.id },
      status: { in: ['OPEN', 'IN_REVIEW', 'MITIGATING', 'ACCEPTED'] }
    },
    orderBy: [{ severity: 'desc' }, { targetDueAt: 'asc' }, { updatedAt: 'desc' }]
  });

  const shareableTimeline = incident.timelineEvents
    .filter((event) => event.isShareable || event.eventType !== 'DECISION_LOG')
    .slice(0, 12)
    .map(
      (event) =>
        `${new Date(event.createdAt).toLocaleString()}: ${event.title}${event.detail ? ` - ${event.detail}` : ''}`
    );

  const actionedTasks = incident.tasks
    .filter((task) => task.status !== 'TODO')
    .map((task) => `${task.title} (${task.status})`);
  const followUpActions = uniq([
    ...incident.tasks
      .filter((task) => task.responseOpsPhase === 'POST_INCIDENT_REVIEW' && task.status !== 'DONE')
      .map((task) => task.title.replace(/^\[After Action\]\s*/, '')),
    ...incident.findings.slice(0, 3).map((finding) => `Resolve finding: ${finding.title}`),
    ...risks.slice(0, 3).map((risk) => `Reduce risk: ${risk.title}`)
  ]).slice(0, 6);

  const decisionsNeeded = uniq([
    ...risks
      .filter((risk) => !risk.ownerUserId || risk.severity === 'CRITICAL')
      .map((risk) =>
        !risk.ownerUserId ? `Assign executive owner for ${risk.title}.` : `Confirm timeline and support for ${risk.title}.`
      ),
    ...(incident.status !== 'RESOLVED' && incident.status !== 'ARCHIVED'
      ? ['Confirm remaining containment and recovery milestones before closing the incident.']
      : [])
  ]).slice(0, 5);

  const lessonsLearned = buildLessonsLearned({
    blockedTaskCount: incident.tasks.filter((task) => task.status === 'BLOCKED').length,
    hasCommunicationsOwner: Boolean(incident.communicationsOwnerUserId),
    hasEvidenceCollectionAction: incident.tasks.some((task) => task.responseOpsPhase === 'EVIDENCE_COLLECTION'),
    hasAiLink: Boolean(incident.aiUseCaseId || incident.aiVendorReviewId)
  });

  const linkedTaskIds = await ensurePostIncidentTasks({
    tenantId: args.tenantId,
    incidentId: incident.id,
    createdBy: args.userId,
    incidentTitle: incident.title,
    incidentOwnerUserId: incident.incidentOwnerUserId,
    followUpActions
  });

  const report = await prisma.afterActionReport.upsert({
    where: {
      incidentId: incident.id
    },
    update: {
      title: args.title?.trim() || `After Action Report - ${incident.title}`,
      status: 'NEEDS_REVIEW',
      summary:
        incident.executiveSummary ??
        `${incident.title} remains ${incident.status.toLowerCase().replace(/_/g, ' ')} with ${incident.tasks.filter((task) => task.status !== 'DONE').length} open task(s).`,
      affectedScope: buildAffectedScope({
        affectedSystems: incident.affectedSystems,
        affectedServices: incident.affectedServices,
        affectedVendorNames: incident.affectedVendorNames
      }),
      timelineSummary: shareableTimeline,
      actionsTaken: actionedTasks.length ? actionedTasks : ['Initial incident handling remains in progress.'],
      currentStatus: incident.status.replace(/_/g, ' '),
      lessonsLearned,
      followUpActions,
      decisionsNeeded,
      linkedFindingIds: incident.findings.map((finding) => finding.id),
      linkedRiskIds: risks.map((risk) => risk.id),
      linkedTaskIds,
      reviewerNotes: null,
      reviewedBy: null,
      approvedBy: null,
      reviewedAt: null,
      approvedAt: null
    },
    create: {
      tenantId: args.tenantId,
      incidentId: incident.id,
      title: args.title?.trim() || `After Action Report - ${incident.title}`,
      status: 'NEEDS_REVIEW',
      summary:
        incident.executiveSummary ??
        `${incident.title} remains ${incident.status.toLowerCase().replace(/_/g, ' ')} with ${incident.tasks.filter((task) => task.status !== 'DONE').length} open task(s).`,
      affectedScope: buildAffectedScope({
        affectedSystems: incident.affectedSystems,
        affectedServices: incident.affectedServices,
        affectedVendorNames: incident.affectedVendorNames
      }),
      timelineSummary: shareableTimeline,
      actionsTaken: actionedTasks.length ? actionedTasks : ['Initial incident handling remains in progress.'],
      currentStatus: incident.status.replace(/_/g, ' '),
      lessonsLearned,
      followUpActions,
      decisionsNeeded,
      linkedFindingIds: incident.findings.map((finding) => finding.id),
      linkedRiskIds: risks.map((risk) => risk.id),
      linkedTaskIds,
      createdBy: args.userId
    }
  });

  await prisma.incidentTimelineEvent.create({
    data: {
      tenantId: args.tenantId,
      incidentId: incident.id,
      eventType: 'AFTER_ACTION_GENERATED',
      title: 'After-action report generated',
      detail: `${report.title} created for review.`,
      isShareable: true,
      createdBy: args.userId
    }
  });

  return prisma.afterActionReport.findUniqueOrThrow({
    where: { id: report.id }
  });
}

export async function updateAfterActionReport(args: {
  tenantId: string;
  reportId: string;
  actorUserId: string;
  status?: AfterActionStatus;
  reviewerNotes?: string | null;
}) {
  const existing = await prisma.afterActionReport.findFirstOrThrow({
    where: {
      tenantId: args.tenantId,
      id: args.reportId
    }
  });

  return prisma.afterActionReport.update({
    where: { id: existing.id },
    data: {
      status: args.status,
      reviewerNotes: args.reviewerNotes,
      reviewedBy: args.status || args.reviewerNotes ? args.actorUserId : undefined,
      reviewedAt: args.status || args.reviewerNotes ? new Date() : undefined,
      approvedBy: args.status === 'APPROVED' ? args.actorUserId : args.status ? null : undefined,
      approvedAt: args.status === 'APPROVED' ? new Date() : args.status ? null : undefined
    }
  });
}
