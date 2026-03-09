import { Prisma, type IncidentSeverity, type IncidentStatus, type IncidentTimelineEventType, type IncidentType } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { assertTenantReviewer } from '@/lib/trust/reviewers';
import { syncIncidentConsequences } from '@/lib/response-ops/consequences';
import { buildIncidentDefaults, buildIncidentTaskTemplates } from '@/lib/response-ops/templates';

export type IncidentListFilters = {
  status?: string;
  severity?: string;
  incidentType?: string;
  ownerUserId?: string;
  search?: string;
};

function addHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function defaultNextUpdateDueAt(severity: IncidentSeverity, startedAt: Date) {
  if (severity === 'CRITICAL') return addHours(startedAt, 1);
  if (severity === 'HIGH') return addHours(startedAt, 2);
  if (severity === 'MEDIUM') return addHours(startedAt, 4);
  return addHours(startedAt, 24);
}

function dedupeStrings(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

async function assertRelatedReferences(args: {
  tx: Prisma.TransactionClient;
  tenantId: string;
  aiUseCaseId?: string | null;
  aiVendorReviewId?: string | null;
  questionnaireUploadId?: string | null;
  trustInboxItemId?: string | null;
}) {
  const [useCase, vendorReview, questionnaireUpload, trustInboxItem] = await Promise.all([
    args.aiUseCaseId
      ? args.tx.aIUseCase.findFirst({
          where: {
            tenantId: args.tenantId,
            id: args.aiUseCaseId
          },
          select: { id: true }
        })
      : null,
    args.aiVendorReviewId
      ? args.tx.aIVendorReview.findFirst({
          where: {
            tenantId: args.tenantId,
            id: args.aiVendorReviewId
          },
          select: { id: true }
        })
      : null,
    args.questionnaireUploadId
      ? args.tx.questionnaireUpload.findFirst({
          where: {
            tenantId: args.tenantId,
            id: args.questionnaireUploadId
          },
          select: { id: true }
        })
      : null,
    args.trustInboxItemId
      ? args.tx.trustInboxItem.findFirst({
          where: {
            tenantId: args.tenantId,
            id: args.trustInboxItemId
          },
          select: { id: true }
        })
      : null
  ]);

  if (args.aiUseCaseId && !useCase) throw new Error('AI_USE_CASE_NOT_FOUND');
  if (args.aiVendorReviewId && !vendorReview) throw new Error('AI_VENDOR_REVIEW_NOT_FOUND');
  if (args.questionnaireUploadId && !questionnaireUpload) throw new Error('QUESTIONNAIRE_UPLOAD_NOT_FOUND');
  if (args.trustInboxItemId && !trustInboxItem) throw new Error('TRUST_INBOX_ITEM_NOT_FOUND');
}

async function createTimelineEvent(
  tx: Prisma.TransactionClient,
  args: {
    tenantId: string;
    incidentId: string;
    userId: string;
    eventType: IncidentTimelineEventType;
    title: string;
    detail?: string | null;
    isShareable?: boolean;
  }
) {
  return tx.incidentTimelineEvent.create({
    data: {
      tenantId: args.tenantId,
      incidentId: args.incidentId,
      eventType: args.eventType,
      title: args.title,
      detail: args.detail ?? null,
      isShareable: args.isShareable ?? false,
      createdBy: args.userId
    }
  });
}

async function createIncidentRunbookPackTx(
  tx: Prisma.TransactionClient,
  args: {
    tenantId: string;
    userId: string;
    incident: {
      id: string;
      title: string;
      incidentType: 'IDENTITY_COMPROMISE' | 'RANSOMWARE' | 'PHISHING' | 'THIRD_PARTY_BREACH' | 'CLOUD_EXPOSURE' | 'LOST_DEVICE' | 'AI_MISUSE' | 'OTHER';
      severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      startedAt: Date;
      incidentOwnerUserId: string | null;
    };
    runbookId?: string | null;
    assignee?: string | null;
  }
) {
  const defaults = buildIncidentDefaults({
    incidentType: args.incident.incidentType,
    severity: args.incident.severity,
    title: args.incident.title
  });
  const runbookId = args.runbookId ?? defaults.recommendedRunbookId ?? `guided-${args.incident.incidentType.toLowerCase()}`;
  const taskTemplates = buildIncidentTaskTemplates({
    incidentType: args.incident.incidentType,
    severity: args.incident.severity
  });

  const pack = await tx.incidentRunbookPack.create({
    data: {
      tenantId: args.tenantId,
      incidentId: args.incident.id,
      runbookId,
      title: `${args.incident.title} first-hour pack`,
      summary: `Generated ${taskTemplates.length} incident-linked tasks across triage, containment, communications, and follow-up phases.`,
      createdBy: args.userId
    }
  });

  const existingTitles = new Set(
    (
      await tx.task.findMany({
        where: {
          tenantId: args.tenantId,
          incidentId: args.incident.id,
          status: { not: 'DONE' }
        },
        select: { title: true }
      })
    ).map((task) => task.title)
  );

  for (const [index, taskTemplate] of taskTemplates.entries()) {
    const title = `[Incident] ${taskTemplate.title}`;
    if (existingTitles.has(title)) continue;

    await tx.task.create({
      data: {
        tenantId: args.tenantId,
        incidentId: args.incident.id,
        incidentRunbookPackId: pack.id,
        title,
        description: `${taskTemplate.details}\n\nIncident: ${args.incident.title}\nRunbook pack: ${pack.title}`,
        assignee: args.assignee ?? args.incident.incidentOwnerUserId ?? null,
        dueDate: addHours(args.incident.startedAt, taskTemplate.dueOffsetHours),
        priority: taskTemplate.priority,
        responseOpsPhase: taskTemplate.phase,
        responseOpsOrder: index + 1,
        createdBy: args.userId
      }
    });
  }

  await createTimelineEvent(tx, {
    tenantId: args.tenantId,
    incidentId: args.incident.id,
    userId: args.userId,
    eventType: 'RUNBOOK_LAUNCHED',
    title: 'Incident-linked runbook pack launched',
    detail: `Runbook pack ${pack.title} created from ${runbookId}.`
  });

  return tx.incidentRunbookPack.findUniqueOrThrow({
    where: { id: pack.id },
    include: {
      tasks: {
        orderBy: [{ responseOpsOrder: 'asc' }, { dueDate: 'asc' }]
      }
    }
  });
}

export async function listIncidents(tenantId: string, filters: IncidentListFilters = {}) {
  const search = filters.search?.trim();
  return prisma.incident.findMany({
    where: {
      tenantId,
      ...(filters.status ? { status: filters.status as IncidentStatus } : {}),
      ...(filters.severity ? { severity: filters.severity as IncidentSeverity } : {}),
      ...(filters.incidentType ? { incidentType: filters.incidentType as IncidentType } : {}),
      ...(filters.ownerUserId ? { incidentOwnerUserId: filters.ownerUserId } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
              { detectionSource: { contains: search, mode: 'insensitive' } }
            ]
          }
        : {})
    },
    include: {
      runbookPacks: {
        orderBy: { updatedAt: 'desc' },
        take: 3,
        include: {
          tasks: {
            where: { status: { not: 'DONE' } },
            orderBy: [{ responseOpsOrder: 'asc' }, { dueDate: 'asc' }],
            take: 6
          }
        }
      },
      afterActionReports: {
        orderBy: { updatedAt: 'desc' },
        take: 1
      }
    },
    orderBy: [{ status: 'asc' }, { severity: 'desc' }, { updatedAt: 'desc' }],
    take: 80
  });
}

