'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/app/page-header';
import { StatusPill } from '@/components/app/status-pill';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

type PacketOption = {
  id: string;
  name: string;
  status: string;
  shareMode: string;
  organizationName: string;
  existingRoomId: string | null;
  existingRoomSlug: string | null;
  existingRoomAccessMode: string | null;
  existingRoomStatus: string | null;
  availableSections: Array<{ id: string; title: string }>;
  suggestedSections: string[];
};

type OwnerOption = {
  id: string;
  label: string;
};

type RoomSummary = {
  id: string;
  name: string;
  slug: string;
  status: string;
  accessMode: string;
  summaryText: string | null;
  roomSections: string[];
  termsRequired: boolean;
  ndaRequired: boolean;
  shareExpiresAt: string | null;
  packetName: string;
  packetStatus: string;
  packetShareMode: string;
  organizationName: string;
  analytics: {
    counts: {
      roomViews: number;
      downloads: number;
      requestsSubmitted: number;
      accessGranted: number;
    };
    requestCounts: {
      pending: number;
      approved: number;
      denied: number;
      fulfilled: number;
    };
    topSections: Array<{ sectionKey: string; views: number }>;
  };
};

type RequestSummary = {
  id: string;
  trustRoomId: string;
  roomName: string;
  roomSlug: string;
  requesterName: string;
  requesterEmail: string;
  companyName: string | null;
  status: string;
  assignedOwnerUserId: string | null;
  internalNotes: string | null;
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
  viewCount: number;
  lastViewedAt: string | null;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 120);
}

