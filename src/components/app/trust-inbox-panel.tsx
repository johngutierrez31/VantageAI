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
        description="Queue incoming security questionnaires and move from new intake to delivered package."
      />

      <Card>
        <CardHeader>
          <CardTitle>New Intake</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-[1fr_260px_260px_auto]">
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Prospect questionnaire title"
          />
          <Input
            value={requesterEmail}
            onChange={(event) => setRequesterEmail(event.target.value)}
            placeholder="requester@company.com"
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
            {busy ? 'Creating...' : 'Create'}
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
            <p className="text-sm text-muted-foreground">No trust intake items yet.</p>
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
