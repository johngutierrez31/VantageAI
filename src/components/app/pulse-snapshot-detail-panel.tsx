'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/app/page-header';
import { DataTable } from '@/components/app/data-table';
import { StatusPill } from '@/components/app/status-pill';
import { Button } from '@/components/ui/button';

async function apiRequest(url: string, options?: RequestInit) {
  const response = await fetch(url, options);
  const text = await response.text();
  if (!response.ok) {
    throw new Error(text || `Request failed with ${response.status}`);
  }
  return text ? JSON.parse(text) : null;
}

export function PulseSnapshotDetailPanel({
  snapshot
}: {
  snapshot: {
    id: string;
    reportingPeriod: string;
    periodType: string;
    status: string;
    overallScore: number;
    overallDelta: number | null;
    summaryText: string;
    measuredInputsJson: Record<string, unknown>;
    categoryScores: Array<{
      id: string;
      label: string;
      score: number;
      delta: number | null;
      measuredValue: number;
      benchmarkValue: number | null;
      summaryText: string;
    }>;
    roadmaps: Array<{ id: string; name: string; status: string }>;
    boardBriefs: Array<{ id: string; title: string; status: string }>;
    quarterlyReviews: Array<{ id: string; reviewPeriod: string; status: string }>;
  };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function updateStatus(status: string) {
    setBusy(status);
    setError(null);
    try {
      await apiRequest(`/api/pulse/snapshots/${snapshot.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      router.refresh();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : String(nextError));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Pulse Snapshot ${snapshot.reportingPeriod}`}
        description="Executive scorecard with explainable posture categories and measured input drilldowns."
        primaryAction={{ label: 'Open Pulse', href: '/app/pulse' }}
        secondaryActions={[
          { label: 'Approve Snapshot', href: '#', variant: 'outline' },
          { label: 'Open Roadmap', href: '/app/pulse/roadmap', variant: 'outline' }
        ]}
      />

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <DataTable
        title="Snapshot Overview"
        description={`Overall posture ${snapshot.overallScore.toFixed(1)} / 100`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => updateStatus('APPROVED')} disabled={busy !== null}>
              {busy === 'APPROVED' ? 'Saving...' : 'Approve'}
            </Button>
            <Button onClick={() => updateStatus('PUBLISHED')} disabled={busy !== null}>
              {busy === 'PUBLISHED' ? 'Saving...' : 'Publish'}
            </Button>
          </div>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill status={snapshot.status} />
          <StatusPill status={snapshot.periodType} />
          <span className="text-sm text-muted-foreground">
            {snapshot.overallDelta === null ? 'No prior snapshot' : `Delta ${snapshot.overallDelta >= 0 ? '+' : ''}${snapshot.overallDelta.toFixed(1)}`}
          </span>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">{snapshot.summaryText}</p>
      </DataTable>

      <DataTable title="Category Scores" description="Transparent measured categories that roll into the executive score.">
        <div className="space-y-3">
          {snapshot.categoryScores.map((category) => (
            <div key={category.id} className="rounded-md border border-border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold">{category.label}</p>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold">{category.score.toFixed(1)} / 100</span>
                  {category.delta !== null ? <StatusPill status={category.delta >= 0 ? 'ON_TRACK' : 'OVERDUE'} /> : null}
                </div>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Measured value {category.measuredValue}{category.benchmarkValue !== null ? ` | benchmark ${category.benchmarkValue}` : ''}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">{category.summaryText}</p>
            </div>
          ))}
        </div>
      </DataTable>

      <DataTable title="Measured Inputs" description="Raw signals used to compute the scorecard.">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Object.entries(snapshot.measuredInputsJson).map(([key, value]) => (
            <div key={key} className="rounded-md border border-border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{key}</p>
              <p className="mt-1 text-sm font-semibold">{String(value)}</p>
            </div>
          ))}
        </div>
      </DataTable>

      <DataTable title="Linked Executive Objects" description="Downstream Pulse records tied to this snapshot.">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-md border border-border p-3">
            <p className="text-sm font-semibold">Roadmaps</p>
            <div className="mt-2 space-y-2">
              {snapshot.roadmaps.length ? snapshot.roadmaps.map((roadmap) => (
                <div key={roadmap.id} className="flex items-center justify-between gap-2 text-sm">
                  <span>{roadmap.name}</span>
                  <StatusPill status={roadmap.status} />
                </div>
              )) : <p className="text-sm text-muted-foreground">None</p>}
            </div>
          </div>
          <div className="rounded-md border border-border p-3">
            <p className="text-sm font-semibold">Board Briefs</p>
            <div className="mt-2 space-y-2">
              {snapshot.boardBriefs.length ? snapshot.boardBriefs.map((brief) => (
                <div key={brief.id} className="flex items-center justify-between gap-2 text-sm">
                  <span>{brief.title}</span>
                  <StatusPill status={brief.status} />
                </div>
              )) : <p className="text-sm text-muted-foreground">None</p>}
            </div>
          </div>
          <div className="rounded-md border border-border p-3">
            <p className="text-sm font-semibold">Quarterly Reviews</p>
            <div className="mt-2 space-y-2">
              {snapshot.quarterlyReviews.length ? snapshot.quarterlyReviews.map((review) => (
                <div key={review.id} className="flex items-center justify-between gap-2 text-sm">
                  <span>{review.reviewPeriod}</span>
                  <StatusPill status={review.status} />
                </div>
              )) : <p className="text-sm text-muted-foreground">None</p>}
            </div>
          </div>
        </div>
      </DataTable>
    </div>
  );
}
