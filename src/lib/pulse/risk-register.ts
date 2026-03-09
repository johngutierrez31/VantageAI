import { prisma } from '@/lib/db/prisma';
import { getPulseMeasuredInputs } from '@/lib/pulse/scoring';

type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
type RiskStatus = 'OPEN' | 'IN_REVIEW' | 'MITIGATING' | 'ACCEPTED' | 'CLOSED';
type SourceModule = 'TRUSTOPS' | 'ASSESSMENTS' | 'TASKS' | 'PULSE' | 'MANUAL';
type SourceType =
  | 'MANUAL'
  | 'FINDING'
  | 'TRUSTOPS_EVIDENCE_GAP'
  | 'TRUSTOPS_REJECTION'
  | 'TRUSTOPS_EVIDENCE_MAP'
  | 'ASSESSMENT_GAP'
  | 'TASK'
  | 'PULSE_CATEGORY';

type RiskCandidate = {
  tenantId: string;
  sourceKey: string;
  sourceType: SourceType;
  sourceModule: SourceModule;
  sourceReference?: string | null;
  title: string;
  normalizedRiskStatement: string;
  description: string;
  businessImpactSummary: string;
  severity: RiskLevel;
  likelihood: RiskLevel;
  impact: RiskLevel;
  targetDueAt?: Date | null;
  linkedControlIds?: string[];
  linkedFindingIds?: string[];
  linkedTaskIds?: string[];
  linkedQuestionnaireIds?: string[];
  linkedEvidenceMapIds?: string[];
  linkedTrustPacketIds?: string[];
  linkedAssessmentIds?: string[];
  ownerUserId?: string | null;
  createdBy: string;
};

export type RiskRegisterFilters = {
  status?: string;
  severity?: string;
  sourceModule?: string;
  ownerUserId?: string;
  overdue?: boolean;
};

