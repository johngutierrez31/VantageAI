export type AIGovernanceReviewableType = 'AI_USE_CASE' | 'AI_VENDOR_REVIEW';

export type AIGovernanceReviewItem = {
  id: string;
  type: AIGovernanceReviewableType;
  title: string;
  status: string;
  riskTier: string;
  ownerLabel: string | null;
  assignedReviewerUserId: string | null;
  assignedReviewerLabel: string | null;
  reviewDueAt: string | null;
  href: string;
};

export type AIGovernanceReviewTiming =
  | 'DONE'
  | 'OVERDUE'
  | 'DUE_SOON'
  | 'UNSCHEDULED'
  | 'ON_TRACK';

function isDoneStatus(status: string) {
  return ['APPROVED', 'APPROVED_WITH_CONDITIONS', 'REJECTED', 'ARCHIVED'].includes(status);
}

export function getAIGovernanceReviewTiming(
  item: AIGovernanceReviewItem,
  now = new Date()
): AIGovernanceReviewTiming {
  if (isDoneStatus(item.status)) return 'DONE';
  if (!item.reviewDueAt) return 'UNSCHEDULED';

  const due = new Date(item.reviewDueAt);
  if (Number.isNaN(due.getTime())) return 'UNSCHEDULED';
  if (due < now) return 'OVERDUE';

  const hoursUntilDue = (due.getTime() - now.getTime()) / (1000 * 60 * 60);
  if (hoursUntilDue <= 48) return 'DUE_SOON';
  return 'ON_TRACK';
}

export function buildAIGovernanceReviewQueueMetrics(
  items: AIGovernanceReviewItem[],
  now = new Date()
) {
  const active = items.filter((item) => getAIGovernanceReviewTiming(item, now) !== 'DONE');

  return {
    total: active.length,
    overdue: active.filter((item) => getAIGovernanceReviewTiming(item, now) === 'OVERDUE').length,
    dueSoon: active.filter((item) => getAIGovernanceReviewTiming(item, now) === 'DUE_SOON').length,
    unassigned: active.filter((item) => !item.assignedReviewerUserId).length,
    highRisk: active.filter((item) => item.riskTier === 'HIGH' || item.riskTier === 'CRITICAL').length
  };
}
