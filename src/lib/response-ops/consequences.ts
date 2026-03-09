import type {
  FindingStatus,
  Incident,
  IncidentSeverity,
  RiskLevel,
  TabletopExercise,
  TaskPriority
} from '@prisma/client';
import { prisma } from '@/lib/db/prisma';

type ConsequenceSyncResult = {
  findingIds: string[];
  riskIds: string[];
  taskIds: string[];
};

const openFindingStatuses: FindingStatus[] = ['OPEN', 'IN_PROGRESS'];

function mergeIds(...values: Array<string[] | undefined>) {
  return Array.from(new Set(values.flatMap((value) => value ?? []).filter(Boolean)));
}

function severityToTaskPriority(severity: IncidentSeverity): TaskPriority {
  if (severity === 'CRITICAL') return 'CRITICAL';
  if (severity === 'HIGH') return 'HIGH';
  if (severity === 'LOW') return 'LOW';
  return 'MEDIUM';
}

function severityToRiskLevel(severity: IncidentSeverity): RiskLevel {
  if (severity === 'CRITICAL') return 'CRITICAL';
  if (severity === 'HIGH') return 'HIGH';
  if (severity === 'LOW') return 'LOW';
  return 'MEDIUM';
}

function shouldKeepIncidentSignalsOpen(incident: Pick<Incident, 'severity' | 'status' | 'incidentType'>) {
  if (incident.incidentType === 'AI_MISUSE') {
    return !['RESOLVED', 'ARCHIVED'].includes(incident.status);
  }

  return (
    ['HIGH', 'CRITICAL'].includes(incident.severity) &&
    !['RESOLVED', 'ARCHIVED'].includes(incident.status)
  );
}

async function openIncidentTaskIds(tenantId: string, incidentId: string) {
  const tasks = await prisma.task.findMany({
    where: {
      tenantId,
      incidentId,
      status: { not: 'DONE' }
    },
    select: { id: true }
  });

  return tasks.map((task) => task.id);
}

async function upsertIncidentFinding(incident: Incident, linkedTaskIds: string[]) {
  const existing = await prisma.finding.findFirst({
    where: {
      tenantId: incident.tenantId,
      incidentId: incident.id,
      sourceType: 'RESPONSE_OPS_INCIDENT',
      status: { in: openFindingStatuses }
    }
  });

  const data = {
    title: `Active incident: ${incident.title}`,
    description: `${incident.description}\n\nExecutive summary: ${incident.executiveSummary ?? 'Pending update.'}`.trim(),
    priority: severityToTaskPriority(incident.severity),
    ownerUserId: incident.incidentOwnerUserId ?? null,
    aiUseCaseId: incident.aiUseCaseId,
    aiVendorReviewId: incident.aiVendorReviewId,
    questionnaireUploadId: incident.questionnaireUploadId,
    taskId: linkedTaskIds[0] ?? null
  };

  if (existing) {
    return prisma.finding.update({
      where: { id: existing.id },
      data
    });
  }

  return prisma.finding.create({
    data: {
      tenantId: incident.tenantId,
      incidentId: incident.id,
      sourceType: 'RESPONSE_OPS_INCIDENT',
      ...data,
      createdBy: incident.createdBy
    }
  });
}

async function closeIncidentFindings(incident: Incident) {
  return prisma.finding.updateMany({
    where: {
      tenantId: incident.tenantId,
      incidentId: incident.id,
      sourceType: 'RESPONSE_OPS_INCIDENT',
      status: { in: openFindingStatuses }
    },
    data: {
      status: 'RESOLVED'
    }
  });
}

