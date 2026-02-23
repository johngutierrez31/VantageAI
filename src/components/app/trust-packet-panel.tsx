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

export function TrustPacketPanel({
  docs,
  inbox,
  evidenceOptions
}: {
  docs: TrustDocRow[];
  inbox: InboxSummary[];
  evidenceOptions: EvidenceOption[];
}) {
  const router = useRouter();
  const [category, setCategory] = useState('Security Policy');
  const [evidenceId, setEvidenceId] = useState(evidenceOptions[0]?.id ?? '');
  const [tags, setTags] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function registerTrustDoc() {
    setBusy(true);
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
    setBusy(false);
    if (!response.ok) {
      setMessage(payload.error ?? 'Failed to register trust doc');
      return;
    }

    setTags('');
    setMessage('Trust document registered.');
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trust Packet"
        description="Maintain customer-ready security documentation and accelerate questionnaire turnaround."
        primaryAction={{ label: 'Open Trust Inbox', href: '/app/trust/inbox' }}
      />

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
          <Button onClick={registerTrustDoc} disabled={busy || !evidenceId}>
            {busy ? 'Saving...' : 'Register'}
          </Button>
          {message ? <p className="md:col-span-4 text-sm text-muted-foreground">{message}</p> : null}
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
