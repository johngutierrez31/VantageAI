import type {
  AIGovernanceStatus,
  AIRiskTier,
  AIVendorReview,
  AIUseCase,
  FindingStatus,
  TaskPriority
} from '@prisma/client';
import { prisma } from '@/lib/db/prisma';

type ConsequenceSyncResult = {
  findingIds: string[];
  riskIds: string[];
  taskIds: string[];
};

const openFindingStatuses: FindingStatus[] = ['OPEN', 'IN_PROGRESS'];

type SyncEntity = {
  id: string;
  tenantId: string;
  status: AIGovernanceStatus;
  riskTier: AIRiskTier;
  title: string;
  description?: string | null;
  ownerUserId?: string | null;
  assignedReviewerUserId?: string | null;
  reviewDueAt?: Date | null;
  matchedPolicyIds: string[];
  decisionConditions: string[];
  requiredControls: string[];
  primaryRisks: string[];
  linkedFindingIds: string[];
  linkedRiskIds: string[];
  linkedTaskIds: string[];
  createdBy: string;
  type: 'AI_USE_CASE' | 'AI_VENDOR_REVIEW';
};

function mergeIds(...values: Array<string[] | undefined>) {
  return Array.from(new Set(values.flatMap((value) => value ?? []).filter(Boolean)));
}

function toTaskPriority(riskTier: AIRiskTier): TaskPriority {
  if (riskTier === 'CRITICAL') return 'CRITICAL';
  if (riskTier === 'HIGH') return 'HIGH';
  if (riskTier === 'LOW') return 'LOW';
  return 'MEDIUM';
}

function toRiskLevel(riskTier: AIRiskTier) {
  if (riskTier === 'CRITICAL') return 'CRITICAL' as const;
  if (riskTier === 'HIGH') return 'HIGH' as const;
  if (riskTier === 'LOW') return 'LOW' as const;
  return 'MEDIUM' as const;
}

function shouldCreateRiskOrFinding(entity: SyncEntity) {
  return entity.status === 'REJECTED' || entity.riskTier === 'HIGH' || entity.riskTier === 'CRITICAL';
}

function shouldCreateFollowupTask(entity: SyncEntity) {
  return entity.status === 'APPROVED_WITH_CONDITIONS' || entity.decisionConditions.length > 0;
}

function sourceTypeForEntity(entity: SyncEntity) {
  if (entity.type === 'AI_VENDOR_REVIEW') return 'AI_VENDOR_REVIEW' as const;
  if (entity.status === 'REJECTED') return 'AI_GOVERNANCE_REJECTION' as const;
  return 'AI_GOVERNANCE_HIGH_RISK' as const;
}

function findingTitle(entity: SyncEntity) {
  if (entity.type === 'AI_VENDOR_REVIEW') {
    return `AI vendor review risk: ${entity.title}`;
  }
  if (entity.status === 'REJECTED') {
    return `Rejected AI use case: ${entity.title}`;
  }
  return `High-risk AI use case: ${entity.title}`;
}

function findingDescription(entity: SyncEntity) {
  const risks = entity.primaryRisks.length
    ? entity.primaryRisks.slice(0, 3).join(' ')
    : 'The workflow requires governance attention before it should proceed.';
  const conditions = entity.decisionConditions.length
    ? ` Conditions: ${entity.decisionConditions.slice(0, 3).join(' ')}`
    : '';
  return `${entity.description ?? entity.title}. ${risks}${conditions}`.trim();
}

function followupTaskTitle(entity: SyncEntity) {
  return entity.type === 'AI_VENDOR_REVIEW'
    ? `Complete AI vendor follow-up for ${entity.title}`
    : `Complete AI governance conditions for ${entity.title}`;
}

function followupTaskDescription(entity: SyncEntity) {
  const conditions = entity.decisionConditions.length
    ? entity.decisionConditions.join(' ')
    : 'Record and complete required governance controls before broad rollout.';
  const controls = entity.requiredControls.length ? ` Required controls: ${entity.requiredControls.join(' ')}` : '';
  return `${conditions}${controls}`.trim();
}

