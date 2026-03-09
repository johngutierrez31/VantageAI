'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/app/page-header';
import { DataTable } from '@/components/app/data-table';
import { StatusPill } from '@/components/app/status-pill';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

async function apiRequest(url: string, options?: RequestInit) {
  const response = await fetch(url, options);
  const text = await response.text();
  if (!response.ok) {
    throw new Error(text || `Request failed with ${response.status}`);
  }
  return text ? JSON.parse(text) : null;
}

export function BoardBriefDetailPanel({
  brief
}: {
  brief: {
    id: string;
    title: string;
    reportingPeriod: string;
    status: string;
    overallPostureSummary: string;
    reviewerNotes: string | null;
    notableImprovements: string[];
    overdueActions: string[];
    leadershipDecisionsNeeded: string[];
    roadmap30Days: string[];
    roadmap60Days: string[];
    roadmap90Days: string[];
    risks: Array<{ id: string; title: string; severity: string; status: string; ownerUserId: string | null }>;
  };
}) {
  const [reviewerNotes, setReviewerNotes] = useState(brief.reviewerNotes ?? '');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function updateBrief(status?: string) {
    setBusy(status ?? 'save');
    setError(null);
    try {
      await apiRequest(`/api/pulse/board-briefs/${brief.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewerNotes, status })
      });
      window.location.reload();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : String(nextError));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={brief.title}
        description="Durable board brief workflow for executive reporting and review-gated export."
        primaryAction={{ label: 'Open Pulse', href: '/app/pulse' }}
        secondaryActions={[{ label: 'Open Roadmap', href: '/app/pulse/roadmap', variant: 'outline' }]}
      />

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <DataTable
        title="Brief Controls"
        description={`Reporting period ${brief.reportingPeriod}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => updateBrief()} disabled={busy !== null}>
              {busy === 'save' ? 'Saving...' : 'Save Notes'}
            </Button>
            <Button variant="outline" onClick={() => updateBrief('NEEDS_REVIEW')} disabled={busy !== null}>
              {busy === 'NEEDS_REVIEW' ? 'Saving...' : 'Mark Needs Review'}
            </Button>
            <Button onClick={() => updateBrief('APPROVED')} disabled={busy !== null}>
              {busy === 'APPROVED' ? 'Saving...' : 'Approve Brief'}
            </Button>
            <Button asChild variant="outline" disabled={brief.status !== 'APPROVED'}>
              <a href={`/api/pulse/board-briefs/${brief.id}/export?format=html`}>Export HTML</a>
            </Button>
            <Button asChild variant="outline" disabled={brief.status !== 'APPROVED'}>
              <a href={`/api/pulse/board-briefs/${brief.id}/export?format=markdown`}>Export Markdown</a>
            </Button>
            <Button asChild variant="outline" disabled={brief.status !== 'APPROVED'}>
              <a href={`/api/pulse/board-briefs/${brief.id}/export?format=json`}>Export JSON</a>
            </Button>
          </div>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill status={brief.status} />
        </div>
        <p className="mt-4 text-sm text-muted-foreground">{brief.overallPostureSummary}</p>
        <Textarea
          className="mt-4"
          value={reviewerNotes}
          onChange={(event) => setReviewerNotes(event.target.value)}
          placeholder="Reviewer notes"
        />
      </DataTable>

      <div className="grid gap-4 xl:grid-cols-2">
        <DataTable title="Top Risks" description="Most material current risks included in the board narrative.">
          <div className="space-y-3">
            {brief.risks.map((risk) => (
              <div key={risk.id} className="rounded-md border border-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{risk.title}</p>
                  <div className="flex items-center gap-2">
                    <StatusPill status={risk.severity} />
                    <StatusPill status={risk.status} />
                  </div>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Owner: {risk.ownerUserId ?? 'Unassigned'}</p>
              </div>
            ))}
          </div>
        </DataTable>

        <DataTable title="Leadership Decisions Needed" description="Explicit asks for owners, funding, or timeline decisions.">
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            {brief.leadershipDecisionsNeeded.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </DataTable>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <DataTable title="Notable Improvements">
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            {brief.notableImprovements.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </DataTable>
        <DataTable title="Overdue Actions">
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            {brief.overdueActions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </DataTable>
        <DataTable title="30 / 60 / 90 Roadmap Summary">
          <div className="space-y-3 text-sm text-muted-foreground">
            <div>
              <p className="font-semibold text-foreground">30 Days</p>
              <ul className="mt-1 list-disc pl-5">
                {brief.roadmap30Days.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-semibold text-foreground">60 Days</p>
              <ul className="mt-1 list-disc pl-5">
                {brief.roadmap60Days.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-semibold text-foreground">90 Days</p>
              <ul className="mt-1 list-disc pl-5">
                {brief.roadmap90Days.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </DataTable>
      </div>
    </div>
  );
}
