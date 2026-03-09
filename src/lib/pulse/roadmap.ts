import { prisma } from '@/lib/db/prisma';

type RoadmapStatus = 'DRAFT' | 'NEEDS_REVIEW' | 'APPROVED' | 'ARCHIVED';
type RoadmapItemStatus = 'PLANNED' | 'IN_PROGRESS' | 'BLOCKED' | 'DONE';
type RoadmapHorizon = 'DAYS_30' | 'DAYS_60' | 'DAYS_90';

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function horizonLabel(horizon: RoadmapHorizon) {
  if (horizon === 'DAYS_30') return '30 days';
  if (horizon === 'DAYS_60') return '60 days';
  return '90 days';
}

function horizonDays(horizon: RoadmapHorizon) {
  if (horizon === 'DAYS_30') return 30;
  if (horizon === 'DAYS_60') return 60;
  return 90;
}

function severityToHorizon(severity: string, likelihood: string): RoadmapHorizon {
  if (severity === 'CRITICAL' || (severity === 'HIGH' && likelihood === 'HIGH')) return 'DAYS_30';
  if (severity === 'HIGH' || severity === 'MEDIUM') return 'DAYS_60';
  return 'DAYS_90';
}

function categoryToHorizon(score: number) {
  if (score < 45) return 'DAYS_30' as const;
  if (score < 60) return 'DAYS_60' as const;
  return 'DAYS_90' as const;
}

export function buildRoadmapDraft(args: {
  risks: Array<{
    id: string;
    title: string;
    description: string;
    businessImpactSummary: string;
    severity: string;
    likelihood: string;
    targetDueAt: Date | null;
    linkedFindingIds: string[];
    linkedTaskIds: string[];
    linkedControlIds: string[];
  }>;
  weakCategories: Array<{ label: string; score: number; summaryText: string }>;
  now?: Date;
}) {
  const items: Array<{
    title: string;
    horizon: RoadmapHorizon;
    dueAt: Date;
    status: RoadmapItemStatus;
    rationale: string;
    expectedImpact: string;
    linkedRiskIds: string[];
    linkedFindingIds: string[];
    linkedTaskIds: string[];
    linkedControlIds: string[];
  }> = [];
  const seenTitles = new Set<string>();
  const now = args.now ?? new Date();

  for (const risk of args.risks) {
    const horizon = severityToHorizon(risk.severity, risk.likelihood);
    const title = `Reduce ${risk.title}`;
    if (seenTitles.has(title)) continue;
    seenTitles.add(title);

    items.push({
      title,
      horizon,
      dueAt: risk.targetDueAt ?? addDays(now, horizonDays(horizon)),
      status: 'PLANNED',
      rationale: risk.description,
      expectedImpact: risk.businessImpactSummary,
      linkedRiskIds: [risk.id],
      linkedFindingIds: risk.linkedFindingIds,
      linkedTaskIds: risk.linkedTaskIds,
      linkedControlIds: risk.linkedControlIds
    });
  }

  for (const category of args.weakCategories) {
    const title = `Improve ${category.label}`;
    if (seenTitles.has(title)) continue;
    const horizon = categoryToHorizon(category.score);
    seenTitles.add(title);

    items.push({
      title,
      horizon,
      dueAt: addDays(now, horizonDays(horizon)),
      status: 'PLANNED',
      rationale: category.summaryText,
      expectedImpact: `Raise ${category.label} from ${category.score.toFixed(1)} to the next operating band within ${horizonLabel(horizon)}.`,
      linkedRiskIds: [],
      linkedFindingIds: [],
      linkedTaskIds: [],
      linkedControlIds: []
    });
  }

  return items.sort((a, b) => horizonDays(a.horizon) - horizonDays(b.horizon));
}

