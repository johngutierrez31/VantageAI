import { prisma } from '@/lib/db/prisma';
import { computeScoreFromResponses } from '@/lib/assessment/metrics';

type PulsePeriodType = 'MONTHLY' | 'QUARTERLY';
type PulseCategoryKey = 'ASSESSMENTS' | 'FINDINGS' | 'REMEDIATION' | 'TRUSTOPS' | 'BUYER_READINESS';

type CategoryDraft = {
  categoryKey: PulseCategoryKey;
  label: string;
  score: number;
  delta?: number | null;
  weight: number;
  measuredValue: number;
  benchmarkValue: number | null;
  summaryText: string;
};

export type PulseScorecardDraft = {
  categoryScores: CategoryDraft[];
  overallScore: number;
  overallDelta: number | null;
  summaryText: string;
};

export type AssessmentGapCandidate = {
  assessmentId: string;
  assessmentName: string;
  controlCode: string;
  domain: string;
  score: number;
  recommendation: string;
};

export type PulseMeasuredInputs = {
  snapshotDate: Date;
  latestAssessmentScore: number | null;
  averageAssessmentScore: number | null;
  assessedControlCount: number;
  scoredAssessmentCount: number;
  assessmentGaps: AssessmentGapCandidate[];
  openFindings: number;
  overdueFindings: number;
  overdueTasks: number;
  blockedTasks: number;
  criticalTasks: number;
  openEvidenceGaps: number;
  trustReviewBacklog: number;
  answerReuseCount: number;
  approvedAnswerCount: number;
  approvedQuestionnaireCount: number;
  approvedEvidenceMapsCount: number;
  trustPacketsExported: number;
  staleEvidenceCount: number;
  trustInboxBacklog: number;
};

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Number(value.toFixed(1))));
}

function roundScore(value: number | null | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) return null;
  return Number(value.toFixed(1));
}

function toRiskPenalty(unitPenalty: number, count: number) {
  return unitPenalty * Math.max(0, count);
}

export function buildPulseReportingPeriod(snapshotDate: Date, periodType: PulsePeriodType) {
  if (periodType === 'MONTHLY') {
    const month = `${snapshotDate.getUTCMonth() + 1}`.padStart(2, '0');
    return `${snapshotDate.getUTCFullYear()}-${month}`;
  }

  const quarter = Math.floor(snapshotDate.getUTCMonth() / 3) + 1;
  return `${snapshotDate.getUTCFullYear()}-Q${quarter}`;
}

export function buildPulseSnapshotName(reportingPeriod: string, periodType: PulsePeriodType) {
  return `${periodType === 'MONTHLY' ? 'Monthly' : 'Quarterly'} Executive Scorecard ${reportingPeriod}`;
}

function buildAssessmentCategory(inputs: PulseMeasuredInputs) {
  const base = inputs.averageAssessmentScore === null ? 0 : (inputs.averageAssessmentScore / 4) * 100;
  const confidencePenalty = inputs.scoredAssessmentCount === 0 ? 0 : Math.max(0, 20 - inputs.assessedControlCount * 1.5);
  const score = clampScore(base - confidencePenalty);

  return {
    categoryKey: 'ASSESSMENTS' as const,
    label: 'Assessment Coverage',
    score,
    weight: 0.25,
    measuredValue: inputs.averageAssessmentScore ?? 0,
    benchmarkValue: 3.2,
    summaryText:
      inputs.scoredAssessmentCount === 0
        ? 'No scored assessments are available yet, so leadership posture is weakly evidenced.'
        : `${inputs.scoredAssessmentCount} assessed workspace(s) contributed an average control score of ${(inputs.averageAssessmentScore ?? 0).toFixed(2)} / 4 across ${inputs.assessedControlCount} controls.`
  };
}

