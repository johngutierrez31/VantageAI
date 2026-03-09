import { prisma } from '@/lib/db/prisma';
import type { TrendSignal } from '@/lib/intel/trends';

export type TenantSecurityPulse = {
  capturedAt: string;
  openTasks: number;
  blockedTasks: number;
  overdueTasks: number;
  criticalTasks: number;
  assessmentsInProgress: number;
  expiringExceptionsNext7Days: number;
  staleEvidenceOver90Days: number;
  pendingEvidenceRequests: number;
  trustInboxBacklog: number;
  trustQuestionnairesAwaitingReview: number;
  trustOverdueReviews: number;
  openTrustFindings: number;
  answerLibraryReuseCount: number;
  trustPacketsCreated: number;
  trustPacketsExported: number;
  currentPostureScore: number | null;
  postureDelta: number | null;
  openTopRisks: number;
  overdueRoadmapItems: number;
  openAiReviews: number;
  highRiskAiUseCases: number;
  rejectedAiUseCases: number;
  conditionalAiApprovalsPending: number;
  aiVendorsPendingReview: number;
  activeIncidents: number;
  triageIncidents: number;
  overdueIncidentActions: number;
  openPostIncidentActions: number;
  upcomingTabletops: number;
  recentAfterActionReports: number;
  latestPulseSnapshotId: string | null;
  latestRoadmapId: string | null;
  latestBoardBriefId: string | null;
  latestQuarterlyReviewId: string | null;
};

export type MissionPriority = 'P0' | 'P1' | 'P2';

export type MissionPlanItem = {
  id: string;
  day: string;
  title: string;
  priority: MissionPriority;
  why: string;
  linkedRoute: string;
  actions: string[];
  mappedTrendIds: string[];
};

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function subtractDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() - days);
  return next;
}

