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

type InboxRow = {
  id: string;
  title: string;
  requesterEmail: string | null;
  status: 'NEW' | 'IN_REVIEW' | 'DRAFT_READY' | 'DELIVERED';
  questionnaireUploadId: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { attachments: number };
  questionnaireUpload?: { id: string; filename: string } | null;
};

type UploadOption = {
  id: string;
  filename: string;
};

export function TrustInboxPanel({ items, uploads }: { items: InboxRow[]; uploads: UploadOption[] }) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [requesterEmail, setRequesterEmail] = useState('');
  const [questionnaireUploadId, setQuestionnaireUploadId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createItem() {
    setBusy(true);
    setError(null);
    const response = await fetch('/api/trust/inbox', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        requesterEmail: requesterEmail || undefined,
        questionnaireUploadId: questionnaireUploadId || undefined
      })
    });
    const payload = await response.json().catch(() => ({}));
    setBusy(false);

    if (!response.ok) {
      setError(payload.error ?? 'Failed to create trust intake item');
      return;
    }

    setTitle('');
    setRequesterEmail('');
    setQuestionnaireUploadId('');
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trust Inbox"
        helpKey="trustInbox"
        description="Track incoming buyer diligence requests from first intake through reviewed trust materials and final delivery."
      />

      <Card className="border-primary/30 bg-gradient-to-r from-card via-card to-muted/20">
        <CardContent className="grid gap-3 p-5 md:grid-cols-3">
          {[
            'Each buyer request keeps its questionnaire, evidence, reviewers, and packet state in one durable record.',
            'Weak support stays visible as a review item instead of slipping into the final response.',
            'Trust packets and trust rooms stay tied back to the original intake for clean auditability.'
          ].map((item) => (
            <div key={item} className="rounded-md border border-border bg-background/60 p-3 text-sm text-muted-foreground">
              {item}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Create Buyer Request</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-[1fr_260px_260px_auto]">
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Buyer request title"
          />
          <Input
            value={requesterEmail}
            onChange={(event) => setRequesterEmail(event.target.value)}
            placeholder="buyer@company.com"
          />
          <Select value={questionnaireUploadId} onChange={(event) => setQuestionnaireUploadId(event.target.value)}>
            <option value="">No upload linked yet</option>
            {uploads.map((upload) => (
              <option key={upload.id} value={upload.id}>
                {upload.filename}
              </option>
            ))}
          </Select>
          <Button onClick={createItem} disabled={busy || !title.trim()}>
            {busy ? 'Creating...' : 'Create request'}
          </Button>
          {error ? <p className="md:col-span-4 text-sm text-danger">{error}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Queue</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              New trust requests will appear here with ownership, review status, linked questionnaires, and delivery state.
            </p>
          ) : (
            items.map((item) => (
              <div key={item.id} className="rounded-md border border-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{item.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.requesterEmail ?? 'No requester'} | Attachments: {item._count.attachments}
                    </p>
                    {item.questionnaireUpload ? (
                      <p className="text-xs text-muted-foreground">
                        Upload: {item.questionnaireUpload.filename}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusPill status={item.status} />
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/app/trust/inbox/${item.id}`}>Open</Link>
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