export async function getIncidentDetail(tenantId: string, incidentId: string) {
  const incident = await prisma.incident.findFirstOrThrow({
    where: {
      tenantId,
      id: incidentId
    },
    include: {
      aiUseCase: {
        select: {
          id: true,
          name: true,
          status: true,
          riskTier: true
        }
      },
      aiVendorReview: {
        select: {
          id: true,
          vendorName: true,
          productName: true,
          status: true,
          riskTier: true
        }
      },
      questionnaireUpload: {
        select: {
          id: true,
          filename: true,
          organizationName: true
        }
      },
      trustInboxItem: {
        select: {
          id: true,
          title: true,
          status: true
        }
      },
      timelineEvents: {
        orderBy: { createdAt: 'desc' }
      },
      runbookPacks: {
        orderBy: { updatedAt: 'desc' },
        include: {
          tasks: {
            orderBy: [{ responseOpsOrder: 'asc' }, { dueDate: 'asc' }]
          }
        }
      },
      tasks: {
        orderBy: [{ responseOpsOrder: 'asc' }, { dueDate: 'asc' }, { createdAt: 'asc' }]
      },
      findings: {
        orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }]
      },
      afterActionReports: {
        orderBy: { updatedAt: 'desc' }
      }
    }
  });

  const risks = await prisma.riskRegisterItem.findMany({
    where: {
      tenantId,
      linkedIncidentIds: { has: incidentId }
    },
    orderBy: [{ severity: 'desc' }, { targetDueAt: 'asc' }, { updatedAt: 'desc' }],
    take: 20
  });

  return {
    incident,
    risks
  };
}

