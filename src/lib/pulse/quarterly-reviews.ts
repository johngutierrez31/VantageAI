import { prisma } from '@/lib/db/prisma';

type QuarterlyReviewStatus = 'DRAFT' | 'FINALIZED';

export function buildQuarterFromReportingPeriod(reportingPeriod: string) {
  if (reportingPeriod.includes('-Q')) return reportingPeriod;
  const [year, month] = reportingPeriod.split('-').map(Number);
  if (!year || !month) return reportingPeriod;
  const quarter = Math.floor((month - 1) / 3) + 1;
  return `${year}-Q${quarter}`;
}

export async function prepareQuarterlyReviewRecord(args: {
  tenantId: string;
  userId: string;
  snapshotId: string;
  roadmapId: string;
  boardBriefId: string;
  reviewDate?: Date;
}) {
  const [snapshot, roadmap, boardBrief, topRisks, openIncidents] = await Promise.all([
    prisma.pulseSnapshot.findFirstOrThrow({
      where: {
        tenantId: args.tenantId,
        id: args.snapshotId
      }
    }),
    prisma.pulseRoadmap.findFirstOrThrow({
      where: {
        tenantId: args.tenantId,
        id: args.roadmapId
      },
      include: {
        items: {
          orderBy: [{ horizon: 'asc' }, { dueAt: 'asc' }]
        }
      }
    }),
    prisma.boardBrief.findFirstOrThrow({
      where: {
        tenantId: args.tenantId,
        id: args.boardBriefId
      }
    }),
    prisma.riskRegisterItem.findMany({
      where: {
        tenantId: args.tenantId,
        status: { in: ['OPEN', 'IN_REVIEW', 'MITIGATING', 'ACCEPTED'] }
      },
      orderBy: [{ severity: 'desc' }, { impact: 'desc' }, { updatedAt: 'desc' }],
      take: 5
    }),
    prisma.incident.findMany({
      where: {
        tenantId: args.tenantId,
        status: { in: ['NEW', 'TRIAGE', 'ACTIVE', 'CONTAINED', 'RECOVERING', 'POST_INCIDENT_REVIEW'] }
      },
      orderBy: [{ severity: 'desc' }, { updatedAt: 'desc' }],
      take: 4
    })
  ]);

  const reviewPeriod = buildQuarterFromReportingPeriod(snapshot.reportingPeriod);
  const reviewDate = args.reviewDate ?? new Date();
  const followUpActions = roadmap.items
    .filter((item) => item.status !== 'DONE')
    .slice(0, 6)
    .map((item) => `${item.title} (${item.horizon.replace('DAYS_', '')} day horizon)`);
  const incidentFollowUps = openIncidents.map(
    (incident) => `Review incident ${incident.title} and confirm remaining ${incident.status.toLowerCase().replace(/_/g, ' ')} actions.`
  );

  return prisma.quarterlyReview.upsert({
    where: {
      tenantId_reviewPeriod: {
        tenantId: args.tenantId,
        reviewPeriod
      }
    },
    update: {
      snapshotId: snapshot.id,
      roadmapId: roadmap.id,
      boardBriefId: boardBrief.id,
      reviewDate,
      topRiskIds: topRisks.map((risk) => risk.id),
      followUpActions: [...incidentFollowUps, ...followUpActions].slice(0, 8),
      status: 'DRAFT',
      finalizedAt: null,
      finalizedBy: null
    },
    create: {
      tenantId: args.tenantId,
      snapshotId: snapshot.id,
      roadmapId: roadmap.id,
      boardBriefId: boardBrief.id,
      reviewPeriod,
      reviewDate,
      topRiskIds: topRisks.map((risk) => risk.id),
      followUpActions: [...incidentFollowUps, ...followUpActions].slice(0, 8),
      createdBy: args.userId
    },
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
      },
      boardBrief: {
        select: {
          id: true,
          title: true,
          status: true
        }
      }
    }
  });
}

export async function listQuarterlyReviews(tenantId: string) {
  return prisma.quarterlyReview.findMany({
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
      },
      boardBrief: {
        select: {
          id: true,
          title: true,
          status: true
        }
      }
    },
    orderBy: { reviewDate: 'desc' },
    take: 12
  });
}

export async function updateQuarterlyReview(args: {
  tenantId: string;
  reviewId: string;
  actorUserId: string;
  attendeeNames?: string[];
  notes?: string | null;
  decisionsMade?: string[];
  followUpActions?: string[];
  status?: QuarterlyReviewStatus;
}) {
  const review = await prisma.quarterlyReview.findFirstOrThrow({
    where: {
      tenantId: args.tenantId,
      id: args.reviewId
    }
  });

  return prisma.quarterlyReview.update({
    where: { id: review.id },
    data: {
      attendeeNames: args.attendeeNames,
      notes: args.notes,
      decisionsMade: args.decisionsMade,
      followUpActions: args.followUpActions,
      status: args.status,
      finalizedBy: args.status === 'FINALIZED' ? args.actorUserId : args.status ? null : undefined,
      finalizedAt: args.status === 'FINALIZED' ? new Date() : args.status ? null : undefined
    },
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
      },
      boardBrief: {
        select: {
          id: true,
          title: true,
          status: true
        }
      }
    }
  });
}
