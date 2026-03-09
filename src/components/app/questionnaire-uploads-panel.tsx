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

type UploadRow = {
  id: string;
  organizationName?: string | null;
  filename: string;
  originalFormat: string;
  status: string;
  assignedReviewerUserId?: string | null;
  reviewDueAt?: string | null;
  createdAt: string;
  itemCount: number;
  evidenceMap?: {
    id: string;
    status: string;
  } | null;
  trustInboxItem?: {
    id: string;
    title: string;
    status: string;
  } | null;
};

export function QuestionnaireUploadsPanel({ uploads }: { uploads: UploadRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<'csv' | 'json'>('csv');
  const [organizationName, setOrganizationName] = useState('');
  const [inlineContent, setInlineContent] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function uploadFile() {
    setBusy(true);
    setError(null);

    let response: Response;
    if (file) {
      const formData = new FormData();
      formData.set('file', file);
      formData.set('organizationName', organizationName);
      response = await fetch('/api/questionnaires/upload', {
        method: 'POST',
        body: formData
      });
    } else {
      response = await fetch('/api/questionnaires/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: `questionnaire-${Date.now()}.${format}`,
          format,
          content: inlineContent,
          organizationName
        })
      });
    }

    const payload = await response.json().catch(() => ({}));
    setBusy(false);

    if (!response.ok) {
      setError(payload.error ?? 'Failed to upload questionnaire');
      return;
    }

    setFile(null);
    setOrganizationName('');
    setInlineContent('');
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Questionnaires"
        description="Upload customer questionnaires, map to controls, generate AI drafts with citations, and export completed responses."
      />

      <Card>
        <CardHeader>
          <CardTitle>Upload Questionnaire</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            value={organizationName}
            onChange={(event) => setOrganizationName(event.target.value)}
            placeholder="Customer or buyer organization"
          />
          <Input
            type="file"
            accept=".csv,.json,.txt"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
          <p className="text-xs text-muted-foreground">No file? Paste content inline.</p>
          <div className="grid gap-2 md:grid-cols-[120px_1fr]">
            <Select value={format} onChange={(event) => setFormat(event.target.value as 'csv' | 'json')}>
              <option value="csv">CSV</option>
              <option value="json">JSON</option>
            </Select>
            <Input
              value={inlineContent}
              onChange={(event) => setInlineContent(event.target.value)}
              placeholder="question,answer,score,confidence"
            />
          </div>
          <Button
            onClick={uploadFile}
            disabled={busy || (!file && !inlineContent.trim())}
          >
            {busy ? 'Uploading...' : 'Upload'}
          </Button>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Uploads</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {uploads.length === 0 ? (
            <p className="text-sm text-muted-foreground">No uploads yet.</p>
          ) : (
            uploads.map((upload) => (
              <div key={upload.id} className="rounded-md border border-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{upload.filename}</p>
                    <p className="text-xs text-muted-foreground">
                      {upload.itemCount} items | {upload.originalFormat} |{' '}
                      {new Date(upload.createdAt).toLocaleString()}
                    </p>
                    {upload.organizationName ? (
                      <p className="text-xs text-muted-foreground">Organization: {upload.organizationName}</p>
                    ) : null}
                    {upload.trustInboxItem ? (
                      <p className="text-xs text-muted-foreground">
                        Linked trust intake: {upload.trustInboxItem.title}
                      </p>
                    ) : null}
                    {upload.reviewDueAt ? (
                      <p className="text-xs text-muted-foreground">
                        Review due: {new Date(upload.reviewDueAt).toLocaleString()}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusPill status={upload.status} />
                    {upload.evidenceMap ? <StatusPill status={upload.evidenceMap.status} /> : null}
                    {upload.trustInboxItem ? <StatusPill status={upload.trustInboxItem.status} /> : null}
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/app/questionnaires/${upload.id}`}>Open</Link>
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/app/trust/inbox${upload.trustInboxItem ? `/${upload.trustInboxItem.id}` : ''}`}>
                        Trust Inbox
                      </Link>
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
