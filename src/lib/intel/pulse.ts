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
    trustInboxBacklog
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
    })
  ]);

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
    trustInboxBacklog
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

  if (pulse.staleEvidenceOver90Days > 0 || pulse.pendingEvidenceRequests > 0 || pulse.trustInboxBacklog > 0) {
    plans.push({
      id: 'trust-packet-refresh',
      title: 'Refresh trust packet and evidence backlog',
      priority: 'P1',
      why: `${pulse.staleEvidenceOver90Days} stale evidence items, ${pulse.pendingEvidenceRequests} pending evidence requests, and ${pulse.trustInboxBacklog} trust inbox items need attention.`,
      linkedRoute: '/app/trust/inbox',
      actions: [
        'Refresh stale artifacts for top controls.',
        'Resolve pending customer evidence requests.',
        'Export and stage a standard trust packet for faster responses.'
      ],
      mappedTrendIds: ['third-party-concentration']
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