function riskTitle(entity: SyncEntity) {
  return entity.type === 'AI_VENDOR_REVIEW'
    ? `AI vendor governance risk: ${entity.title}`
    : `AI governance risk: ${entity.title}`;
}

function riskDescription(entity: SyncEntity) {
  return `${entity.description ?? entity.title}. ${entity.primaryRisks.join(' ')}`.trim();
}

function businessImpactSummary(entity: SyncEntity) {
  if (entity.type === 'AI_VENDOR_REVIEW') {
    return 'Unreviewed AI vendor handling can create procurement, privacy, and contractual exposure across AI-enabled workflows.';
  }
  return 'Poorly governed AI use can expose customer data, create unsupported commitments, and weaken executive oversight of operational risk.';
}

async function upsertFinding(entity: SyncEntity, taskId: string | null) {
  const sourceType = sourceTypeForEntity(entity);
  const where =
    entity.type === 'AI_VENDOR_REVIEW'
      ? {
          tenantId: entity.tenantId,
          sourceType,
          aiVendorReviewId: entity.id,
          status: { in: openFindingStatuses }
        }
      : {
          tenantId: entity.tenantId,
          sourceType,
          aiUseCaseId: entity.id,
          status: { in: openFindingStatuses }
        };

  const existing = await prisma.finding.findFirst({ where });
  if (existing) {
    return prisma.finding.update({
      where: { id: existing.id },
      data: {
        title: findingTitle(entity),
        description: findingDescription(entity),
        ownerUserId: entity.ownerUserId ?? entity.assignedReviewerUserId ?? null,
        priority: toTaskPriority(entity.riskTier),
        taskId
      }
    });
  }

  return prisma.finding.create({
    data: {
      tenantId: entity.tenantId,
      sourceType,
      title: findingTitle(entity),
      description: findingDescription(entity),
      ownerUserId: entity.ownerUserId ?? entity.assignedReviewerUserId ?? null,
      aiUseCaseId: entity.type === 'AI_USE_CASE' ? entity.id : undefined,
      aiVendorReviewId: entity.type === 'AI_VENDOR_REVIEW' ? entity.id : undefined,
      taskId,
      priority: toTaskPriority(entity.riskTier),
      createdBy: entity.createdBy
    }
  });
}

async function resolveFindings(entity: SyncEntity) {
  return prisma.finding.updateMany({
    where: {
      tenantId: entity.tenantId,
      ...(entity.type === 'AI_USE_CASE' ? { aiUseCaseId: entity.id } : { aiVendorReviewId: entity.id }),
      sourceType:
        entity.type === 'AI_USE_CASE'
          ? { in: ['AI_GOVERNANCE_HIGH_RISK', 'AI_GOVERNANCE_REJECTION'] }
          : 'AI_VENDOR_REVIEW',
      status: { in: ['OPEN', 'IN_PROGRESS'] }
    },
    data: {
      status: 'RESOLVED'
    }
  });
}

async function syncFollowupTask(entity: SyncEntity) {
  const existing = await prisma.task.findFirst({
    where: {
      tenantId: entity.tenantId,
      ...(entity.type === 'AI_USE_CASE' ? { aiUseCaseId: entity.id } : { aiVendorReviewId: entity.id }),
      title: followupTaskTitle(entity),
      status: { not: 'DONE' }
    }
  });

  if (!shouldCreateFollowupTask(entity)) {
    await prisma.task.updateMany({
      where: {
        tenantId: entity.tenantId,
        ...(entity.type === 'AI_USE_CASE' ? { aiUseCaseId: entity.id } : { aiVendorReviewId: entity.id }),
        title: followupTaskTitle(entity),
        status: { not: 'DONE' }
      },
      data: {
        status: 'DONE'
      }
    });
    return null;
  }

  if (existing) {
    return prisma.task.update({
      where: { id: existing.id },
      data: {
        description: followupTaskDescription(entity),
        assignee: entity.assignedReviewerUserId ?? entity.ownerUserId ?? null,
        dueDate: entity.reviewDueAt ?? null,
        priority: toTaskPriority(entity.riskTier),
        status: 'TODO'
      }
    });
  }

  return prisma.task.create({
    data: {
      tenantId: entity.tenantId,
      aiUseCaseId: entity.type === 'AI_USE_CASE' ? entity.id : undefined,
      aiVendorReviewId: entity.type === 'AI_VENDOR_REVIEW' ? entity.id : undefined,
      title: followupTaskTitle(entity),
      description: followupTaskDescription(entity),
      assignee: entity.assignedReviewerUserId ?? entity.ownerUserId ?? null,
      dueDate: entity.reviewDueAt ?? null,
      priority: toTaskPriority(entity.riskTier),
      createdBy: entity.createdBy
    }
  });
}

