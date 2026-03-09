import { prisma } from '@/lib/db/prisma';

type BoardBriefStatus = 'DRAFT' | 'NEEDS_REVIEW' | 'APPROVED';

type BoardBriefDraft = {
  title: string;
  overallPostureSummary: string;
  topRiskIds: string[];
  notableImprovements: string[];
  overdueActions: string[];
  leadershipDecisionsNeeded: string[];
  roadmap30Days: string[];
  roadmap60Days: string[];
  roadmap90Days: string[];
};

function scoreBand(score: number) {
  if (score >= 80) return 'healthy';
  if (score >= 65) return 'stable but exposed';
  if (score >= 50) return 'under pressure';
  return 'requires immediate leadership attention';
}

function groupRoadmap(items: Array<{ horizon: string; title: string; ownerUserId: string | null; dueAt: Date | null }>) {
  return {
    roadmap30Days: items
      .filter((item) => item.horizon === 'DAYS_30')
      .map((item) => `${item.title}${item.ownerUserId ? ` (owner ${item.ownerUserId})` : ''}`),
    roadmap60Days: items
      .filter((item) => item.horizon === 'DAYS_60')
      .map((item) => `${item.title}${item.ownerUserId ? ` (owner ${item.ownerUserId})` : ''}`),
    roadmap90Days: items
      .filter((item) => item.horizon === 'DAYS_90')
      .map((item) => `${item.title}${item.ownerUserId ? ` (owner ${item.ownerUserId})` : ''}`)
  };
}

export function buildBoardBriefDraft(args: {
  reportingPeriod: string;
  overallScore: number;
  overallDelta: number | null;
  weakestCategory?: { label: string; score: number };
  risks: Array<{
    id: string;
    title: string;
    severity: string;
    ownerUserId: string | null;
    targetDueAt: Date | null;
  }>;
  positiveCategories: Array<{ label: string; delta: number | null }>;
  overdueActions: string[];
  roadmapItems: Array<{ horizon: string; title: string; ownerUserId: string | null; dueAt: Date | null }>;
}) {
  const groupedRoadmap = groupRoadmap(args.roadmapItems);
  const weakest = args.weakestCategory
    ? `${args.weakestCategory.label} remains the weakest measured area at ${args.weakestCategory.score.toFixed(1)} / 100.`
    : 'No category weakness was calculated.';
  const deltaSentence =
    args.overallDelta === null
      ? 'This is the first recorded executive scorecard.'
      : args.overallDelta > 0
        ? `Overall posture improved by ${args.overallDelta.toFixed(1)} points since the last snapshot.`
        : args.overallDelta < 0
          ? `Overall posture declined by ${Math.abs(args.overallDelta).toFixed(1)} points since the last snapshot.`
          : 'Overall posture is unchanged versus the last snapshot.';

  const notableImprovements = args.positiveCategories.length
    ? args.positiveCategories.map((category) => `${category.label} improved versus the prior snapshot.`)
    : ['No material upward category movement was recorded in this period.'];

  const leadershipDecisionsNeeded = args.risks
    .filter((risk) => !risk.ownerUserId || risk.severity === 'CRITICAL')
    .slice(0, 4)
    .map((risk) =>
      !risk.ownerUserId
        ? `Assign an executive owner to ${risk.title}.`
        : `Confirm funding and timeline for ${risk.title}.`
    );

  return {
    title: `Board Brief ${args.reportingPeriod}`,
    overallPostureSummary: `Posture is ${scoreBand(args.overallScore)} at ${args.overallScore.toFixed(1)} / 100. ${deltaSentence} ${weakest}`,
    topRiskIds: args.risks.map((risk) => risk.id),
    notableImprovements,
    overdueActions: args.overdueActions.length ? args.overdueActions : ['No overdue roadmap actions were recorded at generation time.'],
    leadershipDecisionsNeeded: leadershipDecisionsNeeded.length
      ? leadershipDecisionsNeeded
      : ['No unresolved ownership decisions were detected during generation.'],
    roadmap30Days: groupedRoadmap.roadmap30Days,
    roadmap60Days: groupedRoadmap.roadmap60Days,
    roadmap90Days: groupedRoadmap.roadmap90Days
  } satisfies BoardBriefDraft;
}