async function upsertIncidentRisk(incident: Incident, findingId: string | null, linkedTaskIds: string[]) {
  const sourceKey = `incident:${incident.id}`;

  return prisma.riskRegisterItem.upsert({
    where: {
      tenantId_sourceKey: {
        tenantId: incident.tenantId,
        sourceKey
      }
    },
    update: {
      title: `Incident risk: ${incident.title}`,
      normalizedRiskStatement: `incident risk ${incident.title}`.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(),
      description: incident.description,
      businessImpactSummary:
        'Open incidents increase executive, operational, and customer-impact pressure until containment and post-incident actions are completed.',
      sourceType: 'INCIDENT',
      sourceModule: 'RESPONSE_OPS',
      sourceReference: incident.id,
      severity: severityToRiskLevel(incident.severity),
      likelihood: severityToRiskLevel(incident.severity),
      impact: severityToRiskLevel(incident.severity),
      status: 'OPEN',
      ownerUserId: incident.incidentOwnerUserId ?? null,
      targetDueAt: incident.nextUpdateDueAt ?? null,
      linkedFindingIds: mergeIds(incident.linkedFindingIds, findingId ? [findingId] : []),
      linkedTaskIds: mergeIds(linkedTaskIds),
      linkedQuestionnaireIds: incident.questionnaireUploadId ? [incident.questionnaireUploadId] : [],
      linkedAiUseCaseIds: incident.aiUseCaseId ? [incident.aiUseCaseId] : [],
      linkedAiVendorReviewIds: incident.aiVendorReviewId ? [incident.aiVendorReviewId] : [],
      linkedIncidentIds: [incident.id],
      reviewedAt: null,
      reviewedBy: null
    },
    create: {
      tenantId: incident.tenantId,
      title: `Incident risk: ${incident.title}`,
      normalizedRiskStatement: `incident risk ${incident.title}`.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(),
      description: incident.description,
      businessImpactSummary:
        'Open incidents increase executive, operational, and customer-impact pressure until containment and post-incident actions are completed.',
      sourceType: 'INCIDENT',
      sourceModule: 'RESPONSE_OPS',
      sourceKey,
      sourceReference: incident.id,
      severity: severityToRiskLevel(incident.severity),
      likelihood: severityToRiskLevel(incident.severity),
      impact: severityToRiskLevel(incident.severity),
      ownerUserId: incident.incidentOwnerUserId ?? null,
      targetDueAt: incident.nextUpdateDueAt ?? null,
      linkedFindingIds: mergeIds(incident.linkedFindingIds, findingId ? [findingId] : []),
      linkedTaskIds: mergeIds(linkedTaskIds),
      linkedQuestionnaireIds: incident.questionnaireUploadId ? [incident.questionnaireUploadId] : [],
      linkedAiUseCaseIds: incident.aiUseCaseId ? [incident.aiUseCaseId] : [],
      linkedAiVendorReviewIds: incident.aiVendorReviewId ? [incident.aiVendorReviewId] : [],
      linkedIncidentIds: [incident.id],
      createdBy: incident.createdBy
    }
  });
}

async function closeIncidentRisk(incident: Incident) {
  return prisma.riskRegisterItem.updateMany({
    where: {
      tenantId: incident.tenantId,
      sourceKey: `incident:${incident.id}`,
      status: { in: ['OPEN', 'IN_REVIEW', 'MITIGATING', 'ACCEPTED'] }
    },
    data: {
      status: 'CLOSED'
    }
  });
}

export async function syncIncidentConsequences(incident: Incident): Promise<ConsequenceSyncResult> {
  const linkedTaskIds = await openIncidentTaskIds(incident.tenantId, incident.id);

  if (!shouldKeepIncidentSignalsOpen(incident)) {
    await Promise.all([closeIncidentFindings(incident), closeIncidentRisk(incident)]);

    await prisma.incident.update({
      where: { id: incident.id },
      data: {
        linkedFindingIds: [],
        linkedRiskIds: []
      }
    });

    return {
      findingIds: [],
      riskIds: [],
      taskIds: linkedTaskIds
    };
  }

  const finding = await upsertIncidentFinding(incident, linkedTaskIds);
  const risk = await upsertIncidentRisk(incident, finding.id, linkedTaskIds);

  await prisma.incident.update({
    where: { id: incident.id },
    data: {
      linkedFindingIds: mergeIds(incident.linkedFindingIds, [finding.id]),
      linkedRiskIds: mergeIds(incident.linkedRiskIds, [risk.id])
    }
  });

  return {
    findingIds: [finding.id],
    riskIds: [risk.id],
    taskIds: linkedTaskIds
  };
}

function tabletopPriority(tabletop: Pick<TabletopExercise, 'scenarioType'>): TaskPriority {
  if (['RANSOMWARE', 'IDENTITY_COMPROMISE', 'AI_MISUSE'].includes(tabletop.scenarioType)) {
    return 'HIGH';
  }
  return 'MEDIUM';
}

async function ensureTabletopTasks(tabletop: TabletopExercise) {
  if (tabletop.status !== 'COMPLETED' || tabletop.followUpActions.length === 0) {
    return [] as string[];
  }

  const taskIds: string[] = [];
  const dueDate = new Date(tabletop.exerciseDate);
  dueDate.setUTCDate(dueDate.getUTCDate() + 14);

  for (const action of tabletop.followUpActions) {
    const title = `[Tabletop:${tabletop.title}] ${action}`;
    const existing = await prisma.task.findFirst({
      where: {
        tenantId: tabletop.tenantId,
        tabletopExerciseId: tabletop.id,
        title,
        status: { not: 'DONE' }
      }
    });

    if (existing) {
      taskIds.push(existing.id);
      continue;
    }

    const created = await prisma.task.create({
      data: {
        tenantId: tabletop.tenantId,
        tabletopExerciseId: tabletop.id,
        title,
        description: `Follow-up action from tabletop exercise ${tabletop.title}.`,
        dueDate,
        priority: tabletopPriority(tabletop),
        responseOpsPhase: 'POST_INCIDENT_REVIEW',
        createdBy: tabletop.createdBy
      }
    });

    taskIds.push(created.id);
  }

  return taskIds;
}