export async function createIncidentRecord(args: {
  tenantId: string;
  userId: string;
  input: {
    title?: string;
    description?: string;
    incidentType: IncidentType;
    severity?: IncidentSeverity;
    detectionSource?: string | null;
    reportedBy?: string | null;
    incidentOwnerUserId?: string | null;
    communicationsOwnerUserId?: string | null;
    affectedSystems?: string[];
    affectedServices?: string[];
    affectedVendorNames?: string[];
    aiUseCaseId?: string | null;
    aiVendorReviewId?: string | null;
    questionnaireUploadId?: string | null;
    trustInboxItemId?: string | null;
    startedAt?: Date;
    nextUpdateDueAt?: Date | null;
    executiveSummary?: string | null;
    internalNotes?: string | null;
    guidedStart: boolean;
    launchRunbookPack: boolean;
    runbookId?: string | null;
    assignee?: string | null;
  };
}) {
  const defaults = buildIncidentDefaults({
    incidentType: args.input.incidentType,
    severity: args.input.severity,
    title: args.input.title,
    description: args.input.description
  });
  const startedAt = args.input.startedAt ?? new Date();
  const nextUpdateDueAt = args.input.nextUpdateDueAt ?? defaultNextUpdateDueAt(defaults.severity, startedAt);

  if (args.input.incidentOwnerUserId) {
    await assertTenantReviewer(args.tenantId, args.input.incidentOwnerUserId);
  }
  if (args.input.communicationsOwnerUserId) {
    await assertTenantReviewer(args.tenantId, args.input.communicationsOwnerUserId);
  }

  const created = await prisma.$transaction(async (tx) => {
    await assertRelatedReferences({
      tx,
      tenantId: args.tenantId,
      aiUseCaseId: args.input.aiUseCaseId,
      aiVendorReviewId: args.input.aiVendorReviewId,
      questionnaireUploadId: args.input.questionnaireUploadId,
      trustInboxItemId: args.input.trustInboxItemId
    });

    const incident = await tx.incident.create({
      data: {
        tenantId: args.tenantId,
        title: defaults.title,
        description: defaults.description,
        incidentType: args.input.incidentType,
        severity: defaults.severity,
        status: args.input.guidedStart ? 'TRIAGE' : 'NEW',
        detectionSource: args.input.detectionSource ?? null,
        reportedBy: args.input.reportedBy ?? null,
        incidentOwnerUserId: args.input.incidentOwnerUserId ?? null,
        communicationsOwnerUserId: args.input.communicationsOwnerUserId ?? null,
        affectedSystems: args.input.affectedSystems ?? [],
        affectedServices: args.input.affectedServices ?? [],
        affectedVendorNames: args.input.affectedVendorNames ?? [],
        aiUseCaseId: args.input.aiUseCaseId ?? null,
        aiVendorReviewId: args.input.aiVendorReviewId ?? null,
        questionnaireUploadId: args.input.questionnaireUploadId ?? null,
        trustInboxItemId: args.input.trustInboxItemId ?? null,
        startedAt,
        declaredAt: args.input.guidedStart ? startedAt : null,
        nextUpdateDueAt,
        executiveSummary: args.input.executiveSummary ?? defaults.executiveSummary,
        internalNotes: args.input.internalNotes ?? null,
        createdBy: args.userId
      }
    });

    await createTimelineEvent(tx, {
      tenantId: args.tenantId,
      incidentId: incident.id,
      userId: args.userId,
      eventType: 'CREATED',
      title: 'Incident record created',
      detail: `${incident.title} opened as ${incident.severity} severity ${incident.incidentType.toLowerCase().replace(/_/g, ' ')}.`
    });

    if (args.input.guidedStart) {
      await createTimelineEvent(tx, {
        tenantId: args.tenantId,
        incidentId: incident.id,
        userId: args.userId,
        eventType: 'TRIAGE_STARTED',
        title: 'First-hour triage started',
        detail:
          'Guided incident startup created immediate actions, evidence collection steps, communications actions, and decision prompts.'
      });

      await createTimelineEvent(tx, {
        tenantId: args.tenantId,
        incidentId: incident.id,
        userId: args.userId,
        eventType: 'DECISION_LOG',
        title: 'Initial decision log scaffold created',
        detail: defaults.decisionLogPrompts.map((prompt) => `- ${prompt}`).join('\n')
      });
    }

    if (args.input.guidedStart && args.input.launchRunbookPack) {
      await createIncidentRunbookPackTx(tx, {
        tenantId: args.tenantId,
        userId: args.userId,
        incident,
        runbookId: args.input.runbookId,
        assignee: args.input.assignee
      });
    }

    return incident;
  });

  await syncIncidentConsequences(created);
  return getIncidentDetail(args.tenantId, created.id);
}

