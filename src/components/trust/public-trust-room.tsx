'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

type RoomSection = {
  id: string;
  title: string;
  items: Array<Record<string, unknown>>;
};

function formatValue(value: unknown) {
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

export function PublicTrustRoomViewer({
  roomName,
  organizationName,
  sections,
  demoMode = false,
  eventEndpoint,
  viewerLabel,
  downloadLinks
}: {
  roomName: string;
  organizationName: string;
  sections: RoomSection[];
  demoMode?: boolean;
  eventEndpoint: string;
  viewerLabel?: string | null;
  downloadLinks: {
    html: string;
    markdown: string;
    json: string;
  };
}) {
  const [activeSectionId, setActiveSectionId] = useState(sections[0]?.id ?? '');
  const activeSection = useMemo(
    () => sections.find((section) => section.id === activeSectionId) ?? sections[0],
    [activeSectionId, sections]
  );

  async function markSectionViewed(sectionId: string) {
    setActiveSectionId(sectionId);
    await fetch(eventEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'SECTION_VIEWED',
        sectionKey: sectionId,
        actorLabel: viewerLabel ?? undefined
      })
    }).catch(() => undefined);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white/95 p-8 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">VantageCISO Trust Room</p>
          {demoMode ? (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">
              Demo Workspace
            </span>
          ) : null}
        </div>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-slate-950">{roomName}</h1>
            <p className="mt-2 text-sm text-slate-600">
              External-safe diligence package for {organizationName}. Approved responses and packet sections only.
            </p>
            {demoMode ? (
              <p className="mt-2 text-xs text-slate-500">
                Example materials from a synthetic sample tenant. Safe to review in guided demos.
              </p>
            ) : null}
            {viewerLabel ? <p className="mt-2 text-xs text-slate-500">Access granted for {viewerLabel}</p> : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm">
              <a href={downloadLinks.html}>Download HTML</a>
            </Button>
            <Button asChild size="sm" variant="outline">
              <a href={downloadLinks.markdown}>Download Markdown</a>
            </Button>
            <Button asChild size="sm" variant="outline">
              <a href={downloadLinks.json}>Download JSON</a>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Sections</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {sections.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => markSectionViewed(section.id)}
                className={`w-full rounded-xl border px-3 py-3 text-left text-sm transition ${
                  activeSection?.id === section.id
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                }`}
              >
                {section.title}
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{activeSection?.title ?? 'Trust Room'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeSection?.items.length ? (
              activeSection.items.map((item, index) => (
                <div key={`${activeSection.id}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="space-y-2 text-sm text-slate-700">
                    {Object.entries(item)
                      .filter(([, value]) => value !== undefined && value !== null && value !== '')
                      .map(([key, value]) => (
                        <div key={key}>
                          <p className="text-xs uppercase tracking-wide text-slate-500">{key.replace(/([A-Z])/g, ' $1')}</p>
                          <p className="mt-1 text-sm text-slate-900">{formatValue(value)}</p>
                        </div>
                      ))}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No approved content is available in this section.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function PublicTrustRoomRequestForm({
  requestEndpoint,
  roomName,
  demoMode = false
}: {
  requestEndpoint: string;
  roomName: string;
  demoMode?: boolean;
}) {
  const [requesterName, setRequesterName] = useState('');
  const [requesterEmail, setRequesterEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [requestReason, setRequestReason] = useState('');
  const [acknowledgedTerms, setAcknowledgedTerms] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submitRequest() {
    setBusy(true);
    setMessage(null);
    const response = await fetch(requestEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requesterName,
        requesterEmail,
        companyName: companyName || undefined,
        requestReason: requestReason || undefined,
        acknowledgedTerms
      })
    });
    const payload = await response.json().catch(() => ({}));
    setBusy(false);

    if (!response.ok) {
      setMessage(payload.error ?? 'Request submission failed');
      return;
    }

    setRequesterName('');
    setRequesterEmail('');
    setCompanyName('');
    setRequestReason('');
    setMessage(`Request submitted for ${roomName}. The TrustOps team can now review and grant access.`);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Request Access</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {demoMode ? (
          <p className="text-sm text-slate-600">
            This request form belongs to a sample trust room used for guided evaluation.
          </p>
        ) : null}
        <Input placeholder="Your name" value={requesterName} onChange={(event) => setRequesterName(event.target.value)} />
        <Input placeholder="Work email" value={requesterEmail} onChange={(event) => setRequesterEmail(event.target.value)} />
        <Input placeholder="Company" value={companyName} onChange={(event) => setCompanyName(event.target.value)} />
        <Textarea
          placeholder="What do you need to review?"
          value={requestReason}
          onChange={(event) => setRequestReason(event.target.value)}
          rows={5}
        />
        <label className="flex items-start gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={acknowledgedTerms}
            onChange={(event) => setAcknowledgedTerms(event.target.checked)}
            className="mt-1"
          />
          <span>I confirm this request is for buyer diligence and that shared materials remain confidential.</span>
        </label>
        <Button
          onClick={submitRequest}
          disabled={busy || !requesterName.trim() || !requesterEmail.trim() || !acknowledgedTerms}
        >
          {busy ? 'Submitting...' : 'Submit Request'}
        </Button>
        {message ? <p className="text-sm text-slate-600">{message}</p> : null}
      </CardContent>
    </Card>
  );
}