export function TrustRoomPanel({
  baseUrl,
  packets,
  owners,
  rooms,
  requests
}: {
  baseUrl: string;
  packets: PacketOption[];
  owners: OwnerOption[];
  rooms: RoomSummary[];
  requests: RequestSummary[];
}) {
  const router = useRouter();
  const [selectedPacketId, setSelectedPacketId] = useState(packets[0]?.id ?? '');
  const selectedPacket = useMemo(
    () => packets.find((packet) => packet.id === selectedPacketId) ?? packets[0],
    [packets, selectedPacketId]
  );

  const [roomName, setRoomName] = useState('');
  const [roomSlug, setRoomSlug] = useState('');
  const [accessMode, setAccessMode] = useState<'INTERNAL_REVIEW' | 'PROTECTED_LINK' | 'REQUEST_ACCESS'>('REQUEST_ACCESS');
  const [summaryText, setSummaryText] = useState(
    'Use this buyer-facing trust room to review approved FAQs, the trust packet summary, evidence posture, and security contact details.'
  );
  const [termsRequired, setTermsRequired] = useState(true);
  const [ndaRequired, setNdaRequired] = useState(false);
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [busy, setBusy] = useState<'publish' | 'request' | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [requestState, setRequestState] = useState<Record<string, { status: string; assignedOwnerUserId: string; internalNotes: string }>>(
    () =>
      Object.fromEntries(
        requests.map((request) => [
          request.id,
          {
            status: request.status,
            assignedOwnerUserId: request.assignedOwnerUserId ?? '',
            internalNotes: request.internalNotes ?? ''
          }
        ])
      )
  );

  useEffect(() => {
    if (!selectedPacket) return;
    setRoomName(`${selectedPacket.organizationName} Trust Room`);
    setRoomSlug(slugify(`${selectedPacket.organizationName} trust room`));
    setAccessMode(
      (selectedPacket.existingRoomAccessMode as 'INTERNAL_REVIEW' | 'PROTECTED_LINK' | 'REQUEST_ACCESS' | null) ??
        'REQUEST_ACCESS'
    );
    setSelectedSections(selectedPacket.suggestedSections);
  }, [selectedPacket]);

  function toggleSection(sectionId: string) {
    setSelectedSections((prev) =>
      prev.includes(sectionId) ? prev.filter((value) => value !== sectionId) : [...prev, sectionId]
    );
  }

  async function publishRoom() {
    if (!selectedPacket) return;
    setBusy('publish');
    setMessage(null);
    const response = await fetch('/api/trust/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trustPacketId: selectedPacket.id,
        name: roomName,
        slug: roomSlug,
        accessMode,
        roomSections: selectedSections,
        summaryText,
        termsRequired,
        ndaRequired
      })
    });
    const payload = await response.json().catch(() => ({}));
    setBusy(null);

    if (!response.ok) {
      setMessage(payload.error ?? 'Failed to publish trust room');
      return;
    }

    setMessage(payload.shareUrl ? `Trust room published. Share URL: ${payload.shareUrl}` : 'Trust room published.');
    router.refresh();
  }

  async function rotateProtectedLink(roomId: string) {
    setBusy('publish');
    setMessage(null);
    const response = await fetch(`/api/trust/rooms/${roomId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rotateShareKey: true
      })
    });
    const payload = await response.json().catch(() => ({}));
    setBusy(null);

    if (!response.ok) {
      setMessage(payload.error ?? 'Failed to rotate protected link');
      return;
    }

    setMessage(payload.shareUrl ? `Protected link rotated. New share URL: ${payload.shareUrl}` : 'Protected link rotated.');
    router.refresh();
  }

  async function updateRequest(requestId: string, action?: 'APPROVED' | 'DENIED') {
    const current = requestState[requestId];
    setBusy('request');
    setMessage(null);
    const response = await fetch(`/api/trust/rooms/requests/${requestId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: action ?? current.status,
        assignedOwnerUserId: current.assignedOwnerUserId || null,
        internalNotes: current.internalNotes || null
      })
    });
    const payload = await response.json().catch(() => ({}));
    setBusy(null);

    if (!response.ok) {
      setMessage(payload.error ?? 'Failed to update access request');
      return;
    }

    setMessage(
      payload.grantUrl
        ? `Access request updated. Grant URL: ${payload.grantUrl}`
        : 'Access request updated.'
    );
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trust Rooms"
        helpKey="trustOps"
        description="Publish buyer-facing trust rooms from approved trust packets, triage access requests, and review what buyers actually consumed."
        primaryAction={{ label: 'Back To TrustOps', href: '/app/trust' }}
        secondaryActions={[
          { label: 'Trust Inbox', href: '/app/trust/inbox', variant: 'outline' },
          { label: 'Review Queue', href: '/app/trust/reviews', variant: 'outline' }
        ]}
      />

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Publish Trust Room</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={selectedPacketId} onChange={(event) => setSelectedPacketId(event.target.value)}>
              {packets.map((packet) => (
                <option key={packet.id} value={packet.id}>
                  {packet.name} | {packet.organizationName} | {packet.shareMode.replace(/_/g, ' ')}
                </option>
              ))}
            </Select>
            <Input value={roomName} onChange={(event) => setRoomName(event.target.value)} placeholder="Trust room name" />
            <Input value={roomSlug} onChange={(event) => setRoomSlug(slugify(event.target.value))} placeholder="trust-room-slug" />
            <Select value={accessMode} onChange={(event) => setAccessMode(event.target.value as typeof accessMode)}>
              <option value="INTERNAL_REVIEW">Internal review only</option>
              <option value="PROTECTED_LINK">Protected link</option>
              <option value="REQUEST_ACCESS">Request gated</option>
            </Select>
            <Textarea
              rows={4}
              value={summaryText}
              onChange={(event) => setSummaryText(event.target.value)}
              placeholder="Buyer-safe summary"
            />
            <div className="grid gap-2 md:grid-cols-2">
              {(selectedPacket?.availableSections ?? []).map((section) => (
                <label key={section.id} className="flex items-center gap-2 rounded-md border border-border p-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedSections.includes(section.id)}
                    onChange={() => toggleSection(section.id)}
                  />
                  <span>{section.title}</span>
                </label>
              ))}
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={termsRequired} onChange={(event) => setTermsRequired(event.target.checked)} />
                <span>Require terms acknowledgement</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={ndaRequired} onChange={(event) => setNdaRequired(event.target.checked)} />
                <span>Mark as NDA-gated</span>
              </label>
            </div>
            <Button
              onClick={publishRoom}
              disabled={busy !== null || !selectedPacket || !roomName.trim() || !roomSlug.trim() || selectedSections.length === 0}
            >
              {busy === 'publish' ? 'Publishing...' : selectedPacket?.existingRoomId ? 'Republish Trust Room' : 'Publish Trust Room'}
            </Button>
            {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Guided External Trust Workflows</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-md border border-border p-3">
              <p className="text-sm font-semibold">Publish Trust Room</p>
              <p className="text-sm text-muted-foreground">
                Turn an approved trust packet into a buyer-facing room with link protection or request gating.
              </p>
            </div>
            <div className="rounded-md border border-border p-3">
              <p className="text-sm font-semibold">Prepare Buyer Packet</p>
              <p className="text-sm text-muted-foreground">
                Start from TrustOps packet assembly, then publish only the approved external-safe sections.
              </p>
              <Button asChild size="sm" variant="outline" className="mt-3">
                <Link href="/app/trust">Open Trust Packets</Link>
              </Button>
            </div>
            <div className="rounded-md border border-border p-3">
              <p className="text-sm font-semibold">Review Access Requests</p>
              <p className="text-sm text-muted-foreground">
                Assign an internal owner, approve or deny buyer requests, and issue grant links when review is complete.
              </p>
            </div>
            <div className="rounded-md border border-border p-3">
              <p className="text-sm font-semibold">Summarize Buyer Engagement</p>
              <p className="text-sm text-muted-foreground">
                Review room views, downloads, request counts, and the sections buyers spent time opening.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Published Trust Rooms</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {rooms.length === 0 ? (
            <p className="text-sm text-muted-foreground">No trust rooms have been published yet.</p>
          ) : (
            rooms.map((room) => (
              <div key={room.id} className="rounded-md border border-border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{room.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {room.organizationName} | /trust-room/{room.slug}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Packet: {room.packetName} | {room.packetShareMode.replace(/_/g, ' ')}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill status={room.status} />
                    <StatusPill status={room.accessMode} />
                    <StatusPill status={room.packetStatus} />
                  </div>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-4">
                  <div className="rounded-md border border-border p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Room Views</p>
                    <p className="text-2xl font-semibold">{room.analytics.counts.roomViews}</p>
                  </div>
                  <div className="rounded-md border border-border p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Downloads</p>
                    <p className="text-2xl font-semibold">{room.analytics.counts.downloads}</p>
                  </div>
                  <div className="rounded-md border border-border p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Requests</p>
                    <p className="text-2xl font-semibold">{room.analytics.counts.requestsSubmitted}</p>
                  </div>
                  <div className="rounded-md border border-border p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Access Granted</p>
                    <p className="text-2xl font-semibold">{room.analytics.counts.accessGranted}</p>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 xl:grid-cols-[1fr_1fr]">
                  <div className="rounded-md border border-border p-3">
                    <p className="text-sm font-semibold">Top Buyer Sections</p>
                    {room.analytics.topSections.length === 0 ? (
                      <p className="mt-2 text-sm text-muted-foreground">No section views yet.</p>
                    ) : (
                      room.analytics.topSections.map((section) => (
                        <p key={section.sectionKey} className="mt-2 text-sm text-muted-foreground">
                          {section.sectionKey.replace(/-/g, ' ')} | {section.views} view(s)
                        </p>
                      ))
                    )}
                  </div>
                  <div className="rounded-md border border-border p-3">
                    <p className="text-sm font-semibold">Operational Notes</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Terms acknowledgement: {room.termsRequired ? 'Required' : 'Not required'} | NDA flag:{' '}
                      {room.ndaRequired ? 'Enabled' : 'Not enabled'}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Sections: {room.roomSections.length ? room.roomSections.join(', ') : 'No sections selected'}
                    </p>
                    {room.summaryText ? <p className="mt-2 text-sm text-muted-foreground">{room.summaryText}</p> : null}
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="outline">
                    <a href={`${baseUrl}/trust-room/${room.slug}`} target="_blank" rel="noreferrer">
                      Open Room
                    </a>
                  </Button>
                  {room.accessMode === 'PROTECTED_LINK' ? (
                    <Button onClick={() => rotateProtectedLink(room.id)} size="sm" disabled={busy !== null}>
                      {busy === 'publish' ? 'Working...' : 'Rotate Protected Link'}
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
          <CardTitle>Access Requests</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {requests.length === 0 ? (
            <p className="text-sm text-muted-foreground">No external access requests yet.</p>
          ) : (
            requests.map((request) => {
              const state = requestState[request.id];
              return (
                <div key={request.id} className="rounded-md border border-border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{request.requesterName}</p>
                      <p className="text-xs text-muted-foreground">
                        {request.requesterEmail}
                        {request.companyName ? ` | ${request.companyName}` : ''}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Room: {request.roomName} | Updated {new Date(request.updatedAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill status={request.status} />
                      <span className="text-xs text-muted-foreground">
                        {request.viewCount} view(s)
                        {request.lastViewedAt ? ` | Last viewed ${new Date(request.lastViewedAt).toLocaleString()}` : ''}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 lg:grid-cols-[180px_220px_1fr]">
                    <Select
                      value={state?.status ?? request.status}
                      onChange={(event) =>
                        setRequestState((prev) => ({
                          ...prev,
                          [request.id]: {
                            ...prev[request.id],
                            status: event.target.value
                          }
                        }))
                      }
                    >
                      <option value="PENDING">Pending</option>
                      <option value="APPROVED">Approved</option>
                      <option value="DENIED">Denied</option>
                      <option value="FULFILLED">Fulfilled</option>
                    </Select>
                    <Select
                      value={state?.assignedOwnerUserId ?? ''}
                      onChange={(event) =>
                        setRequestState((prev) => ({
                          ...prev,
                          [request.id]: {
                            ...prev[request.id],
                            assignedOwnerUserId: event.target.value
                          }
                        }))
                      }
                    >
                      <option value="">Unassigned</option>
                      {owners.map((owner) => (
                        <option key={owner.id} value={owner.id}>
                          {owner.label}
                        </option>
                      ))}
                    </Select>
                    <Textarea
                      rows={3}
                      value={state?.internalNotes ?? ''}
                      onChange={(event) =>
                        setRequestState((prev) => ({
                          ...prev,
                          [request.id]: {
                            ...prev[request.id],
                            internalNotes: event.target.value
                          }
                        }))
                      }
                      placeholder="Internal notes"
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button onClick={() => updateRequest(request.id)} size="sm" variant="outline" disabled={busy !== null}>
                      {busy === 'request' ? 'Saving...' : 'Save'}
                    </Button>
                    <Button onClick={() => updateRequest(request.id, 'APPROVED')} size="sm" disabled={busy !== null}>
                      {busy === 'request' ? 'Saving...' : 'Approve And Issue Link'}
                    </Button>
                    <Button onClick={() => updateRequest(request.id, 'DENIED')} size="sm" variant="secondary" disabled={busy !== null}>
                      {busy === 'request' ? 'Saving...' : 'Deny'}
                    </Button>
                    <Button asChild size="sm" variant="ghost">
                      <a href={`${baseUrl}/trust-room/${request.roomSlug}`} target="_blank" rel="noreferrer">
                        Open Room Landing
                      </a>
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