export async function updateIncidentRecord(args: {
  tenantId: string;
  incidentId: string;
  actorUserId: string;
  input: {
    title?: string;
    description?: string;
    severity?: IncidentSeverity;
    status?: IncidentStatus;
    detectionSource?: string | null;
    reportedBy?: string | null;
    incidentOwnerUserId?: string | null;
    communicationsOwnerUserId?: string | null;
    affectedSystems?: string[];
    affectedServices?: string[];
    affectedVendorNames?: string[];
    nextUpdateDueAt?: Date | null;
    declaredAt?: Date | null;
    containedAt?: Date | null;
    resolvedAt?: Date | null;
    executiveSummary?: string | null;
    internalNotes?: string | null;
    linkedBoardBriefIds?: string[];
    linkedQuarterlyReviewIds?: string[];
  };
}) {
  if (args.input.incidentOwnerUserId !== undefined) {
    await assertTenantReviewer(args.tenantId, args.input.incidentOwnerUserId);
  }
  if (args.input.communicationsOwnerUserId !== undefined) {
    await assertTenantReviewer(args.tenantId, args.input.communicationsOwnerUserId);
  }

  const previous = await prisma.incident.findFirstOrThrow({
    where: {
      tenantId: args.tenantId,
      id: args.incidentId
    }
  });

  const updated = await prisma.$transaction(async (tx) => {
    const incident = await tx.incident.update({
      where: { id: previous.id },
      data: {
        title: args.input.title,
        description: args.input.description,
        severity: args.input.severity,
        status: args.input.status,
        detectionSource: args.input.detectionSource,
        reportedBy: args.input.reportedBy,
        incidentOwnerUserId: args.input.incidentOwnerUserId,
        communicationsOwnerUserId: args.input.communicationsOwnerUserId,
        affectedSystems: args.input.affectedSystems,
        affectedServices: args.input.affectedServices,
        affectedVendorNames: args.input.affectedVendorNames,
        nextUpdateDueAt: args.input.nextUpdateDueAt,
        declaredAt:
          args.input.declaredAt !== undefined
            ? args.input.declaredAt
            : args.input.status === 'ACTIVE' && !previous.declaredAt
              ? new Date()
              : undefined,
        containedAt:
          args.input.containedAt !== undefined
            ? args.input.containedAt
            : args.input.status === 'CONTAINED' && !previous.containedAt
              ? new Date()
              : undefined,
        resolvedAt:
          args.input.resolvedAt !== undefined
            ? args.input.resolvedAt
            : args.input.status === 'RESOLVED' && !previous.resolvedAt
              ? new Date()
              : undefined,
        executiveSummary: args.input.executiveSummary,
        internalNotes: args.input.internalNotes,
        linkedBoardBriefIds:
          args.input.linkedBoardBriefIds === undefined
            ? undefined
            : dedupeStrings(args.input.linkedBoardBriefIds),
        linkedQuarterlyReviewIds:
          args.input.linkedQuarterlyReviewIds === undefined
            ? undefined
            : dedupeStrings(args.input.linkedQuarterlyReviewIds)
      }
    });

    if (args.input.status && args.input.status !== previous.status) {
      await createTimelineEvent(tx, {
        tenantId: args.tenantId,
        incidentId: incident.id,
        userId: args.actorUserId,
        eventType: args.input.status === 'CONTAINED' ? 'CONTAINMENT_COMPLETED' : 'STATUS_CHANGED',
        title: `Status changed to ${args.input.status.replace(/_/g, ' ').toLowerCase()}`,
        detail: `Incident status moved from ${previous.status} to ${args.input.status}.`
      });
    }

    return incident;
  });

  await syncIncidentConsequences(updated);
  return getIncidentDetail(args.tenantId, updated.id);
}

export async function addIncidentTimelineNote(args: {
  tenantId: string;
  incidentId: string;
  userId: string;
  eventType: IncidentTimelineEventType;
  title: string;
  detail?: string | null;
  isShareable?: boolean;
}) {
  await prisma.incident.findFirstOrThrow({
    where: {
      tenantId: args.tenantId,
      id: args.incidentId
    },
    select: { id: true }
  });

  return prisma.incidentTimelineEvent.create({
    data: {
      tenantId: args.tenantId,
      incidentId: args.incidentId,
      eventType: args.eventType,
      title: args.title,
      detail: args.detail ?? null,
      isShareable: args.isShareable ?? false,
      createdBy: args.userId
    }
  });
}

export async function createIncidentRunbookPack(args: {
  tenantId: string;
  incidentId: string;
  userId: string;
  runbookId?: string | null;
  assignee?: string | null;
}) {
  const incident = await prisma.incident.findFirstOrThrow({
    where: {
      tenantId: args.tenantId,
      id: args.incidentId
    }
  });

  const pack = await prisma.$transaction((tx) =>
    createIncidentRunbookPackTx(tx, {
      tenantId: args.tenantId,
      userId: args.userId,
      incident,
      runbookId: args.runbookId,
      assignee: args.assignee
    })
  );

  await syncIncidentConsequences(incident);
  return pack;
}
