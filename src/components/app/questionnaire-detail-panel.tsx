'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/app/page-header';
import { StatusPill } from '@/components/app/status-pill';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

type ItemRow = {
  id: string;
  rowKey: string;
  rowOrder: number;
  questionText: string;
  normalizedQuestion: string | null;
  openTaskCount: number;
  openFindingCount: number;
  mappings: Array<{
    confidence: number;
    status: 'MAPPED' | 'UNMAPPED';
    templateQuestion?: { id: string; prompt: string; controlCode?: string | null } | null;
  }>;
  draftAnswers: Array<{
    id: string;
    answerText: string;
    model: string;
    confidenceScore: number;
    reviewRequired: boolean;
    status: 'DRAFT' | 'NEEDS_REVIEW' | 'APPROVED' | 'REJECTED';
    reviewReason: string | null;
    notesForReviewer: string | null;
    reviewerNotes: string | null;
    mappedControlIds: string[];
    supportingEvidenceIds: string[];
  }>;
};

type TemplateOption = {
  id: string;
  name: string;
};

type ReviewerOption = {
  id: string;
  label: string;
};

function toDateTimeLocal(value?: string | null) {
  return value ? value.slice(0, 16) : '';
}

export function QuestionnaireDetailPanel({
  questionnaireId,
  filename,
  organizationName,
  status,
  assignedReviewerUserId,
  reviewDueAt,
  reviewedAt,
  trustInboxItem,
  evidenceMap,
  items,
  templates,
  reviewers
}: {
  questionnaireId: string;
  filename: string;
  organizationName?: string | null;
  status: string;
  assignedReviewerUserId?: string | null;
  reviewDueAt?: string | null;
  reviewedAt?: string | null;
  trustInboxItem?: { id: string; title: string; status: string } | null;
  evidenceMap?: { id: string; status: string; reviewDueAt?: string | null; itemCount: number } | null;
  items: ItemRow[];
  templates: TemplateOption[];
  reviewers: ReviewerOption[];
}) {
  const router = useRouter();
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? '');
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [reviewerNotes, setReviewerNotes] = useState<Record<string, string>>({});
  const [libraryScope, setLibraryScope] = useState<Record<string, 'REUSABLE' | 'TENANT_SPECIFIC'>>({});
  const [assignmentReviewer, setAssignmentReviewer] = useState(assignedReviewerUserId ?? '');
  const [assignmentDueAt, setAssignmentDueAt] = useState(toDateTimeLocal(reviewDueAt));

  const totals = useMemo(() => {
    const latestDrafts = items.map((item) => item.draftAnswers[0]).filter(Boolean);
    return {
      totalRows: items.length,
      drafted: latestDrafts.length,
      approved: latestDrafts.filter((draft) => draft.status === 'APPROVED').length,
      needsReview: latestDrafts.filter((draft) => draft.status === 'NEEDS_REVIEW' || draft.status === 'REJECTED').length,
      followUpTasks: items.reduce((sum, item) => sum + item.openTaskCount, 0)
    };
  }, [items]);

  async function runMap() {
    setBusy('map');
    setMessage(null);

    const response = await fetch(`/api/questionnaires/${questionnaireId}/map`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateId: templateId || undefined })
    });
    const payload = await response.json().catch(() => ({}));
    setBusy(null);

    if (!response.ok) {
      setMessage(payload.error ?? 'Mapping failed');
      return;
    }

    setMessage('Mapping complete.');
    router.refresh();
  }

  async function runDrafts() {
    setBusy('draft');
    setMessage(null);
    const response = await fetch(`/api/questionnaires/${questionnaireId}/draft`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const payload = await response.json().catch(() => ({}));
    setBusy(null);

    if (!response.ok) {
      setMessage(payload.error ?? 'Draft generation failed');
      return;
    }

    setMessage(
      `Drafted ${payload.draftCount ?? 0} answers${payload.followUpTaskCount ? ` and created ${payload.followUpTaskCount} follow-up task(s)` : ''}.`
    );
    router.refresh();
  }

  async function exportCsv() {
    setBusy('export');
    setMessage(null);
    const response = await fetch(`/api/questionnaires/${questionnaireId}/export`, { method: 'POST' });
    setBusy(null);
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setMessage(payload.error ?? 'Export failed');
      return;
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${filename.replace(/\.[a-z0-9]+$/i, '')}-approved.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    setMessage('Approved response pack exported.');
  }

  async function saveAssignment() {
    setBusy('assignment');
    setMessage(null);
    const response = await fetch(`/api/questionnaires/${questionnaireId}/assignment`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assignedReviewerUserId: assignmentReviewer || null,
        reviewDueAt: assignmentDueAt ? new Date(assignmentDueAt).toISOString() : null
      })
    });
    const payload = await response.json().catch(() => ({}));
    setBusy(null);
    if (!response.ok) {
      setMessage(payload.error ?? 'Failed to update questionnaire assignment');
      return;
    }

    setMessage('Review assignment updated.');
    router.refresh();
  }

  async function buildEvidenceMap() {
    setBusy('evidence-map');
    setMessage(null);
    const response = await fetch(`/api/questionnaires/${questionnaireId}/evidence-map`, {
      method: 'POST'
    });
    const payload = await response.json().catch(() => ({}));
    setBusy(null);
    if (!response.ok) {
      setMessage(payload.error ?? 'Failed to generate evidence map');
      return;
    }

    setMessage('Evidence map generated and saved.');
    router.refresh();
  }

  async function reviewItem(itemId: string, decision: 'APPROVED' | 'REJECTED') {
    const note = reviewerNotes[itemId]?.trim() ?? '';
    if (decision === 'REJECTED' && note.length < 2) {
      setMessage('Reviewer notes are required when rejecting a draft.');
      return;
    }

    setBusy(`review:${itemId}`);
    setMessage(null);
    const response = await fetch(`/api/questionnaires/${questionnaireId}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        itemId,
        decision,
        reviewerNotes: note || `Marked ${decision.toLowerCase()} via questionnaire review queue.`,
        saveToLibrary: decision === 'APPROVED',
        libraryScope: libraryScope[itemId] ?? 'TENANT_SPECIFIC'
      })
    });
    const payload = await response.json().catch(() => ({}));
    setBusy(null);

    if (!response.ok) {
      setMessage(payload.error ?? 'Review action failed');
      return;
    }

    setMessage(decision === 'APPROVED' ? 'Draft approved and saved to the answer library.' : 'Draft rejected.');
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={filename}
        description={organizationName ? `Buyer organization: ${organizationName}` : 'Review mappings, generate cited draft answers, and approve only buyer-safe responses for export.'}
        secondaryActions={[
          { label: 'Back', href: '/app/questionnaires', variant: 'outline' },
          { label: 'Review Queue', href: '/app/trust/reviews', variant: 'outline' },
          { label: 'Answer Library', href: '/app/trust/answer-library', variant: 'outline' },
          trustInboxItem ? { label: 'Open Trust Inbox', href: `/app/trust/inbox/${trustInboxItem.id}`, variant: 'outline' } : null
        ].filter(Boolean) as Array<{ label: string; href: string; variant: 'outline' }>}
      >
        <StatusPill status={status} />
      </PageHeader>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>TrustOps Snapshot</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-md border border-border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Rows</p>
              <p className="text-2xl font-semibold">{totals.totalRows}</p>
            </div>
            <div className="rounded-md border border-border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Approved</p>
              <p className="text-2xl font-semibold">{totals.approved}</p>
            </div>
            <div className="rounded-md border border-border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Needs Review</p>
              <p className="text-2xl font-semibold">{totals.needsReview}</p>
            </div>
            <div className="rounded-md border border-border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Follow-up Tasks</p>
              <p className="text-2xl font-semibold">{totals.followUpTasks}</p>
            </div>
            <div className="rounded-md border border-border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Linked Intake</p>
              <p className="text-sm font-medium">{trustInboxItem?.title ?? 'Not linked'}</p>
              {trustInboxItem ? <StatusPill status={trustInboxItem.status} /> : null}
            </div>
            <div className="rounded-md border border-border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Last Reviewed</p>
              <p className="text-sm font-medium">
                {reviewedAt ? new Date(reviewedAt).toLocaleString() : 'Not reviewed yet'}
              </p>
            </div>
            <div className="rounded-md border border-border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Evidence Map</p>
              <p className="text-sm font-medium">
                {evidenceMap ? `${evidenceMap.itemCount} cluster(s)` : 'Not generated'}
              </p>
              {evidenceMap ? <StatusPill status={evidenceMap.status} /> : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Guided Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-md border border-border p-3 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Vantage skill: Draft Questionnaire Answers</p>
              <p>Uses tenant-approved answers and evidence, assigns confidence, and routes low-confidence outputs for review.</p>
            </div>
            <div className="grid gap-2 md:grid-cols-[220px_220px_auto]">
              <Select value={assignmentReviewer} onChange={(event) => setAssignmentReviewer(event.target.value)} className="w-full">
                <option value="">Assign reviewer</option>
                {reviewers.map((reviewer) => (
                  <option key={reviewer.id} value={reviewer.id}>
                    {reviewer.label}
                  </option>
                ))}
              </Select>
              <Input type="datetime-local" value={assignmentDueAt} onChange={(event) => setAssignmentDueAt(event.target.value)} />
              <Button onClick={saveAssignment} disabled={busy !== null}>
                {busy === 'assignment' ? 'Saving...' : 'Save Assignment'}
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={templateId} onChange={(event) => setTemplateId(event.target.value)} className="w-[280px]">
                {templates.length === 0 ? <option value="">No template available</option> : null}
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </Select>
              <Button onClick={runMap} disabled={busy !== null || templates.length === 0}>
                {busy === 'map' ? 'Mapping...' : 'Auto-map Questions'}
              </Button>
              <Button onClick={runDrafts} variant="outline" disabled={busy !== null}>
                {busy === 'draft' ? 'Drafting...' : 'Draft Questionnaire Answers'}
              </Button>
              <Button onClick={buildEvidenceMap} variant="outline" disabled={busy !== null}>
                {busy === 'evidence-map' ? 'Building...' : 'Build Evidence Map'}
              </Button>
              <Button onClick={exportCsv} variant="secondary" disabled={busy !== null}>
                {busy === 'export' ? 'Exporting...' : 'Export Approved Response Pack'}
              </Button>
              {evidenceMap ? (
                <Button asChild variant="secondary">
                  <Link href={`/app/trust/evidence-maps/${evidenceMap.id}`}>Open Evidence Map</Link>
                </Button>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">
              Only approved answers are included in export. Weak or missing support creates follow-up tasks and TrustOps findings automatically.
            </p>
            {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Questionnaire Review Queue</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.map((item) => {
            const mapping = item.mappings[0];
            const draft = item.draftAnswers[0];
            const actionBusy = busy === `review:${item.id}`;
            return (
              <div key={item.id} className="space-y-3 rounded-md border border-border p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{item.rowKey}</p>
                      <StatusPill status={draft?.status ?? 'DRAFT'} />
                      {item.openTaskCount ? <span className="text-xs text-muted-foreground">{item.openTaskCount} task(s) open</span> : null}
                      {item.openFindingCount ? <span className="text-xs text-muted-foreground">{item.openFindingCount} finding(s) open</span> : null}
                    </div>
                    <p className="text-sm">{item.questionText}</p>
                    <p className="text-xs text-muted-foreground">
                      Normalized: {item.normalizedQuestion ?? 'Pending normalization'}
                    </p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p>Row {item.rowOrder}</p>
                    <p>{mapping?.templateQuestion?.controlCode ? `Control ${mapping.templateQuestion.controlCode}` : 'No control mapped'}</p>
                  </div>
                </div>

                <div className="grid gap-3 lg:grid-cols-[1fr_1fr]">
                  <div className="space-y-2 rounded-md bg-muted/20 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Mapping</p>
                    <p className="text-sm">{mapping?.templateQuestion?.prompt ?? 'Unmapped'}</p>
                    <p className="text-xs text-muted-foreground">
                      Match confidence: {mapping ? `${Math.round(mapping.confidence * 100)}%` : '-'}
                    </p>
                  </div>
                  <div className="space-y-2 rounded-md bg-muted/20 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Draft Output</p>
                    <p className="text-sm whitespace-pre-wrap">{draft?.answerText ?? 'No draft generated yet.'}</p>
                    {draft ? (
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span>Confidence {draft.confidenceScore.toFixed(2)}</span>
                        <span>{draft.mappedControlIds.length} control link(s)</span>
                        <span>{draft.supportingEvidenceIds.length} evidence link(s)</span>
                        <span>Model {draft.model}</span>
                      </div>
                    ) : null}
                  </div>
                </div>

                {draft?.reviewReason ? (
                  <p className="text-sm text-muted-foreground">Review reason: {draft.reviewReason}</p>
                ) : null}
                {draft?.notesForReviewer ? (
                  <p className="text-sm text-muted-foreground">Reviewer notes: {draft.notesForReviewer}</p>
                ) : null}
                {draft?.reviewerNotes ? (
                  <p className="text-sm text-muted-foreground">Last decision notes: {draft.reviewerNotes}</p>
                ) : null}

                <div className="grid gap-2 md:grid-cols-[1fr_200px_auto_auto]">
                  <Input
                    value={reviewerNotes[item.id] ?? ''}
                    onChange={(event) =>
                      setReviewerNotes((current) => ({
                        ...current,
                        [item.id]: event.target.value
                      }))
                    }
                    placeholder="Reviewer notes or rejection reason"
                    disabled={!draft}
                  />
                  <Select
                    value={libraryScope[item.id] ?? 'TENANT_SPECIFIC'}
                    onChange={(event) =>
                      setLibraryScope((current) => ({
                        ...current,
                        [item.id]: event.target.value as 'REUSABLE' | 'TENANT_SPECIFIC'
                      }))
                    }
                    disabled={!draft}
                  >
                    <option value="TENANT_SPECIFIC">Tenant specific</option>
                    <option value="REUSABLE">Reusable</option>
                  </Select>
                  <Button onClick={() => reviewItem(item.id, 'APPROVED')} disabled={!draft || actionBusy || busy !== null && !actionBusy}>
                    {actionBusy ? 'Saving...' : 'Approve'}
                  </Button>
                  <Button
                    onClick={() => reviewItem(item.id, 'REJECTED')}
                    variant="outline"
                    disabled={!draft || actionBusy || (busy !== null && !actionBusy)}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
