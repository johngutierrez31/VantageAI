'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
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

type EvidenceMapItemRow = {
  id: string;
  questionCluster: string;
  supportStrength: 'STRONG' | 'MODERATE' | 'WEAK' | 'MISSING';
  buyerSafeSummary: string;
  recommendedNextAction: string;
  relatedControlIds: string[];
  evidenceArtifactIds: string[];
  ownerIds: string[];
  relatedTaskId: string | null;
  relatedFindingId: string | null;
};

function toDateTimeLocal(value: string | null) {
  if (!value) return '';
  return value.slice(0, 16);
}

export function EvidenceMapDetailPanel({
  evidenceMap,
  reviewers
}: {
  evidenceMap: {
    id: string;
    name: string;
    status: 'DRAFT' | 'NEEDS_REVIEW' | 'APPROVED' | 'ARCHIVED';
    assignedReviewerUserId: string | null;
    reviewDueAt: string | null;
    reviewerNotes: string | null;
    questionnaireUploadId: string;
    questionnaireLabel: string;
    items: EvidenceMapItemRow[];
  };
  reviewers: ReviewerOption[];
}) {
  const router = useRouter();
  const [assignedReviewerUserId, setAssignedReviewerUserId] = useState(evidenceMap.assignedReviewerUserId ?? '');
  const [reviewDueAt, setReviewDueAt] = useState(toDateTimeLocal(evidenceMap.reviewDueAt));
  const [reviewerNotes, setReviewerNotes] = useState(evidenceMap.reviewerNotes ?? '');
  const [busy, setBusy] = useState<'save' | 'approve' | 'archive' | 'refresh' | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function save(status?: 'APPROVED' | 'ARCHIVED') {
    setBusy(status === 'APPROVED' ? 'approve' : status === 'ARCHIVED' ? 'archive' : 'save');
    setMessage(null);
    const response = await fetch(`/api/evidence-maps/${evidenceMap.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assignedReviewerUserId: assignedReviewerUserId || null,
        reviewDueAt: reviewDueAt ? new Date(reviewDueAt).toISOString() : null,
        reviewerNotes,
        status
      })
    });
    const payload = await response.json().catch(() => ({}));
    setBusy(null);
    if (!response.ok) {
      setMessage(payload.error ?? 'Failed to update evidence map');
      return;
    }

    setMessage(status ? `Evidence map ${status.toLowerCase()}.` : 'Evidence map saved.');
    router.refresh();
  }

  async function refreshMap() {
    setBusy('refresh');
    setMessage(null);
    const response = await fetch(`/api/questionnaires/${evidenceMap.questionnaireUploadId}/evidence-map`, {
      method: 'POST'
    });
    const payload = await response.json().catch(() => ({}));
    setBusy(null);
    if (!response.ok) {
      setMessage(payload.error ?? 'Failed to refresh evidence map');
      return;
    }

    setMessage('Evidence map regenerated from the latest questionnaire state.');
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={evidenceMap.name}
        description={`Source questionnaire: ${evidenceMap.questionnaireLabel}`}
        secondaryActions={[
          { label: 'Review Queue', href: '/app/trust/reviews', variant: 'outline' },
          { label: 'Open Questionnaire', href: `/app/questionnaires/${evidenceMap.questionnaireUploadId}`, variant: 'outline' }
        ]}
      >
        <StatusPill status={evidenceMap.status} />
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle>Evidence Map Review</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-[240px_220px_1fr_auto_auto_auto]">
          <Select value={assignedReviewerUserId} onChange={(event) => setAssignedReviewerUserId(event.target.value)}>
            <option value="">Unassigned</option>
            {reviewers.map((reviewer) => (
              <option key={reviewer.id} value={reviewer.id}>
                {reviewer.label}
              </option>
            ))}
          </Select>
          <Input type="datetime-local" value={reviewDueAt} onChange={(event) => setReviewDueAt(event.target.value)} />
          <Input value={reviewerNotes} onChange={(event) => setReviewerNotes(event.target.value)} placeholder="Reviewer notes" />
          <Button onClick={() => save()} disabled={busy !== null}>
            {busy === 'save' ? 'Saving...' : 'Save'}
          </Button>
          <Button onClick={() => save('APPROVED')} variant="outline" disabled={busy !== null}>
            {busy === 'approve' ? 'Approving...' : 'Approve'}
          </Button>
          <Button onClick={refreshMap} variant="secondary" disabled={busy !== null}>
            {busy === 'refresh' ? 'Refreshing...' : 'Refresh from Questionnaire'}
          </Button>
          <div className="md:col-span-6 flex justify-end">
            <Button onClick={() => save('ARCHIVED')} variant="ghost" disabled={busy !== null}>
              {busy === 'archive' ? 'Archiving...' : 'Archive'}
            </Button>
          </div>
          {message ? <p className="md:col-span-6 text-sm text-muted-foreground">{message}</p> : null}
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {evidenceMap.items.map((item) => (
          <Card key={item.id}>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-lg">{item.questionCluster}</CardTitle>
                <div className="flex items-center gap-2">
                  <StatusPill status={item.supportStrength} />
                  {item.relatedFindingId ? <StatusPill status="OPEN" /> : null}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{item.buyerSafeSummary}</p>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-md border border-border p-3 text-sm">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Controls</p>
                  <p>{item.relatedControlIds.join(', ') || 'None linked'}</p>
                </div>
                <div className="rounded-md border border-border p-3 text-sm">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Evidence</p>
                  <p>{item.evidenceArtifactIds.join(', ') || 'No artifacts linked'}</p>
                </div>
                <div className="rounded-md border border-border p-3 text-sm">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Owners</p>
                  <p>{item.ownerIds.join(', ') || 'No owner assigned'}</p>
                </div>
              </div>
              <div className="rounded-md border border-border bg-muted/20 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Recommended Next Action</p>
                <p className="text-sm">{item.recommendedNextAction}</p>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {item.relatedTaskId ? (
                  <Link href="/app/findings" className="underline">
                    Related task: {item.relatedTaskId}
                  </Link>
                ) : null}
                {item.relatedFindingId ? (
                  <Link href="/app/findings" className="underline">
                    Related finding: {item.relatedFindingId}
                  </Link>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