export async function getTenantSecurityPulse(tenantId: string): Promise<TenantSecurityPulse> {
  const now = new Date();
  const next7Days = addDays(now, 7);
  const staleCutoff = subtractDays(now, 90);

  const [
    openTasks,
    blockedTasks,
    overdueTasks,
    criticalTasks,
    assessmentsInProgress,
    expiringExceptionsNext7Days,
    staleEvidenceOver90Days,
    pendingEvidenceRequests,
    trustInboxBacklog,
    trustQuestionnairesAwaitingReview,
    overdueQuestionnaireReviews,
    overdueEvidenceMapReviews,
    overdueTrustPacketReviews,
    openTrustFindings,
    answerLibraryUsage,
    trustPacketsCreated,
    trustPacketsExported,
    latestPulseSnapshot,
    openTopRisks,
    overdueRoadmapItems,
    latestRoadmap,
    latestBoardBrief,
    latestQuarterlyReview,
    pendingAiUseCases,
    pendingAiVendorReviews,
    highRiskAiUseCases,
    highRiskAiVendorReviews,
    rejectedAiUseCases,
    rejectedAiVendorReviews,
    conditionalAiApprovalsPending,
    activeIncidents,
    triageIncidents,
    overdueIncidentActions,
    openPostIncidentActions,
    upcomingTabletops,
    recentAfterActionReports
  ] = await Promise.all([
    prisma.task.count({
      where: {
        tenantId,
        status: { not: 'DONE' }
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
        dueDate: { lt: now }
      }
    }),
    prisma.task.count({
      where: {
        tenantId,
        status: { not: 'DONE' },
        priority: 'CRITICAL'
      }
    }),
    prisma.assessment.count({
      where: {
        tenantId,
        status: 'IN_PROGRESS'
      }
    }),
    prisma.exception.count({
      where: {
        tenantId,
        status: { in: ['OPEN', 'ACCEPTED'] },
        dueDate: {
          gte: now,
          lte: next7Days
        }
      }
    }),
    prisma.evidence.count({
      where: {
        tenantId,
        createdAt: { lt: staleCutoff }
      }
    }),
    prisma.evidenceRequest.count({
      where: {
        tenantId,
        status: { in: ['REQUESTED', 'RECEIVED'] }
      }
    }),
    prisma.trustInboxItem.count({
      where: {
        tenantId,
        status: { in: ['NEW', 'IN_REVIEW', 'DRAFT_READY'] }
      }
    }),
    prisma.questionnaireUpload.count({
      where: {
        tenantId,
        status: { in: ['DRAFTED', 'NEEDS_REVIEW'] }
      }
    }),
    prisma.questionnaireUpload.count({
      where: {
        tenantId,
        status: { in: ['UPLOADED', 'MAPPED', 'DRAFTED', 'NEEDS_REVIEW', 'APPROVED'] },
        reviewDueAt: { lt: now }
      }
    }),
    prisma.evidenceMap.count({
      where: {
        tenantId,
        status: { in: ['DRAFT', 'NEEDS_REVIEW', 'APPROVED'] },
        reviewDueAt: { lt: now }
      }
    }),
    prisma.trustPacket.count({
      where: {
        tenantId,
        status: { in: ['DRAFT', 'READY_FOR_REVIEW', 'READY_TO_SHARE'] },
        reviewDueAt: { lt: now }
      }
    }),
    prisma.finding.count({
      where: {
        tenantId,
        sourceType: {
          in: ['TRUSTOPS_EVIDENCE_GAP', 'TRUSTOPS_REJECTION', 'TRUSTOPS_EVIDENCE_MAP']
        },
        status: { in: ['OPEN', 'IN_PROGRESS'] }
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
    prisma.trustPacket.count({
      where: {
        tenantId
      }
    }),
    prisma.trustPacket.count({
      where: {
        tenantId,
        lastExportedAt: { not: null }
      }
    }),
    prisma.pulseSnapshot.findFirst({
      where: {
        tenantId
      },
      select: {
        id: true,
        overallScore: true,
        overallDelta: true
      },
      orderBy: {
        snapshotDate: 'desc'
      }
    }),
    prisma.riskRegisterItem.count({
      where: {
        tenantId,
        status: { in: ['OPEN', 'IN_REVIEW', 'MITIGATING', 'ACCEPTED'] },
        severity: { in: ['HIGH', 'CRITICAL'] }
      }
    }),
    prisma.roadmapItem.count({
      where: {
        tenantId,
        status: { in: ['PLANNED', 'IN_PROGRESS', 'BLOCKED'] },
        dueAt: { lt: now }
      }
    }),
    prisma.pulseRoadmap.findFirst({
      where: {
        tenantId
      },
      select: {
        id: true
      },
      orderBy: {
        updatedAt: 'desc'
      }
    }),
    prisma.boardBrief.findFirst({
      where: {
        tenantId
      },
      select: {
        id: true
      },
      orderBy: {
        updatedAt: 'desc'
      }
    }),
    prisma.quarterlyReview.findFirst({
      where: {
        tenantId
      },
      select: {
        id: true
      },
      orderBy: {
        reviewDate: 'desc'
      }
    }),
    prisma.aIUseCase.count({
      where: {
        tenantId,
        status: { in: ['DRAFT', 'NEEDS_REVIEW'] }
      }
    }),
    prisma.aIVendorReview.count({
      where: {
        tenantId,
        status: { in: ['DRAFT', 'NEEDS_REVIEW'] }
      }
    }),
    prisma.aIUseCase.count({
      where: {
        tenantId,
        riskTier: { in: ['HIGH', 'CRITICAL'] },
        status: { not: 'ARCHIVED' }
      }
    }),
    prisma.aIVendorReview.count({
      where: {
        tenantId,
        riskTier: { in: ['HIGH', 'CRITICAL'] },
        status: { not: 'ARCHIVED' }
      }
    }),
    prisma.aIUseCase.count({
      where: {
        tenantId,
        status: 'REJECTED'
      }
    }),
    prisma.aIVendorReview.count({
      where: {
        tenantId,
        status: 'REJECTED'
      }
    }),
    prisma.$transaction([
      prisma.aIUseCase.count({
        where: {
          tenantId,
          status: 'APPROVED_WITH_CONDITIONS'
        }
      }),
      prisma.aIVendorReview.count({
        where: {
          tenantId,
          status: 'APPROVED_WITH_CONDITIONS'
        }
      })
    ]).then(([useCaseCount, vendorCount]) => useCaseCount + vendorCount),
    prisma.incident.count({
      where: {
        tenantId,
        status: { in: ['NEW', 'TRIAGE', 'ACTIVE', 'CONTAINED', 'RECOVERING'] }
      }
    }),
    prisma.incident.count({
      where: {
        tenantId,
        status: { in: ['NEW', 'TRIAGE'] }
      }
    }),
    prisma.task.count({
      where: {
        tenantId,
        incidentId: { not: null },
        status: { not: 'DONE' },
        dueDate: { lt: now }
      }
    }),
    prisma.task.count({
      where: {
        tenantId,
        incidentId: { not: null },
        responseOpsPhase: 'POST_INCIDENT_REVIEW',
        status: { not: 'DONE' }
      }
    }),
    prisma.tabletopExercise.count({
      where: {
        tenantId,
        status: 'DRAFT',
        exerciseDate: {
          gte: now,
          lte: addDays(now, 30)
        }
      }
    }),
    prisma.afterActionReport.count({
      where: { tenantId }
    })
  ]);

  const openAiReviews = pendingAiUseCases + pendingAiVendorReviews;

  return {
    capturedAt: now.toISOString(),
    openTasks,
    blockedTasks,
    overdueTasks,
    criticalTasks,
    assessmentsInProgress,
    expiringExceptionsNext7Days,
    staleEvidenceOver90Days,
    pendingEvidenceRequests,
    trustInboxBacklog,
    trustQuestionnairesAwaitingReview,
    trustOverdueReviews:
      overdueQuestionnaireReviews + overdueEvidenceMapReviews + overdueTrustPacketReviews,
    openTrustFindings,
    answerLibraryReuseCount: answerLibraryUsage._sum.usageCount ?? 0,
    trustPacketsCreated,
    trustPacketsExported,
    currentPostureScore: latestPulseSnapshot?.overallScore ?? null,
    postureDelta: latestPulseSnapshot?.overallDelta ?? null,
    openTopRisks,
    overdueRoadmapItems,
    openAiReviews,
    highRiskAiUseCases: highRiskAiUseCases + highRiskAiVendorReviews,
    rejectedAiUseCases: rejectedAiUseCases + rejectedAiVendorReviews,
    conditionalAiApprovalsPending,
    aiVendorsPendingReview: pendingAiVendorReviews,
    activeIncidents,
    triageIncidents,
    overdueIncidentActions,
    openPostIncidentActions,
    upcomingTabletops,
    recentAfterActionReports,
    latestPulseSnapshotId: latestPulseSnapshot?.id ?? null,
    latestRoadmapId: latestRoadmap?.id ?? null,
    latestBoardBriefId: latestBoardBrief?.id ?? null,
    latestQuarterlyReviewId: latestQuarterlyReview?.id ?? null
  };
}

function nextDayLabel(index: number) {
  return `Day ${index + 1}`;
}

export function buildSevenDayMissionQueue(
  pulse: TenantSecurityPulse,
  trendSignals: TrendSignal[]
): MissionPlanItem[] {
  const criticalTrendIds = trendSignals
    .filter((trend) => trend.severity === 'critical')
    .map((trend) => trend.id);
  const highTrendIds = trendSignals
    .filter((trend) => trend.severity === 'high')
    .map((trend) => trend.id);

  const plans: Array<Omit<MissionPlanItem, 'day'>> = [];

  if (pulse.criticalTasks > 0 || pulse.overdueTasks > 0 || pulse.blockedTasks > 0) {
    plans.push({
      id: 'close-critical-remediation',
      title: 'Close critical remediation blockers',
      priority: 'P0',
      why: `You currently have ${pulse.criticalTasks} critical, ${pulse.overdueTasks} overdue, and ${pulse.blockedTasks} blocked tasks.`,
      linkedRoute: '/app/findings',
      actions: [
        'Unblock owners and timelines for critical findings.',
        'Escalate tasks with unresolved risk acceptance.',
        'Confirm compensating controls until permanent fixes land.'
      ],
      mappedTrendIds: [...criticalTrendIds]
    });
  }

  if (pulse.expiringExceptionsNext7Days > 0) {
    plans.push({
      id: 'exception-decision-sprint',
      title: 'Run exception renewal or closure decisions',
      priority: 'P0',
      why: `${pulse.expiringExceptionsNext7Days} risk exceptions expire within seven days.`,
      linkedRoute: '/app/findings',
      actions: [
        'Validate whether controls are now remediated.',
        'Close exceptions where controls are fixed.',
        'Renew only with documented compensating controls and owner sign-off.'
      ],
      mappedTrendIds: ['vulnerability-initial-access', 'ransomware-extortion-economics']
    });
  }

  if (pulse.activeIncidents > 0 || pulse.overdueIncidentActions > 0) {
    plans.push({
      id: 'response-ops-incident-command',
      title: 'Work active incident command and overdue response actions',
      priority: 'P0',
      why: `${pulse.activeIncidents} active incident(s) and ${pulse.overdueIncidentActions} overdue incident action(s) need immediate operator attention.`,
      linkedRoute: '/app/response-ops',
      actions: [
        'Update current incident status, ownership, and next update checkpoints.',
        'Launch or refresh incident-linked runbook packs where work is still manual.',
        'Capture timeline decisions and stage the after-action review artifact early.'
      ],
      mappedTrendIds: ['breakout-speed', 'ransomware-extortion-economics']
    });
  }

  plans.push({
    id: 'identity-hardening-sprint',
    title: 'Execute an identity hardening sprint',
    priority: 'P0',
    why: 'Identity attack velocity remains one of the strongest cross-report signals.',
    linkedRoute: '/app/security-analyst',
    actions: [
      'Review privileged identities and remove stale access.',
      'Audit MFA reset and token issuance events.',
      'Add detections for suspicious authentication patterns.'
    ],
    mappedTrendIds: ['identity-velocity', 'cloud-and-saas-abuse']
  });

  plans.push({
    id: 'first-hour-ir-check',
    title: 'Rehearse first-hour incident actions',
    priority: 'P1',
    why: 'Breakout timelines continue to shrink, so response speed determines impact.',
    linkedRoute: '/app/security-analyst',
    actions: [
      'Run a short tabletop for account compromise and ransomware.',
      'Verify emergency access revocation path.',
      'Confirm contact tree for legal and leadership updates.'
    ],
    mappedTrendIds: ['breakout-speed', 'ransomware-extortion-economics']
  });

  if (
    pulse.staleEvidenceOver90Days > 0 ||
    pulse.pendingEvidenceRequests > 0 ||
    pulse.trustInboxBacklog > 0 ||
    pulse.trustQuestionnairesAwaitingReview > 0 ||
    pulse.trustOverdueReviews > 0
  ) {
    plans.push({
      id: 'trust-packet-refresh',
      title: 'Refresh trust packet and evidence backlog',
      priority: 'P1',
      why: `${pulse.staleEvidenceOver90Days} stale evidence items, ${pulse.pendingEvidenceRequests} pending evidence requests, ${pulse.trustInboxBacklog} trust inbox items, and ${pulse.trustOverdueReviews} overdue reviews need attention.`,
      linkedRoute: '/app/trust/inbox',
      actions: [
        'Refresh stale artifacts for top controls.',
        'Resolve pending customer evidence requests.',
        'Assign overdue TrustOps reviews and stage a standard trust packet for faster responses.'
      ],
      mappedTrendIds: ['third-party-concentration']
    });
  }

  if (pulse.openAiReviews > 0 || pulse.highRiskAiUseCases > 0 || pulse.conditionalAiApprovalsPending > 0) {
    plans.push({
      id: 'ai-governance-review-sprint',
      title: 'Work the AI governance approval queue',
      priority: pulse.highRiskAiUseCases > 0 ? 'P0' : 'P1',
      why: `${pulse.openAiReviews} AI reviews are open, ${pulse.highRiskAiUseCases} AI item(s) are high risk, and ${pulse.conditionalAiApprovalsPending} approval(s) still carry conditions.`,
      linkedRoute: '/app/ai-governance/reviews',
      actions: [
        'Assign reviewers and due dates for AI use cases and vendor intakes.',
        'Resolve approval blockers around data classes, retention, and external access.',
        'Push rejected or high-risk AI items into owned remediation and Pulse follow-up.'
      ],
      mappedTrendIds: ['cloud-and-saas-abuse']
    });
  }

  if (pulse.assessmentsInProgress > 0 || pulse.openTasks > 0) {
    plans.push({
      id: 'assessment-closeout',
      title: 'Close active assessments and create execution tasks',
      priority: 'P2',
      why: `${pulse.assessmentsInProgress} assessments are currently in progress and ${pulse.openTasks} tasks remain open.`,
      linkedRoute: '/app/assessments',
      actions: [
        'Finalize scoring for active assessments.',
        'Convert top gaps into owned remediation tasks.',
        'Capture evidence links before report generation.'
      ],
      mappedTrendIds: ['vulnerability-initial-access', 'critical-infrastructure-targeting']
    });
  }

  plans.push({
    id: 'policy-and-range-sync',
    title: 'Sync policy updates with scenario validation',
    priority: 'P2',
    why: 'Controls should be tested against current threat trends, not treated as static paperwork.',
    linkedRoute: '/app/tools',
    actions: [
      'Regenerate one high-priority policy set.',
      'Create one cyber-range scenario aligned to top threat signals.',
      'Feed lessons back into control owners and task backlog.'
    ],
    mappedTrendIds: [...highTrendIds]
  });

  return plans.slice(0, 7).map((plan, index) => ({
    ...plan,
    day: nextDayLabel(index)
  }));
}
