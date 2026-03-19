'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/app/page-header';
import { DataTable } from '@/components/app/data-table';
import { StatusPill } from '@/components/app/status-pill';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const roadmapStatuses = ['DRAFT', 'NEEDS_REVIEW', 'APPROVED', 'ARCHIVED'] as const;
const itemStatuses = ['PLANNED', 'IN_PROGRESS', 'BLOCKED', 'DONE'] as const;

type ReviewerOption = { id: string; label: string };

type Roadmap = {
  id: string;
  name: string;
  status: string;
  reportingPeriod: string;
  reviewerNotes: string | null;
  items: Array<{
    id: string;
    title: string;
    horizon: string;
    ownerUserId: string | null;
    dueAt: string | null;
    status: string;
    rationale: string;
    expectedImpact: string;
    linkedRiskIds: string[];
  }>;
};

async function apiRequest(url: string, options?: RequestInit) {
  const response = await fetch(url, options);
  const text = await response.text();
  if (!response.ok) {
    throw new Error(text || `Request failed with ${response.status}`);
  }
  return text ? JSON.parse(text) : null;
}

export function PulseRoadmapPanel({
  activeRoadmapId,
  roadmaps,
  reviewers
}: {
  activeRoadmapId: string | null;
  roadmaps: Roadmap[];
  reviewers: ReviewerOption[];
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [busyRoadmapId, setBusyRoadmapId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [roadmapDrafts, setRoadmapDrafts] = useState<Record<string, { status: string; reviewerNotes: string }>>({});
  const [itemDrafts, setItemDrafts] = useState<Record<string, { ownerUserId: string; dueAt: string; status: string; rationale: string; expectedImpact: string }>>({});

  async function saveRoadmap(roadmap: Roadmap) {
    const draft = roadmapDrafts[roadmap.id] ?? {
      status: roadmap.status,
      reviewerNotes: roadmap.reviewerNotes ?? ''
    };

    setBusyRoadmapId(roadmap.id);
    setError(null);
    try {
      await apiRequest(`/api/pulse/roadmaps/${roadmap.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft)
      });
      router.refresh();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : String(nextError));
    } finally {
      setBusyRoadmapId(null);
    }
  }

  async function saveItem(item: Roadmap['items'][number]) {
    const draft = itemDrafts[item.id] ?? {
      ownerUserId: item.ownerUserId ?? '',
      dueAt: item.dueAt ? item.dueAt.slice(0, 10) : '',
      status: item.status,
      rationale: item.rationale,
      expectedImpact: item.expectedImpact
    };

    setBusyId(item.id);
    setError(null);
    try {
      await apiRequest(`/api/pulse/roadmaps/items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerUserId: draft.ownerUserId || null,
          dueAt: draft.dueAt ? new Date(`${draft.dueAt}T00:00:00.000Z`).toISOString() : null,
          status: draft.status,
          rationale: draft.rationale,
          expectedImpact: draft.expectedImpact
        })
      });
      router.refresh();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : String(nextError));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pulse Roadmap"
        helpKey="roadmap"
        description="Manage the 30/60/90 executive remediation roadmap generated from current risks and weak posture categories."
        primaryAction={{ label: 'Open Pulse', href: '/app/pulse' }}
        secondaryActions={[{ label: 'Open Risks', href: '/app/pulse/risks', variant: 'outline' }]}
      />

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <div className="space-y-4">
        {roadmaps.length ? roadmaps.map((roadmap) => {
          const draft = roadmapDrafts[roadmap.id] ?? {
            status: roadmap.status,
            reviewerNotes: roadmap.reviewerNotes ?? ''
          };

          return (
            <DataTable
              key={roadmap.id}
              wrapperClassName={cn(
                activeRoadmapId === roadmap.id ? 'border-primary/50 bg-primary/5 shadow-sm' : null
              )}
              wrapperId={`roadmap-${roadmap.id}`}
              title={roadmap.name}
              description={`Reporting period ${roadmap.reportingPeriod}`}
              actions={
                <div className="flex flex-wrap items-center gap-2">
                  <Button asChild variant="outline">
                    <Link href={`/app/pulse?workflow=roadmap#pulse-roadmap-workflow`}>Open Generation Workflow</Link>
                  </Button>
                  <Button onClick={() => saveRoadmap(roadmap)} disabled={busyRoadmapId === roadmap.id}>
                    {busyRoadmapId === roadmap.id ? 'Saving...' : 'Save Roadmap'}
                  </Button>
                </div>
              }
            >
              <div className="grid gap-3 md:grid-cols-[180px_minmax(0,1fr)]">
                <Select
                  value={draft.status}
                  onChange={(event) =>
                    setRoadmapDrafts((current) => ({
                      ...current,
                      [roadmap.id]: {
                        ...draft,
                        status: event.target.value
                      }
                    }))
                  }
                >
                  {roadmapStatuses.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </Select>
                <Textarea
                  value={draft.reviewerNotes}
                  onChange={(event) =>
                    setRoadmapDrafts((current) => ({
                      ...current,
                      [roadmap.id]: {
                        ...draft,
                        reviewerNotes: event.target.value
                      }
                    }))
                  }
                  placeholder="Reviewer notes"
                />
              </div>
              <div className="mt-3 flex items-center gap-2">
                <StatusPill status={roadmap.status} />
                <span className="text-xs text-muted-foreground">{roadmap.items.length} roadmap item(s)</span>
              </div>
              <div className="mt-4 space-y-3">
                {roadmap.items.map((item) => {
                  const itemDraft = itemDrafts[item.id] ?? {
                    ownerUserId: item.ownerUserId ?? '',
                    dueAt: item.dueAt ? item.dueAt.slice(0, 10) : '',
                    status: item.status,
                    rationale: item.rationale,
                    expectedImpact: item.expectedImpact
                  };

                  return (
                    <div key={item.id} className="rounded-md border border-border p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold">{item.title}</p>
                        <div className="flex items-center gap-2">
                          <StatusPill status={item.horizon} />
                          <StatusPill status={item.status} />
                        </div>
                      </div>
                      <div className="mt-3 grid gap-2 md:grid-cols-[220px_160px_160px_auto]">
                        <Select
                          value={itemDraft.ownerUserId}
                          onChange={(event) =>
                            setItemDrafts((current) => ({
                              ...current,
                              [item.id]: {
                                ...itemDraft,
                                ownerUserId: event.target.value
                              }
                            }))
                          }
                        >
                          <option value="">Unassigned</option>
                          {reviewers.map((reviewer) => (
                            <option key={reviewer.id} value={reviewer.id}>{reviewer.label}</option>
                          ))}
                        </Select>
                        <Input
                          type="date"
                          value={itemDraft.dueAt}
                          onChange={(event) =>
                            setItemDrafts((current) => ({
                              ...current,
                              [item.id]: {
                                ...itemDraft,
                                dueAt: event.target.value
                              }
                            }))
                          }
                        />
                        <Select
                          value={itemDraft.status}
                          onChange={(event) =>
                            setItemDrafts((current) => ({
                              ...current,
                              [item.id]: {
                                ...itemDraft,
                                status: event.target.value
                              }
                            }))
                          }
                        >
                          {itemStatuses.map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </Select>
                        <div className="flex justify-end">
                          <Button onClick={() => saveItem(item)} disabled={busyId === item.id}>
                            {busyId === item.id ? 'Saving...' : 'Save Item'}
                          </Button>
                        </div>
                      </div>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <Textarea
                          value={itemDraft.rationale}
                          onChange={(event) =>
                            setItemDrafts((current) => ({
                              ...current,
                              [item.id]: {
                                ...itemDraft,
                                rationale: event.target.value
                              }
                            }))
                          }
                          placeholder="Rationale"
                        />
                        <Textarea
                          value={itemDraft.expectedImpact}
                          onChange={(event) =>
                            setItemDrafts((current) => ({
                              ...current,
                              [item.id]: {
                                ...itemDraft,
                                expectedImpact: event.target.value
                              }
                            }))
                          }
                          placeholder="Expected impact"
                        />
                      </div>
                      {item.linkedRiskIds.length ? (
                        <p className="mt-2 text-xs text-muted-foreground">Linked risks: {item.linkedRiskIds.join(', ')}</p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </DataTable>
          );
        }) : <p className="text-sm text-muted-foreground">No roadmap has been generated yet.</p>}
      </div>
    </div>
  );
}

