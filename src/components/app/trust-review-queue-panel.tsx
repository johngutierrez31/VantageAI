'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { buildTrustReviewQueueMetrics, getTrustReviewTiming, type TrustReviewItem, type TrustReviewableType } from '@/lib/trust/review-queue';
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

function toDateTimeLocal(value: string | null) {
  if (!value) return '';
  return value.slice(0, 16);
}

function typeLabel(type: TrustReviewableType) {
  return type.replace(/_/g, ' ');
}

function routeForItem(item: TrustReviewItem) {
  switch (item.type) {
    case 'QUESTIONNAIRE':
      return `/api/questionnaires/${item.id}/assignment`;
    case 'EVIDENCE_MAP':
      return `/api/evidence-maps/${item.id}`;
    case 'TRUST_PACKET':
      return `/api/trust/packets/${item.id}`;
    default:
      return '';
  }
}

export function TrustReviewQueuePanel({
  items,
  reviewers
}: {
  items: TrustReviewItem[];
  reviewers: ReviewerOption[];
}) {
  const [typeFilter, setTypeFilter] = useState<'ALL' | TrustReviewableType>('ALL');
  const [reviewerFilter, setReviewerFilter] = useState('ALL');
  const [timingFilter, setTimingFilter] = useState<'ALL' | 'OVERDUE' | 'DUE_SOON' | 'UNSCHEDULED'>('ALL');
  const [drafts, setDrafts] = useState<Record<string, { assignedReviewerUserId: string; reviewDueAt: string }>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (typeFilter !== 'ALL' && item.type !== typeFilter) return false;
      if (reviewerFilter !== 'ALL' && item.assignedReviewerUserId !== reviewerFilter) return false;
      const timing = getTrustReviewTiming(item);
      if (timingFilter !== 'ALL' && timing !== timingFilter) return false;
      return timing !== 'DONE';
    });
  }, [items, reviewerFilter, timingFilter, typeFilter]);

  const metrics = useMemo(() => buildTrustReviewQueueMetrics(items), [items]);

  async function save(item: TrustReviewItem) {
    const draft = drafts[item.id] ?? {
      assignedReviewerUserId: item.assignedReviewerUserId ?? '',
      reviewDueAt: toDateTimeLocal(item.reviewDueAt)
    };
    setBusyId(item.id);
    setMessage(null);

    const response = await fetch(routeForItem(item), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assignedReviewerUserId: draft.assignedReviewerUserId || null,
        reviewDueAt: draft.reviewDueAt ? new Date(draft.reviewDueAt).toISOString() : null
      })
    });
    const payload = await response.json().catch(() => ({}));
    setBusyId(null);

    if (!response.ok) {
      setMessage(payload.error ?? 'Failed to update review assignment');
      return;
    }

    setMessage('Review queue updated. Refresh to see the latest queue ordering.');
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="TrustOps Review Queue"
        description="Assign reviewers, set due dates, and keep questionnaire, evidence-map, and trust-packet review work inside SLA."
        secondaryActions={[
          { label: 'TrustOps', href: '/app/trust', variant: 'outline' },
          { label: 'Answer Library', href: '/app/trust/answer-library', variant: 'outline' }
        ]}
      />

      <div className="grid gap-4 md:grid-cols-4">
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
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-[220px_240px_220px]">
          <Select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as typeof typeFilter)}>
            <option value="ALL">All work items</option>
            <option value="QUESTIONNAIRE">Questionnaires</option>
            <option value="EVIDENCE_MAP">Evidence maps</option>
            <option value="TRUST_PACKET">Trust packets</option>
          </Select>
          <Select value={reviewerFilter} onChange={(event) => setReviewerFilter(event.target.value)}>
            <option value="ALL">All reviewers</option>
            {reviewers.map((reviewer) => (
              <option key={reviewer.id} value={reviewer.id}>
                {reviewer.label}
              </option>
            ))}
          </Select>
          <Select value={timingFilter} onChange={(event) => setTimingFilter(event.target.value as typeof timingFilter)}>
            <option value="ALL">All timing states</option>
            <option value="OVERDUE">Overdue</option>
            <option value="DUE_SOON">Due soon</option>
            <option value="UNSCHEDULED">Unscheduled</option>
          </Select>
          {message ? <p className="md:col-span-3 text-sm text-muted-foreground">{message}</p> : null}
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">No review items match the current filters.</CardContent>
          </Card>
        ) : (
          filtered.map((item) => {
            const timing = getTrustReviewTiming(item);
            const draft = drafts[item.id] ?? {
              assignedReviewerUserId: item.assignedReviewerUserId ?? '',
              reviewDueAt: toDateTimeLocal(item.reviewDueAt)
            };

            return (
              <Card key={`${item.type}-${item.id}`}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{typeLabel(item.type)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusPill status={item.status} />
                      <StatusPill status={timing} />
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-[240px_220px_auto]">
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