async function upsertRisk(entity: SyncEntity, findingId: string | null, taskId: string | null) {
  const sourceKey = entity.type === 'AI_USE_CASE' ? `ai-use-case:${entity.id}` : `ai-vendor-review:${entity.id}`;
  return prisma.riskRegisterItem.upsert({
    where: {
      tenantId_sourceKey: {
        tenantId: entity.tenantId,
        sourceKey
      }
    },
    update: {
      title: riskTitle(entity),
      normalizedRiskStatement: riskTitle(entity).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(),
      description: riskDescription(entity),
      businessImpactSummary: businessImpactSummary(entity),
      sourceType: entity.type === 'AI_USE_CASE' ? 'AI_USE_CASE' : 'AI_VENDOR_REVIEW',
      sourceModule: 'AI_GOVERNANCE',
      sourceReference: entity.id,
      severity: toRiskLevel(entity.riskTier),
      likelihood: toRiskLevel(entity.riskTier),
      impact: entity.status === 'REJECTED' ? 'HIGH' : toRiskLevel(entity.riskTier),
      status: 'OPEN',
      ownerUserId: entity.ownerUserId ?? entity.assignedReviewerUserId ?? null,
      targetDueAt: entity.reviewDueAt ?? null,
      linkedControlIds: entity.matchedPolicyIds,
      linkedFindingIds: mergeIds(entity.linkedFindingIds, findingId ? [findingId] : []),
      linkedTaskIds: mergeIds(entity.linkedTaskIds, taskId ? [taskId] : []),
      linkedAiUseCaseIds: entity.type === 'AI_USE_CASE' ? [entity.id] : [],
      linkedAiVendorReviewIds: entity.type === 'AI_VENDOR_REVIEW' ? [entity.id] : [],
      reviewedAt: null,
      reviewedBy: null
    },
    create: {
      tenantId: entity.tenantId,
      title: riskTitle(entity),
      normalizedRiskStatement: riskTitle(entity).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(),
      description: riskDescription(entity),
      businessImpactSummary: businessImpactSummary(entity),
      sourceType: entity.type === 'AI_USE_CASE' ? 'AI_USE_CASE' : 'AI_VENDOR_REVIEW',
      sourceModule: 'AI_GOVERNANCE',
      sourceKey,
      sourceReference: entity.id,
      severity: toRiskLevel(entity.riskTier),
      likelihood: toRiskLevel(entity.riskTier),
      impact: entity.status === 'REJECTED' ? 'HIGH' : toRiskLevel(entity.riskTier),
      ownerUserId: entity.ownerUserId ?? entity.assignedReviewerUserId ?? null,
      targetDueAt: entity.reviewDueAt ?? null,
      linkedControlIds: entity.matchedPolicyIds,
      linkedFindingIds: mergeIds(entity.linkedFindingIds, findingId ? [findingId] : []),
      linkedTaskIds: mergeIds(entity.linkedTaskIds, taskId ? [taskId] : []),
      linkedAiUseCaseIds: entity.type === 'AI_USE_CASE' ? [entity.id] : [],
      linkedAiVendorReviewIds: entity.type === 'AI_VENDOR_REVIEW' ? [entity.id] : [],
      createdBy: entity.createdBy
    }
  });
}

