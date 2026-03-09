import { Badge } from '@/components/ui/badge';

type StatusPillProps = {
  status: string;
};

function normalizeStatusVariant(status: string): 'success' | 'warning' | 'danger' | 'muted' {
  const normalized = status.toLowerCase();
  if (
    [
      'published',
      'completed',
      'done',
      'active',
      'received',
      'approved',
      'delivered',
      'ready to share',
      'shared',
      'contained',
      'resolved',
      'closed',
      'finalized',
      'strong',
      'reusable',
      'on track'
    ].includes(normalized)
  ) {
    return 'success';
  }
  if (
    [
      'draft',
      'triage',
      'recovering',
      'post incident review',
      'in_progress',
      'in progress',
      'pending',
      'requested',
      'needs review',
      'new',
      'mapped',
      'uploaded',
      'drafted',
      'in review',
      'ready for review',
      'draft ready',
      'in review',
      'approved with conditions',
      'moderate',
      'weak',
      'due soon',
      'unscheduled',
      'mitigating',
      'planned',
      'monthly',
      'quarterly',
      'known',
      'signed',
      'received',
      'internal'
    ].includes(normalized)
  ) {
    return 'warning';
  }
  if (
    [
      'failed',
      'blocked',
      'archived',
      'suspended',
      'open',
      'rejected',
      'missing',
      'overdue',
      'critical',
      'no retention'
    ].includes(normalized)
  ) {
    return 'danger';
  }
  if (normalized === 'high' || normalized === 'accepted') return 'warning';
  if (normalized === 'low' || normalized === 'yes') return 'success';
  return 'muted';
}

function formatStatus(status: string) {
  return status
    .replace(/_/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

export function StatusPill({ status }: StatusPillProps) {
  return <Badge variant={normalizeStatusVariant(status)}>{formatStatus(status)}</Badge>;
}
