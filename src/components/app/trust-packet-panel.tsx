'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { downloadResponseBlob } from '@/lib/browser/download';
import { PageHeader } from '@/components/app/page-header';
import { StatusPill } from '@/components/app/status-pill';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

type TrustDocRow = {
  id: string;
  category: string;
  createdAt: string;
  evidence: {
    id: string;
    name: string;
    mimeType: string;
    createdAt: string;
  };
};

type InboxSummary = {
  id: string;
  title: string;
  status: 'NEW' | 'IN_REVIEW' | 'DRAFT_READY' | 'DELIVERED';
  updatedAt: string;
};

type EvidenceOption = {
  id: string;
  name: string;
};

type EvidenceMapSummary = {
  id: string;
  name: string;
  status: string;
  itemCount: number;
  questionnaireLabel: string;
};

type PacketSummary = {
  id: string;
  name: string;
  status: string;
  shareMode: string;
  reviewerRequired: boolean;
  includedArtifactCount: number;
  staleArtifactCount: number;
  createdAt: string;
  evidenceMapId: string | null;
  exportCount: number;
};

export function TrustPacketPanel({
  docs,
  inbox,
  evidenceOptions,
  evidenceMaps,
  packets
}: {
  docs: TrustDocRow[];
  inbox: InboxSummary[];
  evidenceOptions: EvidenceOption[];
  evidenceMaps: EvidenceMapSummary[];
  packets: PacketSummary[];
}) {
  const router = useRouter();
  const [category, setCategory] = useState('Security Policy');
  const [evidenceId, setEvidenceId] = useState(evidenceOptions[0]?.id ?? '');
  const [tags, setTags] = useState('');
  const [packetName, setPacketName] = useState('Standard Trust Packet');
  const [packetInboxId, setPacketInboxId] = useState(inbox[0]?.id ?? '');
  const [packetShareMode, setPacketShareMode] = useState<'INTERNAL_REVIEW' | 'EXTERNAL_SHARE'>('INTERNAL_REVIEW');
  const [packetContactName, setPacketContactName] = useState('Security Lead');
  const [packetContactEmail, setPacketContactEmail] = useState('security@example.com');
  const [busy, setBusy] = useState<'doc' | 'packet' | 'export' | 'review' | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function registerTrustDoc() {
    setBusy('doc');
    setMessage(null);
    const response = await fetch('/api/trust/docs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category,
        evidenceId,
        tags: tags
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean)
      })
    });

    const payload = await response.json().catch(() => ({}));
    setBusy(null);
    if (!response.ok) {
      setMessage(payload.error ?? 'Failed to register trust doc');
      return;
    }

    setTags('');
    setMessage('Trust document registered.');
    router.refresh();
  }

  async function assemblePacket() {
    setBusy('packet');
    setMessage(null);
    const response = await fetch('/api/trust/packets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: packetName,
        trustInboxItemId: packetInboxId || undefined,
        shareMode: packetShareMode,
        approvedContactName: packetContactName,
        approvedContactEmail: packetContactEmail
      })
    });
    const payload = await response.json().catch(() => ({}));
    setBusy(null);
    if (!response.ok) {
      setMessage(payload.error ?? 'Failed to assemble trust packet');
      return;
    }

    setMessage('Trust packet assembled and saved.');
    router.refresh();
  }

  async function downloadPacket(packetId: string, format: 'html' | 'markdown' | 'json') {
    setBusy('export');
    setMessage(null);
    const response = await fetch(`/api/trust/packets/${packetId}/export?format=${format}`);
    setBusy(null);

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setMessage(payload.error ?? 'Failed to export trust packet');
      return;
    }

    const fileName = await downloadResponseBlob(
      response,
      `vantageai-trust-packet-${packetId}.${format === 'markdown' ? 'md' : format}`
    );
    setMessage(`Trust packet exported as ${fileName}.`);
    router.refresh();
  }

  async function markPacketReady(packetId: string) {
    setBusy('review');
    setMessage(null);
    const response = await fetch(`/api/trust/packets/${packetId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'READY_TO_SHARE'
      })
    });
    const payload = await response.json().catch(() => ({}));
    setBusy(null);

    if (!response.ok) {
      setMessage(payload.error ?? 'Failed to mark trust packet ready to share');
      return;
    }

    setMessage('Trust packet marked ready to share.');
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="TrustOps"
        helpKey="trustOps"
        description="TrustOps is the buyer diligence layer: run questionnaires, evidence maps, approved answers, trust packets, and review-safe sharing without losing internal control."
        primaryAction={{ label: 'Open Trust Inbox', href: '/app/trust/inbox' }}
        secondaryActions={[
          { label: 'Adoption Mode', href: '/app/adoption', variant: 'outline' },
          { label: 'Trust Rooms', href: '/app/trust/rooms', variant: 'outline' },
          { label: 'Review Queue', href: '/app/trust/reviews', variant: 'outline' },
          { label: 'Answer Library', href: '/app/trust/answer-library', variant: 'outline' }
        ]}
      >
        <p className="text-xs text-muted-foreground">
          Start here: import or open the questionnaire, validate support in the evidence map, promote reusable approved answers, then assemble the buyer-safe packet or trust room.
        </p>
      </PageHeader>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Guided TrustOps Workflows</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-md border border-border p-3">
              <p className="text-sm font-semibold">Draft Questionnaire Answers</p>
              <p className="text-sm text-muted-foreground">
                Generate evidence-backed drafts with citations, confidence, and review routing.
              </p>
              <Button asChild size="sm" variant="outline" className="mt-3">
                <Link href="/app/questionnaires">Open Questionnaires</Link>
              </Button>
            </div>
            <div className="rounded-md border border-border p-3">
              <p className="text-sm font-semibold">Build Evidence Map</p>
              <p className="text-sm text-muted-foreground">
                Collapse duplicate buyer questions and link them to the smallest sufficient support set.
              </p>
              <Button asChild size="sm" variant="outline" className="mt-3">
                <Link href={evidenceMaps[0] ? `/app/trust/evidence-maps/${evidenceMaps[0].id}` : '/app/questionnaires'}>
                  Open Evidence Maps
                </Link>
              </Button>
            </div>
            <div className="rounded-md border border-border p-3">
              <p className="text-sm font-semibold">Publish Trust Room</p>
              <p className="text-sm text-muted-foreground">
                Turn an approved external-share packet into a buyer-facing trust room with link protection or request gating.
              </p>
              <Button asChild size="sm" variant="outline" className="mt-3">
                <Link href="/app/trust/rooms">Open Trust Rooms</Link>
              </Button>
            </div>
            <div className="rounded-md border border-border p-3">
              <p className="text-sm font-semibold">Review TrustOps Queue</p>
              <p className="text-sm text-muted-foreground">
                Assign reviewers, set due dates, and manage questionnaire, evidence-map, and packet SLAs.
              </p>
              <Button asChild size="sm" variant="outline" className="mt-3">
                <Link href="/app/trust/reviews">Open Review Queue</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assemble Buyer Trust Packet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input value={packetName} onChange={(event) => setPacketName(event.target.value)} placeholder="Packet name" />
            <Select value={packetInboxId} onChange={(event) => setPacketInboxId(event.target.value)}>
              {inbox.length === 0 ? <option value="">No trust inbox item available</option> : null}
              {inbox.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </Select>
            <Select
              value={packetShareMode}
              onChange={(event) => setPacketShareMode(event.target.value as 'INTERNAL_REVIEW' | 'EXTERNAL_SHARE')}
            >
              <option value="INTERNAL_REVIEW">Internal review</option>
              <option value="EXTERNAL_SHARE">External share</option>
            </Select>
            <Input value={packetContactName} onChange={(event) => setPacketContactName(event.target.value)} placeholder="Approved contact name" />
            <Input value={packetContactEmail} onChange={(event) => setPacketContactEmail(event.target.value)} placeholder="Approved contact email" />
            <Button onClick={assemblePacket} disabled={busy !== null || !packetName.trim()}>
              {busy === 'packet' ? 'Assembling...' : 'Assemble Packet'}
            </Button>
            <p className="text-xs text-muted-foreground">
              External-share exports require a reviewed packet state. Internal-review packets can be packaged immediately.
            </p>
            {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Security Docs Vault</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-[220px_280px_1fr_auto]">
          <Input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Category" />
          <Select value={evidenceId} onChange={(event) => setEvidenceId(event.target.value)}>
            {evidenceOptions.length === 0 ? <option value="">No evidence available</option> : null}
            {evidenceOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </Select>
          <Input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="tags (comma separated)" />
          <Button onClick={registerTrustDoc} disabled={busy !== null || !evidenceId}>
            {busy === 'doc' ? 'Saving...' : 'Register'}
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Evidence Maps</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {evidenceMaps.length === 0 ? (
              <p className="text-sm text-muted-foreground">No evidence maps generated yet.</p>
            ) : (
              evidenceMaps.map((map) => (
                <div key={map.id} className="rounded-md border border-border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">{map.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {map.questionnaireLabel} | {map.itemCount} cluster(s)
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusPill status={map.status} />
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/app/trust/evidence-maps/${map.id}`}>Open</Link>
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Registered Trust Docs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {docs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No trust docs registered yet.</p>
            ) : (
              docs.map((doc) => (
                <div key={doc.id} className="rounded-md border border-border p-3">
                  <p className="text-sm font-semibold">{doc.evidence.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {doc.category} | {new Date(doc.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Saved Trust Packets</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {packets.length === 0 ? (
            <p className="text-sm text-muted-foreground">No trust packets assembled yet.</p>
          ) : (
            packets.map((packet) => (
              <div key={packet.id} className="rounded-md border border-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{packet.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(packet.createdAt).toLocaleString()} | {packet.includedArtifactCount} artifacts |{' '}
                      {packet.shareMode.replace(/_/g, ' ')} | {packet.exportCount} export(s)
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusPill status={packet.status} />
                    {packet.reviewerRequired ? <StatusPill status="NEEDS_REVIEW" /> : null}
                  </div>
                </div>
                {packet.staleArtifactCount ? (
                  <p className="mt-2 text-xs text-muted-foreground">{packet.staleArtifactCount} artifact(s) flagged stale.</p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="secondary">
                    <Link href="/app/trust/rooms">Publish Trust Room</Link>
                  </Button>
                  {packet.shareMode === 'EXTERNAL_SHARE' && !['READY_TO_SHARE', 'SHARED'].includes(packet.status) ? (
                    <Button onClick={() => markPacketReady(packet.id)} size="sm" disabled={busy !== null}>
                      {busy === 'review' ? 'Saving...' : 'Mark Ready to Share'}
                    </Button>
                  ) : null}
                  <Button onClick={() => downloadPacket(packet.id, 'html')} size="sm" variant="outline" disabled={busy === 'export'}>
                    Export HTML
                  </Button>
                  <Button onClick={() => downloadPacket(packet.id, 'markdown')} size="sm" variant="outline" disabled={busy === 'export'}>
                    Export Markdown
                  </Button>
                  <Button onClick={() => downloadPacket(packet.id, 'json')} size="sm" variant="outline" disabled={busy === 'export'}>
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

      <Card>
        <CardHeader>
          <CardTitle>Questionnaire Inbox</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {inbox.length === 0 ? (
            <p className="text-sm text-muted-foreground">No trust intake items yet.</p>
          ) : (
            inbox.map((item) => (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3">
                <div>
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{new Date(item.updatedAt).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusPill status={item.status} />
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/app/trust/inbox/${item.id}`}>Open</Link>
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