async function upsertTabletopFinding(tabletop: TabletopExercise, taskIds: string[]) {
  if (tabletop.status !== 'COMPLETED' || tabletop.gapsIdentified.length === 0) {
    await prisma.finding.updateMany({
      where: {
        tenantId: tabletop.tenantId,
        tabletopExerciseId: tabletop.id,
        sourceType: 'RESPONSE_OPS_TABLETOP',
        status: { in: openFindingStatuses }
      },
      data: {
        status: 'RESOLVED'
      }
    });
    return null;
  }

  const existing = await prisma.finding.findFirst({
    where: {
      tenantId: tabletop.tenantId,
      tabletopExerciseId: tabletop.id,
      sourceType: 'RESPONSE_OPS_TABLETOP',
      status: { in: openFindingStatuses }
    }
  });

  const data = {
    title: `Tabletop gap review: ${tabletop.title}`,
    description: tabletop.gapsIdentified.join('\n'),
    priority: tabletopPriority(tabletop),
    taskId: taskIds[0] ?? null
  };

  if (existing) {
    return prisma.finding.update({
      where: { id: existing.id },
      data
    });
  }

  return prisma.finding.create({
    data: {
      tenantId: tabletop.tenantId,
      tabletopExerciseId: tabletop.id,
      sourceType: 'RESPONSE_OPS_TABLETOP',
      ...data,
      createdBy: tabletop.createdBy
    }
  });
}

async function upsertTabletopRisk(tabletop: TabletopExercise, findingId: string | null, taskIds: string[]) {
  if (tabletop.status !== 'COMPLETED' || (tabletop.gapsIdentified.length === 0 && taskIds.length === 0)) {
    await prisma.riskRegisterItem.updateMany({
      where: {
        tenantId: tabletop.tenantId,
        sourceKey: `tabletop:${tabletop.id}`,
        status: { in: ['OPEN', 'IN_REVIEW', 'MITIGATING', 'ACCEPTED'] }
      },
      data: {
        status: 'CLOSED'
      }
    });
    return null;
  }

  return prisma.riskRegisterItem.upsert({
    where: {
      tenantId_sourceKey: {
        tenantId: tabletop.tenantId,
        sourceKey: `tabletop:${tabletop.id}`
      }
    },
    update: {
      title: `Tabletop readiness risk: ${tabletop.title}`,
      normalizedRiskStatement: `tabletop readiness risk ${tabletop.title}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim(),
      description: tabletop.gapsIdentified.join(' '),
      businessImpactSummary:
        'Tabletop gaps indicate readiness weakness that can slow incident containment, communications, or recovery under pressure.',
      sourceType: 'TABLETOP',
      sourceModule: 'RESPONSE_OPS',
      sourceReference: tabletop.id,
      severity: tabletopPriority(tabletop) === 'HIGH' ? 'HIGH' : 'MEDIUM',
      likelihood: 'MEDIUM',
      impact: tabletopPriority(tabletop) === 'HIGH' ? 'HIGH' : 'MEDIUM',
      status: 'OPEN',
      targetDueAt: taskIds.length ? new Date(tabletop.exerciseDate.getTime() + 14 * 24 * 60 * 60 * 1000) : null,
      linkedFindingIds: findingId ? [findingId] : [],
      linkedTaskIds: taskIds,
      linkedTabletopIds: [tabletop.id],
      reviewedAt: null,
      reviewedBy: null
    },
    create: {
      tenantId: tabletop.tenantId,
      title: `Tabletop readiness risk: ${tabletop.title}`,
      normalizedRiskStatement: `tabletop readiness risk ${tabletop.title}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim(),
      description: tabletop.gapsIdentified.join(' '),
      businessImpactSummary:
        'Tabletop gaps indicate readiness weakness that can slow incident containment, communications, or recovery under pressure.',
      sourceType: 'TABLETOP',
      sourceModule: 'RESPONSE_OPS',
      sourceKey: `tabletop:${tabletop.id}`,
      sourceReference: tabletop.id,
      severity: tabletopPriority(tabletop) === 'HIGH' ? 'HIGH' : 'MEDIUM',
      likelihood: 'MEDIUM',
      impact: tabletopPriority(tabletop) === 'HIGH' ? 'HIGH' : 'MEDIUM',
      targetDueAt: taskIds.length ? new Date(tabletop.exerciseDate.getTime() + 14 * 24 * 60 * 60 * 1000) : null,
      linkedFindingIds: findingId ? [findingId] : [],
      linkedTaskIds: taskIds,
      linkedTabletopIds: [tabletop.id],
      createdBy: tabletop.createdBy
    }
  });
}

export async function syncTabletopConsequences(tabletop: TabletopExercise): Promise<ConsequenceSyncResult> {
  const taskIds = await ensureTabletopTasks(tabletop);
  const finding = await upsertTabletopFinding(tabletop, taskIds);
  const risk = await upsertTabletopRisk(tabletop, finding?.id ?? null, taskIds);

  await prisma.tabletopExercise.update({
    where: { id: tabletop.id },
    data: {
      linkedFindingIds: finding ? [finding.id] : [],
      linkedRiskIds: risk ? [risk.id] : [],
      linkedTaskIds: taskIds
    }
  });

  return {
    findingIds: finding ? [finding.id] : [],
    riskIds: risk ? [risk.id] : [],
    taskIds
  };
}
