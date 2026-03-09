'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { downloadResponseBlob } from '@/lib/browser/download';
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

type TrustPacketSummary = {
  id: string;
  name: string;
  status: string;
  shareMode: string;
  reviewerRequired: boolean;
  includedArtifactCount: number;
  staleArtifactCount: number;
  evidenceMapId: string | null;
  exportCount: number;
  lastExportedAt: string | null;
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
    id: string;
    filename: string;
    status: string;
    organizationName: string | null;
    evidenceMap?: {
      id: string;
      status: string;
      reviewDueAt: string | null;
    } | null;
    items: Array<{
      id: string;
      rowKey: string;
      questionText: string;
      draftAnswers: Array<{ answerText: string; status: string; confidenceScore: number }>;
    }>;
  } | null;
};

export function TrustInboxDetailPanel({
  item,
  timeline,
  suggestedDocs,
  packets
}: {
  item: TrustItemData;
  timeline: TimelineItem[];
  suggestedDocs: Array<{ evidence: EvidenceOption }>;
  packets: TrustPacketSummary[];
}) {
  const router = useRouter();
  const [status, setStatus] = useState(item.status);
  const [notes, setNotes] = useState(item.notes ?? '');
  const [busy, setBusy] = useState<'save' | 'export' | 'packet' | null>(null);
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

  const questionnaireSummary = useMemo(() => {
    const rows = item.questionnaireUpload?.items ?? [];
    const latestDrafts = rows.map((row) => row.draftAnswers[0]).filter(Boolean);
    return {
      totalRows: rows.length,
      approved: latestDrafts.filter((draft) => draft.status === 'APPROVED').length,
      needsReview: latestDrafts.filter((draft) => draft.status === 'NEEDS_REVIEW' || draft.status === 'REJECTED').length
    };
  }, [item.questionnaireUpload]);

  function toggleEvidence(evidenceId: string) {
    setSelectedEvidenceIds((prev) =>
      prev.includes(evidenceId) ? prev.filter((value) => value !== evidenceId) : [...prev, evidenceId]
    );
  }

  async function save() {
    setBusy('save');
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
    setBusy(null);

    if (!response.ok) {
      setMessage(payload.error ?? 'Failed to update trust inbox item');
      return;
    }

    setMessage('Saved.');
    router.refresh();
  }

  async function exportCompleted() {
    setBusy('export');
    setMessage(null);
    const response = await fetch(`/api/trust/inbox/${item.id}/export`, { method: 'POST' });
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
    anchor.download = `trust-inbox-${item.id}-approved.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    setMessage('Approved response pack exported.');
  }

  async function assemblePacket() {
    setBusy('packet');
    setMessage(null);
    const response = await fetch('/api/trust/packets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `${item.title} Trust Packet`,
        trustInboxItemId: item.id,
        shareMode: 'INTERNAL_REVIEW'
      })
    });
    const payload = await response.json().catch(() => ({}));
    setBusy(null);

    if (!response.ok) {
      setMessage(payload.error ?? 'Failed to assemble trust packet');
      return;
    }

    setMessage('Trust packet assembled.');
    router.refresh();
  }

  async function exportPacket(packetId: string, format: 'html' | 'markdown' | 'json') {
    setBusy('export');
    setMessage(null);
    const response = await fetch(`/api/trust/packets/${packetId}/export?format=${format}`);
    setBusy(null);
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setMessage(payload.error ?? 'Packet export failed');
      return;
    }

    const fileName = await downloadResponseBlob(
      response,
      `vantageai-trust-packet-${packetId}.${format === 'markdown' ? 'md' : format}`
    );
    setMessage(`Trust packet exported as ${fileName}.`);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={item.title}
        description={`Requester: ${item.requesterEmail ?? 'N/A'}`}
        secondaryActions={[
          { label: 'Back to Inbox', href: '/app/trust/inbox', variant: 'outline' },
          { label: 'Review Queue', href: '/app/trust/reviews', variant: 'outline' }
        ]}
      >
        <StatusPill status={status} />
      </PageHeader>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <CardHeader>
            <CardTitle>Workflow</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 md:grid-cols-[180px_1fr_auto_auto_auto]">
            <Select value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
              <option value="NEW">New</option>
              <option value="IN_REVIEW">In Review</option>
              <option value="DRAFT_READY">Draft Ready</option>
              <option value="DELIVERED">Delivered</option>
            </Select>
            <Input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Internal notes" />
            <Button onClick={save} disabled={busy !== null}>
              {busy === 'save' ? 'Saving...' : 'Save'}
            </Button>
            <Button onClick={assemblePacket} variant="outline" disabled={busy !== null || !item.questionnaireUploadId}>
              {busy === 'packet' ? 'Building...' : 'Assemble Packet'}
            </Button>
            <Button onClick={exportCompleted} variant="secondary" disabled={busy !== null || !item.questionnaireUploadId}>
              {busy === 'export' ? 'Exporting...' : 'Export Approved'}
            </Button>
            {message ? <p className="md:col-span-5 text-sm text-muted-foreground">{message}</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Questionnaire Status</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <div className="rounded-md border border-border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Rows</p>
              <p className="text-2xl font-semibold">{questionnaireSummary.totalRows}</p>
            </div>
            <div className="rounded-md border border-border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Approved</p>
              <p className="text-2xl font-semibold">{questionnaireSummary.approved}</p>
            </div>
            <div className="rounded-md border border-border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Needs Review</p>
              <p className="text-2xl font-semibold">{questionnaireSummary.needsReview}</p>
            </div>
            {item.questionnaireUpload ? (
              <div className="md:col-span-3 rounded-md border border-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{item.questionnaireUpload.filename}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.questionnaireUpload.organizationName ?? 'No buyer organization recorded'}
                    </p>
                  </div>
                  <StatusPill status={item.questionnaireUpload.status} />
                </div>
                {item.questionnaireUpload.evidenceMap ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>Evidence map ready</span>
                    <StatusPill status={item.questionnaireUpload.evidenceMap.status} />
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/app/trust/evidence-maps/${item.questionnaireUpload.evidenceMap.id}`}>Open Evidence Map</Link>
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Recommended Attachments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Input placeholder="Filter documents" value={search} onChange={(event) => setSearch(event.target.value)} />
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
            <CardTitle>Trust Packet History</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {packets.length === 0 ? (
              <p className="text-sm text-muted-foreground">No trust packets assembled for this intake yet.</p>
            ) : (
              packets.map((packet) => (
                <div key={packet.id} className="rounded-md border border-border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">{packet.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {packet.shareMode.replace(/_/g, ' ')} | {packet.includedArtifactCount} artifacts | {packet.exportCount} export(s)
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusPill status={packet.status} />
                      {packet.reviewerRequired ? <StatusPill status="NEEDS_REVIEW" /> : null}
                    </div>
                  </div>
                  {packet.staleArtifactCount ? (
                    <p className="mt-2 text-xs text-muted-foreground">{packet.staleArtifactCount} stale artifact(s) flagged.</p>
                  ) : null}
                  {packet.lastExportedAt ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Last exported: {new Date(packet.lastExportedAt).toLocaleString()}
                    </p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button onClick={() => exportPacket(packet.id, 'html')} size="sm" variant="outline" disabled={busy !== null}>
                      Export HTML
                    </Button>
                    <Button
                      onClick={() => exportPacket(packet.id, 'markdown')}
                      size="sm"
                      variant="outline"
                      disabled={busy !== null}
                    >
                      Export Markdown
                    </Button>
                    <Button onClick={() => exportPacket(packet.id, 'json')} size="sm" variant="outline" disabled={busy !== null}>
                      Export JSON
                    </Button>
                    {packet.evidenceMapId ? (
                      <Button asChild size="sm" variant="secondary">
                        <Link href={`/app/trust/evidence-maps/${packet.evidenceMapId}`}>Evidence Map</Link>
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

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
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{row.rowKey}</p>
                    <p className="text-sm">{row.questionText}</p>
                  </div>
                  {row.draftAnswers[0] ? <StatusPill status={row.draftAnswers[0].status} /> : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  Draft: {row.draftAnswers[0]?.answerText?.slice(0, 200) ?? 'No draft'}
                </p>
                {row.draftAnswers[0] ? (
                  <p className="text-xs text-muted-foreground">Confidence: {row.draftAnswers[0].confidenceScore.toFixed(2)}</p>
                ) : null}
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