export async function generateRoadmapRecord(args: {
  tenantId: string;
  userId: string;
  snapshotId: string;
  name?: string;
}) {
  const snapshot = await prisma.pulseSnapshot.findFirstOrThrow({
    where: {
      tenantId: args.tenantId,
      id: args.snapshotId
    },
    include: {
      categoryScores: true
    }
  });

  const risks = await prisma.riskRegisterItem.findMany({
    where: {
      tenantId: args.tenantId,
      status: { in: ['OPEN', 'IN_REVIEW', 'MITIGATING', 'ACCEPTED'] }
    },
    orderBy: [{ severity: 'desc' }, { impact: 'desc' }, { updatedAt: 'desc' }],
    take: 8
  });

  const items = buildRoadmapDraft({
    risks: risks.map((risk) => ({
      id: risk.id,
      title: risk.title,
      description: `${risk.description} Source: ${risk.sourceModule.replace(/_/g, ' ')}.`,
      businessImpactSummary: risk.businessImpactSummary,
      severity: risk.severity,
      likelihood: risk.likelihood,
      targetDueAt: risk.targetDueAt,
      linkedFindingIds: risk.linkedFindingIds,
      linkedTaskIds: risk.linkedTaskIds,
      linkedControlIds: risk.linkedControlIds
    })),
    weakCategories: snapshot.categoryScores
      .filter((entry) => entry.score < 65)
      .map((entry) => ({
        label: entry.label,
        score: entry.score,
        summaryText: entry.summaryText
      }))
  });

  return prisma.$transaction(async (tx) => {
    const roadmap = await tx.pulseRoadmap.upsert({
      where: {
        snapshotId: snapshot.id
      },
      update: {
        name: args.name?.trim() || `Executive Roadmap ${snapshot.reportingPeriod}`,
        reportingPeriod: snapshot.reportingPeriod,
        status: 'NEEDS_REVIEW',
        reviewerNotes: null,
        reviewedBy: null,
        approvedBy: null,
        reviewedAt: null,
        approvedAt: null
      },
      create: {
        tenantId: args.tenantId,
        snapshotId: snapshot.id,
        name: args.name?.trim() || `Executive Roadmap ${snapshot.reportingPeriod}`,
        reportingPeriod: snapshot.reportingPeriod,
        status: 'NEEDS_REVIEW',
        createdBy: args.userId
      }
    });

    await tx.roadmapItem.deleteMany({
      where: {
        roadmapId: roadmap.id
      }
    });

    await tx.roadmapItem.createMany({
      data: items.slice(0, 12).map((item) => ({
        tenantId: args.tenantId,
        roadmapId: roadmap.id,
        title: item.title,
        horizon: item.horizon,
        dueAt: item.dueAt,
        status: item.status,
        rationale: item.rationale,
        expectedImpact: item.expectedImpact,
        linkedRiskIds: item.linkedRiskIds,
        linkedFindingIds: item.linkedFindingIds,
        linkedTaskIds: item.linkedTaskIds,
        linkedControlIds: item.linkedControlIds
      }))
    });

    return tx.pulseRoadmap.findUniqueOrThrow({
      where: { id: roadmap.id },
      include: {
        items: {
          orderBy: [{ horizon: 'asc' }, { dueAt: 'asc' }]
        },
        snapshot: {
          include: {
            categoryScores: true
          }
        }
      }
    });
  });
}

export async function listRoadmaps(tenantId: string) {
  return prisma.pulseRoadmap.findMany({
    where: { tenantId },
    include: {
      items: {
        orderBy: [{ horizon: 'asc' }, { dueAt: 'asc' }]
      },
      snapshot: {
        select: {
          id: true,
          reportingPeriod: true,
          overallScore: true,
          overallDelta: true
        }
      }
    },
    orderBy: { updatedAt: 'desc' },
    take: 24
  });
}

export async function updateRoadmap(args: {
  tenantId: string;
  roadmapId: string;
  actorUserId: string;
  status?: RoadmapStatus;
  reviewerNotes?: string;
}) {
  const roadmap = await prisma.pulseRoadmap.findFirstOrThrow({
    where: {
      tenantId: args.tenantId,
      id: args.roadmapId
    }
  });
  const nextStatus = args.status;

  return prisma.pulseRoadmap.update({
    where: {
      id: roadmap.id
    },
    data: {
      status: nextStatus,
      reviewerNotes: args.reviewerNotes,
      reviewedBy: nextStatus || args.reviewerNotes ? args.actorUserId : undefined,
      reviewedAt: nextStatus || args.reviewerNotes ? new Date() : undefined,
      approvedBy: nextStatus === 'APPROVED' ? args.actorUserId : nextStatus ? null : undefined,
      approvedAt: nextStatus === 'APPROVED' ? new Date() : nextStatus ? null : undefined
    },
    include: {
      items: {
        orderBy: [{ horizon: 'asc' }, { dueAt: 'asc' }]
      },
      snapshot: {
        select: {
          id: true,
          reportingPeriod: true,
          overallScore: true,
          overallDelta: true
        }
      }
    }
  });
}

export async function updateRoadmapItem(args: {
  tenantId: string;
  itemId: string;
  title?: string;
  ownerUserId?: string | null;
  dueAt?: Date | null;
  status?: RoadmapItemStatus;
  rationale?: string;
  expectedImpact?: string;
}) {
  const item = await prisma.roadmapItem.findFirstOrThrow({
    where: {
      tenantId: args.tenantId,
      id: args.itemId
    }
  });

  return prisma.roadmapItem.update({
    where: { id: item.id },
    data: {
      title: args.title,
      ownerUserId: args.ownerUserId,
      dueAt: args.dueAt,
      status: args.status,
      rationale: args.rationale,
      expectedImpact: args.expectedImpact
    }
  });
}
