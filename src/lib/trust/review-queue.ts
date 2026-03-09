export type TrustReviewableType = 'QUESTIONNAIRE' | 'EVIDENCE_MAP' | 'TRUST_PACKET';

export type TrustReviewItem = {
  id: string;
  type: TrustReviewableType;
  title: string;
  status: string;
  assignedReviewerUserId: string | null;
  assignedReviewerLabel: string | null;
  reviewDueAt: string | null;
  href: string;
};

export type TrustReviewTiming = 'OVERDUE' | 'DUE_SOON' | 'ON_TRACK' | 'UNSCHEDULED' | 'DONE';

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function isDone(item: TrustReviewItem) {
  const normalized = item.status.toUpperCase();
  return ['APPROVED', 'EXPORTED', 'SHARED', 'ARCHIVED'].includes(normalized);
}

export function getTrustReviewTiming(item: TrustReviewItem, now = new Date()): TrustReviewTiming {
  if (isDone(item)) return 'DONE';
  if (!item.reviewDueAt) return 'UNSCHEDULED';

  const dueAt = new Date(item.reviewDueAt);
  if (Number.isNaN(dueAt.getTime())) return 'UNSCHEDULED';
  if (dueAt < now) return 'OVERDUE';
  if (dueAt <= addDays(now, 3)) return 'DUE_SOON';
  return 'ON_TRACK';
}

export function buildTrustReviewQueueMetrics(items: TrustReviewItem[], now = new Date()) {
  const active = items.filter((item) => !isDone(item));
  const overdue = active.filter((item) => getTrustReviewTiming(item, now) === 'OVERDUE').length;
  const dueSoon = active.filter((item) => getTrustReviewTiming(item, now) === 'DUE_SOON').length;
  const unassigned = active.filter((item) => !item.assignedReviewerUserId).length;

  return {
    total: active.length,
    overdue,
    dueSoon,
    unassigned
  };
}