function buildFindingsCategory(inputs: PulseMeasuredInputs) {
  const score = clampScore(
    100 -
      toRiskPenalty(7, inputs.openFindings) -
      toRiskPenalty(10, inputs.overdueFindings) -
      toRiskPenalty(12, inputs.openEvidenceGaps)
  );

  return {
    categoryKey: 'FINDINGS' as const,
    label: 'Open Risk Pressure',
    score,
    weight: 0.25,
    measuredValue: inputs.openFindings,
    benchmarkValue: 5,
    summaryText: `${inputs.openFindings} open finding(s), ${inputs.overdueFindings} overdue finding(s), and ${inputs.openEvidenceGaps} active evidence-gap signal(s) are currently contributing pressure.`
  };
}

function buildRemediationCategory(inputs: PulseMeasuredInputs) {
  const score = clampScore(
    100 -
      toRiskPenalty(8, inputs.overdueTasks) -
      toRiskPenalty(10, inputs.blockedTasks) -
      toRiskPenalty(12, inputs.criticalTasks)
  );

  return {
    categoryKey: 'REMEDIATION' as const,
    label: 'Remediation Cadence',
    score,
    weight: 0.2,
    measuredValue: inputs.overdueTasks,
    benchmarkValue: 3,
    summaryText: `${inputs.overdueTasks} overdue task(s), ${inputs.blockedTasks} blocked task(s), and ${inputs.criticalTasks} critical task(s) are affecting remediation velocity.`
  };
}

function buildTrustOpsCategory(inputs: PulseMeasuredInputs) {
  const score = clampScore(
    100 -
      toRiskPenalty(10, inputs.trustReviewBacklog) -
      toRiskPenalty(6, inputs.trustInboxBacklog) -
      toRiskPenalty(4, inputs.staleEvidenceCount)
  );

  return {
    categoryKey: 'TRUSTOPS' as const,
    label: 'TrustOps Operations',
    score,
    weight: 0.15,
    measuredValue: inputs.trustReviewBacklog,
    benchmarkValue: 2,
    summaryText: `${inputs.trustReviewBacklog} active TrustOps review item(s), ${inputs.trustInboxBacklog} trust inbox item(s), and ${inputs.staleEvidenceCount} stale evidence artifact(s) affect buyer readiness throughput.`
  };
}

function buildBuyerReadinessCategory(inputs: PulseMeasuredInputs) {
  const score = clampScore(
    Math.min(
      100,
      inputs.approvedAnswerCount * 4 +
        inputs.answerReuseCount * 3 +
        inputs.approvedQuestionnaireCount * 10 +
        inputs.approvedEvidenceMapsCount * 10 +
        inputs.trustPacketsExported * 15
    )
  );

  return {
    categoryKey: 'BUYER_READINESS' as const,
    label: 'Buyer Readiness Assets',
    score,
    weight: 0.15,
    measuredValue: inputs.answerReuseCount,
    benchmarkValue: 10,
    summaryText: `${inputs.approvedAnswerCount} approved library answer(s), ${inputs.answerReuseCount} reuse event(s), ${inputs.approvedEvidenceMapsCount} approved evidence map(s), and ${inputs.trustPacketsExported} exported trust packet(s) support repeatable buyer diligence.`
  };
}

function computeCategoryDeltas(
  categories: CategoryDraft[],
  previousCategories: Array<{ categoryKey: string; score: number }> | undefined
) {
  const previousByKey = new Map((previousCategories ?? []).map((entry) => [entry.categoryKey, entry.score]));

  return categories.map((category) => ({
    ...category,
    delta: previousByKey.has(category.categoryKey)
      ? roundScore(category.score - (previousByKey.get(category.categoryKey) ?? 0))
      : null
  }));
}

