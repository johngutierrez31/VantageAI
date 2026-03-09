'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  buildAIGovernanceReviewQueueMetrics,
  getAIGovernanceReviewTiming,
  type AIGovernanceReviewItem,
  type AIGovernanceReviewableType
} from '@/lib/ai-governance/review-queue';
import { PageHeader } from '@/components/app/page-header';
import { StatusPill } from '@/components/app/status-pill';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

type ReviewerOption = {
  id: string;
  label: string;
};

type QueueItem = AIGovernanceReviewItem & {
  ownerLabel: string | null;
};

function toDateTimeLocal(value: string | null) {
  return value ? value.slice(0, 16) : '';
}

function routeForItem(item: QueueItem) {
  return item.type === 'AI_USE_CASE'
    ? `/api/ai-governance/use-cases/${item.id}`
    : `/api/ai-governance/vendors/${item.id}`;
}

export function AIReviewQueuePanel({
  items,
  reviewers
}: {
  items: QueueItem[];
  reviewers: ReviewerOption[];
}) {
  const [typeFilter, setTypeFilter] = useState<'ALL' | AIGovernanceReviewableType>('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [reviewerFilter, setReviewerFilter] = useState('ALL');
  const [ownerFilter, setOwnerFilter] = useState('ALL');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [timingFilter, setTimingFilter] = useState<'ALL' | 'OVERDUE' | 'DUE_SOON' | 'UNSCHEDULED'>('ALL');
  const [drafts, setDrafts] = useState<Record<string, { assignedReviewerUserId: string; reviewDueAt: string; status: string }>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (typeFilter !== 'ALL' && item.type !== typeFilter) return false;
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
      if (reviewerFilter !== 'ALL' && item.assignedReviewerUserId !== reviewerFilter) return false;
      if (ownerFilter !== 'ALL' && item.ownerLabel !== ownerFilter) return false;
      if (riskFilter !== 'ALL' && item.riskTier !== riskFilter) return false;
      const timing = getAIGovernanceReviewTiming(item);
      if (timingFilter !== 'ALL' && timing !== timingFilter) return false;
      return timing !== 'DONE';
    });
  }, [items, ownerFilter, reviewerFilter, riskFilter, statusFilter, timingFilter, typeFilter]);

  const metrics = useMemo(() => buildAIGovernanceReviewQueueMetrics(items), [items]);
  const ownerOptions = useMemo(
    () =>
      Array.from(new Set(items.map((item) => item.ownerLabel).filter((value): value is string => Boolean(value)))).sort((a, b) =>
        a.localeCompare(b)
      ),
    [items]
  );

  async function save(item: QueueItem) {
    const draft = drafts[item.id] ?? {
      assignedReviewerUserId: item.assignedReviewerUserId ?? '',
      reviewDueAt: toDateTimeLocal(item.reviewDueAt),
      status: item.status
    };
    setBusyId(item.id);
    setMessage(null);
    const response = await fetch(routeForItem(item), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assignedReviewerUserId: draft.assignedReviewerUserId || null,
        reviewDueAt: draft.reviewDueAt ? new Date(draft.reviewDueAt).toISOString() : null,
        status: draft.status
      })
    });
    const payload = await response.json().catch(() => ({}));
    setBusyId(null);

    if (!response.ok) {
      setMessage(payload.error ?? 'Failed to update AI review queue');
      return;
    }

    setMessage('AI review queue updated. Refresh to load the latest ordering and recalculated status.');
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Governance Review Queue"
        helpKey="aiReviewQueue"
        description="Assign reviewers, set due dates, and keep AI use case and vendor intake decisions inside SLA."
        secondaryActions={[
          { label: 'AI Governance', href: '/app/ai-governance', variant: 'outline' },
          { label: 'Use Cases', href: '/app/ai-governance/use-cases', variant: 'outline' },
          { label: 'Vendor Intake', href: '/app/ai-governance/vendors', variant: 'outline' }
        ]}
      />

      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Queue</p>
            <p className="text-2xl font-semibold">{metrics.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Overdue</p>
            <p className="text-2xl font-semibold">{metrics.overdue}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Due Soon</p>
            <p className="text-2xl font-semibold">{metrics.dueSoon}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Unassigned</p>
            <p className="text-2xl font-semibold">{metrics.unassigned}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">High Risk</p>
            <p className="text-2xl font-semibold">{metrics.highRisk}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as typeof typeFilter)}>
            <option value="ALL">All work items</option>
            <option value="AI_USE_CASE">AI use cases</option>
            <option value="AI_VENDOR_REVIEW">Vendor reviews</option>
          </Select>
          <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="ALL">All statuses</option>
            {['DRAFT', 'NEEDS_REVIEW', 'APPROVED', 'APPROVED_WITH_CONDITIONS', 'REJECTED', 'ARCHIVED'].map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </Select>
          <Select value={reviewerFilter} onChange={(event) => setReviewerFilter(event.target.value)}>
            <option value="ALL">All reviewers</option>
            {reviewers.map((reviewer) => (
              <option key={reviewer.id} value={reviewer.id}>
                {reviewer.label}
              </option>
            ))}
          </Select>
          <Select value={ownerFilter} onChange={(event) => setOwnerFilter(event.target.value)}>
            <option value="ALL">All owners</option>
            {ownerOptions.map((owner) => (
              <option key={owner} value={owner}>
                {owner}
              </option>
            ))}
          </Select>
          <Select value={riskFilter} onChange={(event) => setRiskFilter(event.target.value)}>
            <option value="ALL">All risk tiers</option>
            {['LOW', 'MODERATE', 'HIGH', 'CRITICAL'].map((tier) => (
              <option key={tier} value={tier}>
                {tier}
              </option>
            ))}
          </Select>
          <Select value={timingFilter} onChange={(event) => setTimingFilter(event.target.value as typeof timingFilter)}>
            <option value="ALL">All timing states</option>
            <option value="OVERDUE">Overdue</option>
            <option value="DUE_SOON">Due soon</option>
            <option value="UNSCHEDULED">Unscheduled</option>
          </Select>
          {message ? <p className="md:col-span-3 xl:col-span-6 text-sm text-muted-foreground">{message}</p> : null}
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">No AI review items match the current filters.</CardContent>
          </Card>
        ) : (
          filtered.map((item) => {
            const timing = getAIGovernanceReviewTiming(item);
            const draft = drafts[item.id] ?? {
              assignedReviewerUserId: item.assignedReviewerUserId ?? '',
              reviewDueAt: toDateTimeLocal(item.reviewDueAt),
              status: item.status
            };

            return (
              <Card key={`${item.type}-${item.id}`}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{item.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.type === 'AI_USE_CASE' ? 'AI Use Case' : 'AI Vendor Review'} | Owner:{' '}
                        {item.ownerLabel ?? 'Unassigned'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusPill status={item.riskTier} />
                      <StatusPill status={item.status} />
                      <StatusPill status={timing} />
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-[220px_220px_220px_auto]">
                    <Select
                      value={draft.assignedReviewerUserId}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [item.id]: {
                            ...draft,
                            assignedReviewerUserId: event.target.value
                          }
                        }))
                      }
                    >
                      <option value="">Unassigned</option>
                      {reviewers.map((reviewer) => (
                        <option key={reviewer.id} value={reviewer.id}>
                          {reviewer.label}
                        </option>
                      ))}
                    </Select>
                    <Input
                      type="datetime-local"
                      value={draft.reviewDueAt}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [item.id]: {
                            ...draft,
                            reviewDueAt: event.target.value
                          }
                        }))
                      }
                    />
                    <Select
                      value={draft.status}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [item.id]: {
                            ...draft,
                            status: event.target.value
                          }
                        }))
                      }
                    >
                      {['DRAFT', 'NEEDS_REVIEW', 'APPROVED', 'APPROVED_WITH_CONDITIONS', 'REJECTED', 'ARCHIVED'].map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </Select>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button onClick={() => save(item)} disabled={busyId === item.id}>
                        {busyId === item.id ? 'Saving...' : 'Save Queue Update'}
                      </Button>
                      <Button asChild variant="outline">
                        <Link href={item.href}>Open Work Item</Link>
                      </Button>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Reviewer: {item.assignedReviewerLabel ?? 'Unassigned'} | Due:{' '}
                    {item.reviewDueAt ? new Date(item.reviewDueAt).toLocaleString() : 'Not scheduled'}
                  </p>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

