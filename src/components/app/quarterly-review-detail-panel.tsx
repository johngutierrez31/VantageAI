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

function toLines(value: string) {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

export function QuarterlyReviewDetailPanel({
  review
}: {
  review: {
    id: string;
    reviewPeriod: string;
    status: string;
    reviewDate: string;
    attendeeNames: string[];
    notes: string | null;
    decisionsMade: string[];
    followUpActions: string[];
    risks: Array<{ id: string; title: string; severity: string; status: string }>;
    snapshot: { overallScore: number; overallDelta: number | null };
    boardBrief: { id: string; title: string; status: string };
    roadmap: { id: string; name: string; status: string };
  };
}) {
  const [attendees, setAttendees] = useState(review.attendeeNames.join('\n'));
  const [notes, setNotes] = useState(review.notes ?? '');
  const [decisions, setDecisions] = useState(review.decisionsMade.join('\n'));
  const [followUpActions, setFollowUpActions] = useState(review.followUpActions.join('\n'));
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save(status?: string) {
    setBusy(status ?? 'save');
    setError(null);
    try {
      await apiRequest(`/api/pulse/quarterly-reviews/${review.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendeeNames: toLines(attendees),
          notes: notes || null,
          decisionsMade: toLines(decisions),
          followUpActions: toLines(followUpActions),
          status
        })
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
        title={`Quarterly Review ${review.reviewPeriod}`}
        description="Recurring leadership review workflow tied to the current scorecard, roadmap, and board brief."
        primaryAction={{ label: 'Open Pulse', href: '/app/pulse' }}
        secondaryActions={[
          { label: 'Open Board Brief', href: `/app/pulse/board-briefs/${review.boardBrief.id}`, variant: 'outline' },
          { label: 'Open Roadmap', href: '/app/pulse/roadmap', variant: 'outline' }
        ]}
      />

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <DataTable
        title="Review Controls"
        description={`Review date ${new Date(review.reviewDate).toLocaleDateString()}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => save()} disabled={busy !== null}>
              {busy === 'save' ? 'Saving...' : 'Save Review'}
            </Button>
            <Button onClick={() => save('FINALIZED')} disabled={busy !== null || review.boardBrief.status !== 'APPROVED'}>
              {busy === 'FINALIZED' ? 'Saving...' : 'Finalize Review'}
            </Button>
          </div>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill status={review.status} />
          <StatusPill status={review.boardBrief.status} />
          <span className="text-sm text-muted-foreground">
            Snapshot {review.snapshot.overallScore.toFixed(1)} / 100{review.snapshot.overallDelta === null ? '' : ` | delta ${review.snapshot.overallDelta >= 0 ? '+' : ''}${review.snapshot.overallDelta.toFixed(1)}`}
          </span>
        </div>
      </DataTable>

      <div className="grid gap-4 xl:grid-cols-2">
        <DataTable title="Attendees" description="One participant per line.">
          <Textarea value={attendees} onChange={(event) => setAttendees(event.target.value)} placeholder="CISO\nCEO\nOperations lead" />
        </DataTable>
        <DataTable title="Notes" description="Leadership discussion notes and context.">
          <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Quarterly review notes" />
        </DataTable>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <DataTable title="Decisions Made" description="One decision per line.">
          <Textarea value={decisions} onChange={(event) => setDecisions(event.target.value)} placeholder="Approve IAM remediation budget" />
        </DataTable>
        <DataTable title="Follow-Up Actions" description="One follow-up action per line.">
          <Textarea value={followUpActions} onChange={(event) => setFollowUpActions(event.target.value)} placeholder="Confirm owner for trust evidence refresh" />
        </DataTable>
      </div>

      <DataTable title="Top Risks In Review" description="Current material risks carried into the quarterly cadence.">
        <div className="space-y-3">
          {review.risks.map((risk) => (
            <div key={risk.id} className="rounded-md border border-border p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">{risk.title}</p>
                <div className="flex items-center gap-2">
                  <StatusPill status={risk.severity} />
                  <StatusPill status={risk.status} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </DataTable>
    </div>
  );
}