function normalizeRiskStatement(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function priorityToRiskLevel(value: string | null | undefined): RiskLevel {
  if (value === 'CRITICAL') return 'CRITICAL';
  if (value === 'HIGH') return 'HIGH';
  if (value === 'LOW') return 'LOW';
  return 'MEDIUM';
}

function scoreToRiskLevel(score: number): RiskLevel {
  if (score <= 0.5) return 'CRITICAL';
  if (score <= 1.5) return 'HIGH';
  if (score <= 2.5) return 'MEDIUM';
  return 'LOW';
}

function sourceTypeFromFinding(sourceType: string): SourceType {
  if (sourceType === 'TRUSTOPS_EVIDENCE_GAP') return 'TRUSTOPS_EVIDENCE_GAP';
  if (sourceType === 'TRUSTOPS_REJECTION') return 'TRUSTOPS_REJECTION';
  if (sourceType === 'TRUSTOPS_EVIDENCE_MAP') return 'TRUSTOPS_EVIDENCE_MAP';
  return 'FINDING';
}

function businessImpactForTrustFinding(sourceType: SourceType) {
  if (sourceType === 'TRUSTOPS_REJECTION') {
    return 'Rejected trust responses can force leadership review, slow procurement, or trigger unsupported commitments.';
  }
  if (sourceType === 'TRUSTOPS_EVIDENCE_GAP') {
    return 'Evidence gaps slow buyer diligence and weaken the organization\'s ability to prove security controls under procurement pressure.';
  }
  return 'TrustOps support weakness reduces buyer confidence and increases operational drag across security diligence workflows.';
}

function mergeStringLists(...values: Array<Array<string> | undefined>) {
  return Array.from(new Set(values.flatMap((value) => value ?? []).filter(Boolean)));
}

export function mergeRiskCandidatesBySourceKey(candidates: RiskCandidate[]) {
  const merged: RiskCandidate[] = [];

  for (const candidate of candidates) {
    const existing = merged.find((item) => item.sourceKey === candidate.sourceKey);
    if (existing) {
      existing.linkedControlIds = mergeStringLists(existing.linkedControlIds, candidate.linkedControlIds);
      existing.linkedFindingIds = mergeStringLists(existing.linkedFindingIds, candidate.linkedFindingIds);
      existing.linkedTaskIds = mergeStringLists(existing.linkedTaskIds, candidate.linkedTaskIds);
      existing.linkedQuestionnaireIds = mergeStringLists(
        existing.linkedQuestionnaireIds,
        candidate.linkedQuestionnaireIds
      );
      existing.linkedEvidenceMapIds = mergeStringLists(existing.linkedEvidenceMapIds, candidate.linkedEvidenceMapIds);
      existing.linkedTrustPacketIds = mergeStringLists(existing.linkedTrustPacketIds, candidate.linkedTrustPacketIds);
      existing.linkedAssessmentIds = mergeStringLists(existing.linkedAssessmentIds, candidate.linkedAssessmentIds);
      continue;
    }
    merged.push({ ...candidate });
  }

  return merged;
}

async function upsertRiskCandidate(candidate: RiskCandidate) {
  return prisma.riskRegisterItem.upsert({
    where: {
      tenantId_sourceKey: {
        tenantId: candidate.tenantId,
        sourceKey: candidate.sourceKey
      }
    },
    update: {
      sourceType: candidate.sourceType,
      sourceModule: candidate.sourceModule,
      sourceReference: candidate.sourceReference ?? null,
      title: candidate.title,
      normalizedRiskStatement: candidate.normalizedRiskStatement,
      description: candidate.description,
      businessImpactSummary: candidate.businessImpactSummary,
      severity: candidate.severity,
      likelihood: candidate.likelihood,
      impact: candidate.impact,
      targetDueAt: candidate.targetDueAt ?? null,
      linkedControlIds: candidate.linkedControlIds ?? [],
      linkedFindingIds: candidate.linkedFindingIds ?? [],
      linkedTaskIds: candidate.linkedTaskIds ?? [],
      linkedQuestionnaireIds: candidate.linkedQuestionnaireIds ?? [],
      linkedEvidenceMapIds: candidate.linkedEvidenceMapIds ?? [],
      linkedTrustPacketIds: candidate.linkedTrustPacketIds ?? [],
      linkedAssessmentIds: candidate.linkedAssessmentIds ?? [],
      ownerUserId: candidate.ownerUserId ?? null,
      reviewedAt: null,
      reviewedBy: null,
      status: 'OPEN'
    },
    create: {
      tenantId: candidate.tenantId,
      sourceKey: candidate.sourceKey,
      sourceType: candidate.sourceType,
      sourceModule: candidate.sourceModule,
      sourceReference: candidate.sourceReference ?? null,
      title: candidate.title,
      normalizedRiskStatement: candidate.normalizedRiskStatement,
      description: candidate.description,
      businessImpactSummary: candidate.businessImpactSummary,
      severity: candidate.severity,
      likelihood: candidate.likelihood,
      impact: candidate.impact,
      targetDueAt: candidate.targetDueAt ?? null,
      linkedControlIds: candidate.linkedControlIds ?? [],
      linkedFindingIds: candidate.linkedFindingIds ?? [],
      linkedTaskIds: candidate.linkedTaskIds ?? [],
      linkedQuestionnaireIds: candidate.linkedQuestionnaireIds ?? [],
      linkedEvidenceMapIds: candidate.linkedEvidenceMapIds ?? [],
      linkedTrustPacketIds: candidate.linkedTrustPacketIds ?? [],
      linkedAssessmentIds: candidate.linkedAssessmentIds ?? [],
      ownerUserId: candidate.ownerUserId ?? null,
      createdBy: candidate.createdBy
    }
  });
}

export async function syncRiskRegister(args: { tenantId: string; userId: string }) {
  const [findings, overdueTasks, measuredInputs] = await Promise.all([
    prisma.finding.findMany({
      where: {
        tenantId: args.tenantId,
        status: { in: ['OPEN', 'IN_PROGRESS'] }
      },
      include: {
        task: {
          select: {
            id: true,
            title: true,
            dueDate: true,
            status: true,
            priority: true
          }
        }
      },
      orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
      take: 80
    }),
    prisma.task.findMany({
      where: {
        tenantId: args.tenantId,
        status: { not: 'DONE' },
        dueDate: { not: null },
        priority: { in: ['HIGH', 'CRITICAL'] }
      },
      orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
      take: 40
    }),
    getPulseMeasuredInputs(args.tenantId)
  ]);

  const candidates: RiskCandidate[] = [];

  for (const finding of findings) {
    const sourceType = sourceTypeFromFinding(finding.sourceType);
    const severity = priorityToRiskLevel(finding.priority);
    const likelihood = finding.supportStrength === 'MISSING' ? 'HIGH' : finding.supportStrength === 'WEAK' ? 'MEDIUM' : severity;
    const impact = sourceType === 'TRUSTOPS_REJECTION' ? 'HIGH' : severity;

    candidates.push({
      tenantId: args.tenantId,
      sourceKey: `finding:${finding.id}`,
      sourceType,
      sourceModule: 'TRUSTOPS',
      sourceReference: finding.id,
      title: finding.title,
      normalizedRiskStatement: normalizeRiskStatement(finding.title),
      description: finding.description,
      businessImpactSummary: businessImpactForTrustFinding(sourceType),
      severity,
      likelihood,
      impact,
      targetDueAt: finding.task?.dueDate ?? null,
      linkedControlIds: finding.controlCode ? [finding.controlCode] : [],
      linkedFindingIds: [finding.id],
      linkedTaskIds: finding.taskId ? [finding.taskId] : [],
      linkedQuestionnaireIds: finding.questionnaireUploadId ? [finding.questionnaireUploadId] : [],
      linkedEvidenceMapIds: finding.evidenceMapId ? [finding.evidenceMapId] : [],
      ownerUserId: finding.ownerUserId,
      createdBy: args.userId
    });
  }

  for (const gap of measuredInputs.assessmentGaps.slice(0, 8)) {
    const severity = scoreToRiskLevel(gap.score);
    const impact = severity === 'LOW' ? 'MEDIUM' : severity;

    candidates.push({
      tenantId: args.tenantId,
      sourceKey: `assessment-gap:${gap.assessmentId}:${gap.controlCode}`,
      sourceType: 'ASSESSMENT_GAP',
      sourceModule: 'ASSESSMENTS',
      sourceReference: `${gap.assessmentId}:${gap.controlCode}`,
      title: `Assessment gap in ${gap.controlCode}`,
      normalizedRiskStatement: normalizeRiskStatement(`Assessment gap in ${gap.controlCode}`),
      description: `${gap.assessmentName}: ${gap.recommendation}`,
      businessImpactSummary: 'Weak assessed controls increase residual risk and make executive posture claims harder to defend.',
      severity,
      likelihood: severity === 'CRITICAL' ? 'HIGH' : 'MEDIUM',
      impact,
      linkedControlIds: [gap.controlCode],
      linkedAssessmentIds: [gap.assessmentId],
      createdBy: args.userId
    });
  }

  const now = new Date();
  for (const task of overdueTasks) {
    if (!task.dueDate || task.dueDate >= now) continue;

    const severity = priorityToRiskLevel(task.priority);
    candidates.push({
      tenantId: args.tenantId,
      sourceKey: `task:${task.id}`,
      sourceType: 'TASK',
      sourceModule: 'TASKS',
      sourceReference: task.id,
      title: `Overdue remediation task: ${task.title}`,
      normalizedRiskStatement: normalizeRiskStatement(task.title),
      description: task.description ?? 'A high-priority remediation task is overdue and still open.',
      businessImpactSummary: 'Overdue remediation tasks extend exposure windows and delay visible posture improvement.',
      severity,
      likelihood: severity === 'CRITICAL' ? 'HIGH' : 'MEDIUM',
      impact: severity,
      targetDueAt: task.dueDate,
      linkedControlIds: task.controlCode ? [task.controlCode] : [],
      linkedTaskIds: [task.id],
      linkedQuestionnaireIds: task.questionnaireUploadId ? [task.questionnaireUploadId] : [],
      linkedEvidenceMapIds: [],
      ownerUserId: task.assignee,
      createdBy: args.userId
    });
  }

  const candidateKeys = new Set<string>();
  const syncedItems = mergeRiskCandidatesBySourceKey(candidates);

  const results = [];
  for (const candidate of syncedItems) {
    candidateKeys.add(candidate.sourceKey);
    results.push(await upsertRiskCandidate(candidate));
  }

  await prisma.riskRegisterItem.updateMany({
    where: {
      tenantId: args.tenantId,
      sourceType: { not: 'MANUAL' },
      sourceKey: { notIn: Array.from(candidateKeys) },
      status: { in: ['OPEN', 'IN_REVIEW', 'MITIGATING'] }
    },
    data: {
      status: 'CLOSED'
    }
  });

  return prisma.riskRegisterItem.findMany({
    where: {
      tenantId: args.tenantId
    },
    orderBy: [{ severity: 'desc' }, { targetDueAt: 'asc' }, { updatedAt: 'desc' }],
    take: 120
  });
}

export async function listRiskRegisterItems(tenantId: string, filters: RiskRegisterFilters = {}) {
  const now = new Date();
  return prisma.riskRegisterItem.findMany({
    where: {
      tenantId,
      ...(filters.status ? { status: filters.status as RiskStatus } : {}),
      ...(filters.severity ? { severity: filters.severity as RiskLevel } : {}),
      ...(filters.sourceModule ? { sourceModule: filters.sourceModule as SourceModule } : {}),
      ...(filters.ownerUserId ? { ownerUserId: filters.ownerUserId } : {}),
      ...(filters.overdue ? { status: { in: ['OPEN', 'IN_REVIEW', 'MITIGATING'] }, targetDueAt: { lt: now } } : {})
    },
    orderBy: [{ severity: 'desc' }, { targetDueAt: 'asc' }, { updatedAt: 'desc' }],
    take: 200
  });
}

export async function createManualRiskItem(args: {
  tenantId: string;
  userId: string;
  title: string;
  description: string;
  businessImpactSummary: string;
  severity: RiskLevel;
  likelihood: RiskLevel;
  impact: RiskLevel;
  status?: RiskStatus;
  ownerUserId?: string | null;
  targetDueAt?: Date | null;
  linkedControlIds?: string[];
  linkedFindingIds?: string[];
  linkedTaskIds?: string[];
  linkedQuestionnaireIds?: string[];
  linkedEvidenceMapIds?: string[];
  linkedTrustPacketIds?: string[];
  linkedAssessmentIds?: string[];
  reviewNotes?: string;
}) {
  return prisma.riskRegisterItem.create({
    data: {
      tenantId: args.tenantId,
      sourceType: 'MANUAL',
      sourceModule: 'MANUAL',
      sourceKey: `manual:${crypto.randomUUID()}`,
      title: args.title,
      normalizedRiskStatement: normalizeRiskStatement(args.title),
      description: args.description,
      businessImpactSummary: args.businessImpactSummary,
      severity: args.severity,
      likelihood: args.likelihood,
      impact: args.impact,
      status: args.status ?? 'OPEN',
      ownerUserId: args.ownerUserId ?? null,
      targetDueAt: args.targetDueAt ?? null,
      linkedControlIds: args.linkedControlIds ?? [],
      linkedFindingIds: args.linkedFindingIds ?? [],
      linkedTaskIds: args.linkedTaskIds ?? [],
      linkedQuestionnaireIds: args.linkedQuestionnaireIds ?? [],
      linkedEvidenceMapIds: args.linkedEvidenceMapIds ?? [],
      linkedTrustPacketIds: args.linkedTrustPacketIds ?? [],
      linkedAssessmentIds: args.linkedAssessmentIds ?? [],
      reviewNotes: args.reviewNotes,
      createdBy: args.userId
    }
  });
}

export async function updateRiskRegisterItem(args: {
  tenantId: string;
  riskId: string;
  status?: RiskStatus;
  ownerUserId?: string | null;
  targetDueAt?: Date | null;
  reviewNotes?: string;
  title?: string;
  description?: string;
  businessImpactSummary?: string;
  severity?: RiskLevel;
  likelihood?: RiskLevel;
  impact?: RiskLevel;
  actorUserId: string;
}) {
  const existing = await prisma.riskRegisterItem.findFirstOrThrow({
    where: {
      tenantId: args.tenantId,
      id: args.riskId
    }
  });

  return prisma.riskRegisterItem.update({
    where: { id: existing.id },
    data: {
      title: args.title,
      normalizedRiskStatement: args.title ? normalizeRiskStatement(args.title) : undefined,
      description: args.description,
      businessImpactSummary: args.businessImpactSummary,
      severity: args.severity,
      likelihood: args.likelihood,
      impact: args.impact,
      status: args.status,
      ownerUserId: args.ownerUserId,
      targetDueAt: args.targetDueAt,
      reviewNotes: args.reviewNotes,
      reviewedBy: args.status || args.reviewNotes ? args.actorUserId : undefined,
      reviewedAt: args.status || args.reviewNotes ? new Date() : undefined
    }
  });
}
