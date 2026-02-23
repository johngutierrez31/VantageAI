import { Badge } from '@/components/ui/badge';

type StatusPillProps = {
  status: string;
};

function normalizeStatusVariant(status: string): 'success' | 'warning' | 'danger' | 'muted' {
  const normalized = status.toLowerCase();
  if (['published', 'completed', 'done', 'active', 'received'].includes(normalized)) return 'success';
  if (['draft', 'in_progress', 'in progress', 'pending', 'requested'].includes(normalized)) return 'warning';
  if (['failed', 'blocked', 'archived', 'suspended', 'open'].includes(normalized)) return 'danger';
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