function buildPulseSummary(args: {
  overallScore: number;
  overallDelta: number | null;
  weakestCategory: CategoryDraft;
  inputs: PulseMeasuredInputs;
}) {
  const direction =
    args.overallDelta === null
      ? 'No prior Pulse snapshot exists yet.'
      : args.overallDelta > 0
        ? `Posture improved by ${args.overallDelta.toFixed(1)} points since the prior snapshot.`
        : args.overallDelta < 0
          ? `Posture declined by ${Math.abs(args.overallDelta).toFixed(1)} points since the prior snapshot.`
          : 'Posture is flat versus the prior snapshot.';

  const postureBand =
    args.overallScore >= 80
      ? 'healthy'
      : args.overallScore >= 65
        ? 'stable but exposed'
        : args.overallScore >= 50
          ? 'requires leadership attention'
          : 'materially stressed';

  return [
    `Overall posture is ${postureBand} at ${args.overallScore.toFixed(1)} / 100. ${direction}`,
    `${args.weakestCategory.label} is the weakest measured category at ${args.weakestCategory.score.toFixed(1)} / 100.`,
    `${args.inputs.openFindings} open finding(s), ${args.inputs.overdueTasks} overdue task(s), and ${args.inputs.trustReviewBacklog} TrustOps review item(s) are the main current drivers.`
  ].join(' ');
}