async function closeRisk(entity: SyncEntity) {
  const sourceKey = entity.type === 'AI_USE_CASE' ? `ai-use-case:${entity.id}` : `ai-vendor-review:${entity.id}`;
  return prisma.riskRegisterItem.updateMany({
    where: {
      tenantId: entity.tenantId,
      sourceKey,
      status: { in: ['OPEN', 'IN_REVIEW', 'MITIGATING', 'ACCEPTED'] }
    },
    data: {
      status: 'CLOSED'
    }
  });
}

async function syncConsequences(entity: SyncEntity): Promise<ConsequenceSyncResult> {
  const task = await syncFollowupTask(entity);

  if (!shouldCreateRiskOrFinding(entity)) {
    await Promise.all([resolveFindings(entity), closeRisk(entity)]);
    return {
      findingIds: [],
      riskIds: [],
      taskIds: task ? [task.id] : []
    };
  }

  const finding = await upsertFinding(entity, task?.id ?? null);
  const risk = await upsertRisk(entity, finding.id, task?.id ?? null);

  return {
    findingIds: [finding.id],
    riskIds: [risk.id],
    taskIds: task ? [task.id] : []
  };
}

export async function syncAIUseCaseConsequences(useCase: Pick<
  AIUseCase,
  | 'id'
  | 'tenantId'
  | 'status'
  | 'riskTier'
  | 'name'
  | 'description'
  | 'assignedReviewerUserId'
  | 'reviewDueAt'
  | 'matchedPolicyIds'
  | 'decisionConditions'
  | 'requiredControls'
  | 'primaryRisks'
  | 'linkedFindingIds'
  | 'linkedRiskIds'
  | 'linkedTaskIds'
  | 'createdBy'
>) {
  return syncConsequences({
    id: useCase.id,
    tenantId: useCase.tenantId,
    type: 'AI_USE_CASE',
    status: useCase.status,
    riskTier: useCase.riskTier,
    title: useCase.name,
    description: useCase.description,
    ownerUserId: null,
    assignedReviewerUserId: useCase.assignedReviewerUserId,
    reviewDueAt: useCase.reviewDueAt,
    matchedPolicyIds: useCase.matchedPolicyIds,
    decisionConditions: useCase.decisionConditions,
    requiredControls: useCase.requiredControls,
    primaryRisks: useCase.primaryRisks,
    linkedFindingIds: useCase.linkedFindingIds,
    linkedRiskIds: useCase.linkedRiskIds,
    linkedTaskIds: useCase.linkedTaskIds,
    createdBy: useCase.createdBy
  });
}

export async function syncAIVendorReviewConsequences(vendorReview: Pick<
  AIVendorReview,
  | 'id'
  | 'tenantId'
  | 'status'
  | 'riskTier'
  | 'vendorName'
  | 'productName'
  | 'riskNotes'
  | 'ownerUserId'
  | 'assignedReviewerUserId'
  | 'reviewDueAt'
  | 'matchedPolicyIds'
  | 'decisionConditions'
  | 'requiredControls'
  | 'primaryRisks'
  | 'linkedFindingIds'
  | 'linkedRiskIds'
  | 'linkedTaskIds'
  | 'createdBy'
>) {
  return syncConsequences({
    id: vendorReview.id,
    tenantId: vendorReview.tenantId,
    type: 'AI_VENDOR_REVIEW',
    status: vendorReview.status,
    riskTier: vendorReview.riskTier,
    title: `${vendorReview.vendorName} - ${vendorReview.productName}`,
    description: vendorReview.riskNotes,
    ownerUserId: vendorReview.ownerUserId,
    assignedReviewerUserId: vendorReview.assignedReviewerUserId,
    reviewDueAt: vendorReview.reviewDueAt,
    matchedPolicyIds: vendorReview.matchedPolicyIds,
    decisionConditions: vendorReview.decisionConditions,
    requiredControls: vendorReview.requiredControls,
    primaryRisks: vendorReview.primaryRisks,
    linkedFindingIds: vendorReview.linkedFindingIds,
    linkedRiskIds: vendorReview.linkedRiskIds,
    linkedTaskIds: vendorReview.linkedTaskIds,
    createdBy: vendorReview.createdBy
  });
}