export async function generateBoardBriefRecord(args: {
  tenantId: string;
  userId: string;
  snapshotId: string;
  roadmapId?: string;
  title?: string;
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

  const roadmap = args.roadmapId
    ? await prisma.pulseRoadmap.findFirstOrThrow({
        where: {
          tenantId: args.tenantId,
          id: args.roadmapId
        },
        include: {
          items: {
            orderBy: [{ horizon: 'asc' }, { dueAt: 'asc' }]
          }
        }
      })
    : await prisma.pulseRoadmap.findFirstOrThrow({
        where: {
          tenantId: args.tenantId,
          snapshotId: snapshot.id
        },
        include: {
          items: {
            orderBy: [{ horizon: 'asc' }, { dueAt: 'asc' }]
          }
        }
      });

  const [risks, overdueRoadmapItems, openIncidents, approvedAfterActionCount] = await Promise.all([
    prisma.riskRegisterItem.findMany({
      where: {
        tenantId: args.tenantId,
        status: { in: ['OPEN', 'IN_REVIEW', 'MITIGATING', 'ACCEPTED'] }
      },
      orderBy: [{ severity: 'desc' }, { impact: 'desc' }, { targetDueAt: 'asc' }, { updatedAt: 'desc' }],
      take: 5
    }),
    prisma.roadmapItem.findMany({
      where: {
        tenantId: args.tenantId,
        roadmapId: roadmap.id,
        status: { in: ['PLANNED', 'IN_PROGRESS', 'BLOCKED'] },
        dueAt: { lt: new Date() }
      },
      orderBy: { dueAt: 'asc' },
      take: 8
    }),
    prisma.incident.findMany({
      where: {
        tenantId: args.tenantId,
        status: { in: ['NEW', 'TRIAGE', 'ACTIVE', 'CONTAINED', 'RECOVERING', 'POST_INCIDENT_REVIEW'] }
      },
      orderBy: [{ severity: 'desc' }, { updatedAt: 'desc' }],
      take: 4
    }),
    prisma.afterActionReport.count({
      where: {
        tenantId: args.tenantId,
        status: 'APPROVED'
      }
    })
  ]);

  const positiveCategories = snapshot.categoryScores
    .filter((category) => (category.delta ?? 0) > 0)
    .map((category) => ({ label: category.label, delta: category.delta }));
  const weakestCategory = [...snapshot.categoryScores].sort((a, b) => a.score - b.score)[0];

  const draft = buildBoardBriefDraft({
    reportingPeriod: snapshot.reportingPeriod,
    overallScore: snapshot.overallScore,
    overallDelta: snapshot.overallDelta,
    weakestCategory: weakestCategory ? { label: weakestCategory.label, score: weakestCategory.score } : undefined,
    risks: risks.map((risk) => ({
      id: risk.id,
      title: risk.title,
      severity: risk.severity,
      ownerUserId: risk.ownerUserId,
      targetDueAt: risk.targetDueAt
    })),
    positiveCategories,
    overdueActions: overdueRoadmapItems.map((item) => `${item.title} is overdue.`),
    roadmapItems: roadmap.items
  });
  const incidentOverdueActions = openIncidents.map(
    (incident) => `${incident.title} remains ${incident.status.toLowerCase().replace(/_/g, ' ')} in Response Ops.`
  );
  const incidentLeadershipDecisions = openIncidents
    .filter((incident) => incident.severity === 'CRITICAL' || !incident.incidentOwnerUserId)
    .map((incident) =>
      incident.incidentOwnerUserId
        ? `Confirm executive support and timeline for incident ${incident.title}.`
        : `Assign an incident owner for ${incident.title}.`
    );
  const responseOpsSummary = openIncidents.length
    ? ` Response Ops is carrying ${openIncidents.length} open incident(s).`
    : approvedAfterActionCount > 0
      ? ` ${approvedAfterActionCount} approved after-action report(s) are available for leadership review.`
      : '';

  const existing = await prisma.boardBrief.findFirst({
    where: {
      tenantId: args.tenantId,
      snapshotId: snapshot.id,
      roadmapId: roadmap.id
    },
    orderBy: { updatedAt: 'desc' }
  });

  const data = {
    title: args.title?.trim() || draft.title,
    reportingPeriod: snapshot.reportingPeriod,
    status: 'NEEDS_REVIEW' as BoardBriefStatus,
    overallPostureSummary: `${draft.overallPostureSummary}${responseOpsSummary}`.trim(),
    topRiskIds: draft.topRiskIds,
    notableImprovements:
      approvedAfterActionCount > 0
        ? [...draft.notableImprovements, `${approvedAfterActionCount} approved after-action review(s) are available for leadership follow-up.`]
        : draft.notableImprovements,
    overdueActions: [...incidentOverdueActions, ...draft.overdueActions].slice(0, 8),
    leadershipDecisionsNeeded: [...draft.leadershipDecisionsNeeded, ...incidentLeadershipDecisions].slice(0, 6),
    roadmap30Days: draft.roadmap30Days,
    roadmap60Days: draft.roadmap60Days,
    roadmap90Days: draft.roadmap90Days,
    reviewerNotes: null,
    reviewedBy: null,
    approvedBy: null,
    reviewedAt: null,
    approvedAt: null
  };

  if (existing) {
    return prisma.boardBrief.update({
      where: { id: existing.id },
      data,
      include: {
        snapshot: {
          include: {
            categoryScores: true
          }
        },
        roadmap: {
          include: {
            items: {
              orderBy: [{ horizon: 'asc' }, { dueAt: 'asc' }]
            }
          }
        }
      }
    });
  }

  return prisma.boardBrief.create({
    data: {
      tenantId: args.tenantId,
      snapshotId: snapshot.id,
      roadmapId: roadmap.id,
      ...data,
      createdBy: args.userId
    },
    include: {
      snapshot: {
        include: {
          categoryScores: true
        }
      },
      roadmap: {
        include: {
          items: {
            orderBy: [{ horizon: 'asc' }, { dueAt: 'asc' }]
          }
        }
      }
    }
  });
}

export async function listBoardBriefs(tenantId: string) {
  return prisma.boardBrief.findMany({
    where: { tenantId },
    include: {
      snapshot: {
        select: {
          id: true,
          reportingPeriod: true,
          overallScore: true,
          overallDelta: true
        }
      },
      roadmap: {
        select: {
          id: true,
          name: true,
          status: true
        }
      }
    },
    orderBy: { updatedAt: 'desc' },
    take: 24
  });
}

export async function updateBoardBrief(args: {
  tenantId: string;
  boardBriefId: string;
  actorUserId: string;
  status?: BoardBriefStatus;
  reviewerNotes?: string;
}) {
  const brief = await prisma.boardBrief.findFirstOrThrow({
    where: {
      tenantId: args.tenantId,
      id: args.boardBriefId
    }
  });

  return prisma.boardBrief.update({
    where: { id: brief.id },
    data: {
      status: args.status,
      reviewerNotes: args.reviewerNotes,
      reviewedBy: args.status || args.reviewerNotes ? args.actorUserId : undefined,
      reviewedAt: args.status || args.reviewerNotes ? new Date() : undefined,
      approvedBy: args.status === 'APPROVED' ? args.actorUserId : args.status ? null : undefined,
      approvedAt: args.status === 'APPROVED' ? new Date() : args.status ? null : undefined
    },
    include: {
      snapshot: {
        include: {
          categoryScores: true
        }
      },
      roadmap: {
        include: {
          items: {
            orderBy: [{ horizon: 'asc' }, { dueAt: 'asc' }]
          }
        }
      }
    }
  });
}