export async function getPulseMeasuredInputs(tenantId: string, snapshotDate = new Date()): Promise<PulseMeasuredInputs> {
  const now = snapshotDate;
  const staleCutoff = new Date(now);
  staleCutoff.setUTCDate(staleCutoff.getUTCDate() - 90);

  const [
    assessments,
    openFindings,
    overdueFindings,
    overdueTasks,
    blockedTasks,
    criticalTasks,
    openEvidenceGaps,
    questionnaireReviews,
    evidenceMapReviews,
    trustPacketReviews,
    answerReuse,
    approvedAnswerCount,
    approvedQuestionnaireCount,
    approvedEvidenceMapsCount,
    trustPacketsExported,
    staleEvidenceCount,
    trustInboxBacklog
  ] = await Promise.all([
    prisma.assessment.findMany({
      where: {
        tenantId,
        status: { in: ['IN_PROGRESS', 'COMPLETED'] }
      },
      include: {
        responses: {
          include: {
            question: {
              include: {
                control: true
              }
            },
            evidenceLinks: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' },
      take: 6
    }),
    prisma.finding.count({
      where: {
        tenantId,
        status: { in: ['OPEN', 'IN_PROGRESS'] }
      }
    }),
    prisma.finding.count({
      where: {
        tenantId,
        status: { in: ['OPEN', 'IN_PROGRESS'] },
        task: {
          is: {
            status: { not: 'DONE' },
            dueDate: { lt: now }
          }
        }
      }
    }),
    prisma.task.count({
      where: {
        tenantId,
        status: { not: 'DONE' },
        dueDate: { lt: now }
      }
    }),
    prisma.task.count({
      where: {
        tenantId,
        status: 'BLOCKED'
      }
    }),
    prisma.task.count({
      where: {
        tenantId,
        status: { not: 'DONE' },
        priority: 'CRITICAL'
      }
    }),
    prisma.finding.count({
      where: {
        tenantId,
        status: { in: ['OPEN', 'IN_PROGRESS'] },
        sourceType: { in: ['TRUSTOPS_EVIDENCE_GAP', 'TRUSTOPS_EVIDENCE_MAP'] }
      }
    }),
    prisma.questionnaireUpload.count({
      where: {
        tenantId,
        status: { in: ['DRAFTED', 'NEEDS_REVIEW'] }
      }
    }),
    prisma.evidenceMap.count({
      where: {
        tenantId,
        status: { in: ['DRAFT', 'NEEDS_REVIEW'] }
      }
    }),
    prisma.trustPacket.count({
      where: {
        tenantId,
        status: { in: ['DRAFT', 'READY_FOR_REVIEW'] }
      }
    }),
    prisma.approvedAnswer.aggregate({
      where: {
        tenantId,
        status: 'ACTIVE'
      },
      _sum: {
        usageCount: true
      }
    }),
    prisma.approvedAnswer.count({
      where: {
        tenantId,
        status: 'ACTIVE'
      }
    }),
    prisma.questionnaireUpload.count({
      where: {
        tenantId,
        status: { in: ['APPROVED', 'EXPORTED'] }
      }
    }),
    prisma.evidenceMap.count({
      where: {
        tenantId,
        status: 'APPROVED'
      }
    }),
    prisma.trustPacket.count({
      where: {
        tenantId,
        lastExportedAt: { not: null }
      }
    }),
    prisma.evidence.count({
      where: {
        tenantId,
        createdAt: { lt: staleCutoff }
      }
    }),
    prisma.trustInboxItem.count({
      where: {
        tenantId,
        status: { in: ['NEW', 'IN_REVIEW', 'DRAFT_READY'] }
      }
    })
  ]);

  let latestAssessmentScore: number | null = null;
  let scoredAssessmentCount = 0;
  let assessmentTotal = 0;
  let assessedControlCount = 0;
  const assessmentGaps: AssessmentGapCandidate[] = [];

  for (const assessment of assessments) {
    if (!assessment.responses.length) continue;

    const score = computeScoreFromResponses(
      assessment.responses.map((response) => ({
        id: response.questionId,
        prompt: response.question.prompt,
        weight: response.question.weight,
        control: {
          code: response.question.control.code,
          domain: response.question.control.domain,
          title: response.question.control.title,
          weight: response.question.control.weight
        }
      })),
      assessment.responses.map((response) => ({
        questionId: response.questionId,
        score: response.score,
        confidence: response.confidence,
        answer: response.answer,
        evidenceLinks: response.evidenceLinks.map((link) => ({ evidenceId: link.evidenceId }))
      }))
    );

    scoredAssessmentCount += 1;
    assessmentTotal += score.overall;
    if (latestAssessmentScore === null) {
      latestAssessmentScore = score.overall;
    }

    assessedControlCount += new Set(
      assessment.responses.map((response) => response.question.control.code)
    ).size;

    for (const gap of score.gaps.slice(0, 5)) {
      assessmentGaps.push({
        assessmentId: assessment.id,
        assessmentName: assessment.name,
        controlCode: gap.controlCode,
        domain: gap.domain,
        score: gap.score,
        recommendation: gap.recommendation
      });
    }
  }

  return {
    snapshotDate,
    latestAssessmentScore,
    averageAssessmentScore: scoredAssessmentCount ? Number((assessmentTotal / scoredAssessmentCount).toFixed(2)) : null,
    assessedControlCount,
    scoredAssessmentCount,
    assessmentGaps,
    openFindings,
    overdueFindings,
    overdueTasks,
    blockedTasks,
    criticalTasks,
    openEvidenceGaps,
    trustReviewBacklog: questionnaireReviews + evidenceMapReviews + trustPacketReviews,
    answerReuseCount: answerReuse._sum.usageCount ?? 0,
    approvedAnswerCount,
    approvedQuestionnaireCount,
    approvedEvidenceMapsCount,
    trustPacketsExported,
    staleEvidenceCount,
    trustInboxBacklog
  };
}

export async function generatePulseSnapshotRecord(args: {
  tenantId: string;
  userId: string;
  periodType: PulsePeriodType;
  snapshotDate?: Date;
  name?: string;
}) {
  const snapshotDate = args.snapshotDate ?? new Date();
  const measuredInputs = await getPulseMeasuredInputs(args.tenantId, snapshotDate);
  const reportingPeriod = buildPulseReportingPeriod(snapshotDate, args.periodType);
  const previousSnapshot = await prisma.pulseSnapshot.findFirst({
    where: {
      tenantId: args.tenantId,
      reportingPeriod: { not: reportingPeriod }
    },
    include: {
      categoryScores: true
    },
    orderBy: { snapshotDate: 'desc' }
  });

  const scorecard = buildPulseScorecardDraft({
    measuredInputs,
    previousOverallScore: previousSnapshot?.overallScore ?? null,
    previousCategories: previousSnapshot?.categoryScores.map((category) => ({
      categoryKey: category.categoryKey,
      score: category.score
    }))
  });
  const { categoryScores, overallScore, overallDelta, summaryText } = scorecard;

  return prisma.$transaction(async (tx) => {
    const snapshot = await tx.pulseSnapshot.upsert({
      where: {
        tenantId_periodType_reportingPeriod: {
          tenantId: args.tenantId,
          periodType: args.periodType,
          reportingPeriod
        }
      },
      update: {
        name: args.name?.trim() || buildPulseSnapshotName(reportingPeriod, args.periodType),
        snapshotDate,
        status: 'NEEDS_REVIEW',
        overallScore,
        overallDelta,
        assessmentSignalScore: categoryScores.find((category) => category.categoryKey === 'ASSESSMENTS')?.score ?? 0,
        findingsSignalScore: categoryScores.find((category) => category.categoryKey === 'FINDINGS')?.score ?? 0,
        remediationSignalScore: categoryScores.find((category) => category.categoryKey === 'REMEDIATION')?.score ?? 0,
        trustSignalScore: categoryScores.find((category) => category.categoryKey === 'TRUSTOPS')?.score ?? 0,
        readinessSignalScore: categoryScores.find((category) => category.categoryKey === 'BUYER_READINESS')?.score ?? 0,
        openFindingsCount: measuredInputs.openFindings,
        overdueFindingsCount: measuredInputs.overdueFindings,
        overdueTasksCount: measuredInputs.overdueTasks,
        openEvidenceGapCount: measuredInputs.openEvidenceGaps,
        trustReviewBacklogCount: measuredInputs.trustReviewBacklog,
        answerReuseCount: measuredInputs.answerReuseCount,
        trustPacketsExportedCount: measuredInputs.trustPacketsExported,
        assessedControlCount: measuredInputs.assessedControlCount,
        summaryText,
        measuredInputsJson: {
          latestAssessmentScore: measuredInputs.latestAssessmentScore,
          averageAssessmentScore: measuredInputs.averageAssessmentScore,
          scoredAssessmentCount: measuredInputs.scoredAssessmentCount,
          openFindings: measuredInputs.openFindings,
          overdueFindings: measuredInputs.overdueFindings,
          overdueTasks: measuredInputs.overdueTasks,
          blockedTasks: measuredInputs.blockedTasks,
          criticalTasks: measuredInputs.criticalTasks,
          openEvidenceGaps: measuredInputs.openEvidenceGaps,
          trustReviewBacklog: measuredInputs.trustReviewBacklog,
          answerReuseCount: measuredInputs.answerReuseCount,
          approvedAnswerCount: measuredInputs.approvedAnswerCount,
          approvedQuestionnaireCount: measuredInputs.approvedQuestionnaireCount,
          approvedEvidenceMapsCount: measuredInputs.approvedEvidenceMapsCount,
          trustPacketsExported: measuredInputs.trustPacketsExported,
          staleEvidenceCount: measuredInputs.staleEvidenceCount,
          trustInboxBacklog: measuredInputs.trustInboxBacklog,
          assessmentGapCount: measuredInputs.assessmentGaps.length
        },
        reviewedBy: null,
        approvedBy: null,
        reviewedAt: null,
        approvedAt: null,
        publishedAt: null
      },
      create: {
        tenantId: args.tenantId,
        name: args.name?.trim() || buildPulseSnapshotName(reportingPeriod, args.periodType),
        periodType: args.periodType,
        reportingPeriod,
        snapshotDate,
        status: 'NEEDS_REVIEW',
        overallScore,
        overallDelta,
        assessmentSignalScore: categoryScores.find((category) => category.categoryKey === 'ASSESSMENTS')?.score ?? 0,
        findingsSignalScore: categoryScores.find((category) => category.categoryKey === 'FINDINGS')?.score ?? 0,
        remediationSignalScore: categoryScores.find((category) => category.categoryKey === 'REMEDIATION')?.score ?? 0,
        trustSignalScore: categoryScores.find((category) => category.categoryKey === 'TRUSTOPS')?.score ?? 0,
        readinessSignalScore: categoryScores.find((category) => category.categoryKey === 'BUYER_READINESS')?.score ?? 0,
        openFindingsCount: measuredInputs.openFindings,
        overdueFindingsCount: measuredInputs.overdueFindings,
        overdueTasksCount: measuredInputs.overdueTasks,
        openEvidenceGapCount: measuredInputs.openEvidenceGaps,
        trustReviewBacklogCount: measuredInputs.trustReviewBacklog,
        answerReuseCount: measuredInputs.answerReuseCount,
        trustPacketsExportedCount: measuredInputs.trustPacketsExported,
        assessedControlCount: measuredInputs.assessedControlCount,
        summaryText,
        measuredInputsJson: {
          latestAssessmentScore: measuredInputs.latestAssessmentScore,
          averageAssessmentScore: measuredInputs.averageAssessmentScore,
          scoredAssessmentCount: measuredInputs.scoredAssessmentCount,
          openFindings: measuredInputs.openFindings,
          overdueFindings: measuredInputs.overdueFindings,
          overdueTasks: measuredInputs.overdueTasks,
          blockedTasks: measuredInputs.blockedTasks,
          criticalTasks: measuredInputs.criticalTasks,
          openEvidenceGaps: measuredInputs.openEvidenceGaps,
          trustReviewBacklog: measuredInputs.trustReviewBacklog,
          answerReuseCount: measuredInputs.answerReuseCount,
          approvedAnswerCount: measuredInputs.approvedAnswerCount,
          approvedQuestionnaireCount: measuredInputs.approvedQuestionnaireCount,
          approvedEvidenceMapsCount: measuredInputs.approvedEvidenceMapsCount,
          trustPacketsExported: measuredInputs.trustPacketsExported,
          staleEvidenceCount: measuredInputs.staleEvidenceCount,
          trustInboxBacklog: measuredInputs.trustInboxBacklog,
          assessmentGapCount: measuredInputs.assessmentGaps.length
        },
        createdBy: args.userId
      }
    });

    await tx.pulseCategoryScore.deleteMany({
      where: { snapshotId: snapshot.id }
    });

    await tx.pulseCategoryScore.createMany({
      data: categoryScores.map((category) => ({
        tenantId: args.tenantId,
        snapshotId: snapshot.id,
        categoryKey: category.categoryKey,
        label: category.label,
        score: category.score,
        delta: category.delta,
        weight: category.weight,
        measuredValue: category.measuredValue,
        benchmarkValue: category.benchmarkValue,
        summaryText: category.summaryText
      }))
    });

    return tx.pulseSnapshot.findUniqueOrThrow({
      where: { id: snapshot.id },
      include: {
        categoryScores: true
      }
    });
  });
}

export function buildPulseScorecardDraft(args: {
  measuredInputs: PulseMeasuredInputs;
  previousOverallScore?: number | null;
  previousCategories?: Array<{ categoryKey: string; score: number }>;
}): PulseScorecardDraft {
  const categoryScores = computeCategoryDeltas(
    [
      buildAssessmentCategory(args.measuredInputs),
      buildFindingsCategory(args.measuredInputs),
      buildRemediationCategory(args.measuredInputs),
      buildTrustOpsCategory(args.measuredInputs),
      buildBuyerReadinessCategory(args.measuredInputs)
    ],
    args.previousCategories
  );

  const overallScore = clampScore(
    categoryScores.reduce((sum, category) => sum + category.score * category.weight, 0)
  );
  const overallDelta =
    typeof args.previousOverallScore === 'number'
      ? roundScore(overallScore - args.previousOverallScore)
      : null;
  const weakestCategory = [...categoryScores].sort((a, b) => a.score - b.score)[0] ?? categoryScores[0];

  return {
    categoryScores,
    overallScore,
    overallDelta,
    summaryText: buildPulseSummary({
      overallScore,
      overallDelta,
      weakestCategory,
      inputs: args.measuredInputs
    })
  };
}
