'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/app/page-header';
import { StatusPill } from '@/components/app/status-pill';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

type EvidenceOption = {
  id: string;
  name: string;
};

type TimelineItem = {
  id: string;
  action: string;
  entityType: string;
  createdAt: string;
};

type TrustItemData = {
  id: string;
  title: string;
  requesterEmail: string | null;
  status: 'NEW' | 'IN_REVIEW' | 'DRAFT_READY' | 'DELIVERED';
  notes: string | null;
  questionnaireUploadId: string | null;
  attachments: Array<{ evidenceId: string; evidence: { id: string; name: string } }>;
  questionnaireUpload?: {
    filename: string;
    items: Array<{
      id: string;
      rowKey: string;
      questionText: string;
      draftAnswers: Array<{ answerText: string }>;
    }>;
  } | null;
};

export function TrustInboxDetailPanel({
  item,
  timeline,
  suggestedDocs
}: {
  item: TrustItemData;
  timeline: TimelineItem[];
  suggestedDocs: Array<{ evidence: EvidenceOption }>;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(item.status);
  const [notes, setNotes] = useState(item.notes ?? '');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedEvidenceIds, setSelectedEvidenceIds] = useState<string[]>(
    item.attachments.map((attachment) => attachment.evidenceId)
  );

  const evidenceOptions = useMemo(() => {
    const unique = new Map<string, EvidenceOption>();
    for (const doc of suggestedDocs) {
      unique.set(doc.evidence.id, doc.evidence);
    }
    return Array.from(unique.values()).filter((option) =>
      option.name.toLowerCase().includes(search.trim().toLowerCase())
    );
  }, [search, suggestedDocs]);

  function toggleEvidence(evidenceId: string) {
    setSelectedEvidenceIds((prev) =>
      prev.includes(evidenceId) ? prev.filter((value) => value !== evidenceId) : [...prev, evidenceId]
    );
  }

  async function save() {
    setBusy(true);
    setMessage(null);
    const response = await fetch(`/api/trust/inbox/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status,
        notes,
        attachmentEvidenceIds: selectedEvidenceIds
      })
    });
    const payload = await response.json().catch(() => ({}));
    setBusy(false);

    if (!response.ok) {
      setMessage(payload.error ?? 'Failed to update trust inbox item');
      return;
    }

    setMessage('Saved.');
    router.refresh();
  }

  async function exportCompleted() {
    setBusy(true);
    setMessage(null);
    const response = await fetch(`/api/trust/inbox/${item.id}/export`, { method: 'POST' });
    setBusy(false);
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setMessage(payload.error ?? 'Export failed');
      return;
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `trust-inbox-${item.id}-completed.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    setMessage('Export complete.');
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={item.title}
        description={`Requester: ${item.requesterEmail ?? 'N/A'}`}
        secondaryActions={[{ label: 'Back to Inbox', href: '/app/trust/inbox', variant: 'outline' }]}
      >
        <StatusPill status={status} />
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle>Workflow</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-[180px_1fr_auto_auto]">
          <Select value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
            <option value="NEW">New</option>
            <option value="IN_REVIEW">In Review</option>
            <option value="DRAFT_READY">Draft Ready</option>
            <option value="DELIVERED">Delivered</option>
          </Select>
          <Input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Internal notes" />
          <Button onClick={save} disabled={busy}>{busy ? 'Saving...' : 'Save'}</Button>
          <Button onClick={exportCompleted} variant="secondary" disabled={busy || !item.questionnaireUploadId}>
            Export Completed
          </Button>
          {message ? <p className="md:col-span-4 text-sm text-muted-foreground">{message}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recommended Attachments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Input
            placeholder="Filter documents"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <div className="grid gap-2 md:grid-cols-2">
            {evidenceOptions.map((option) => (
              <label key={option.id} className="flex items-center gap-2 rounded-md border border-border p-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedEvidenceIds.includes(option.id)}
                  onChange={() => toggleEvidence(option.id)}
                />
                <span>{option.name}</span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Questionnaire Preview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {!item.questionnaireUpload ? (
            <p className="text-sm text-muted-foreground">No questionnaire linked.</p>
          ) : (
            item.questionnaireUpload.items.slice(0, 25).map((row) => (
              <div key={row.id} className="rounded-md border border-border p-3">
                <p className="text-sm font-semibold">{row.rowKey}</p>
                <p className="text-sm">{row.questionText}</p>
                <p className="text-xs text-muted-foreground">
                  Draft: {row.draftAnswers[0]?.answerText?.slice(0, 180) ?? 'No draft'}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Activity Timeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {timeline.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity yet.</p>
          ) : (
            timeline.map((entry) => (
              <div key={entry.id} className="rounded-md border border-border p-2 text-sm">
                <p className="font-semibold">{entry.action}</p>
                <p className="text-xs text-muted-foreground">
                  {entry.entityType} | {new Date(entry.createdAt).toLocaleString()}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
