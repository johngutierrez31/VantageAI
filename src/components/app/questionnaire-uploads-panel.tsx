'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FileSpreadsheet, FileText, LayoutTemplate } from 'lucide-react';
import { workflowRoutes } from '@/lib/product/workflow-routes';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/app/page-header';
import { EmptyState } from '@/components/app/empty-state';
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

export function QuestionnaireUploadsPanel({
  activeWorkflow,
  uploads,
  isTrial = false
}: {
  activeWorkflow: 'intake' | 'review' | 'evidence-map' | null;
  uploads: UploadRow[];
  isTrial?: boolean;
}) {
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
    router.push(workflowRoutes.questionnaireReview(payload.id));
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Questionnaires"
        helpKey="questionnaires"
        description="Bring buyer questionnaires into a reviewable workflow, map them to controls, generate cited drafts, and export only approved answers."
      />

      {activeWorkflow ? (
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="space-y-2 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">Workflow Mode</p>
            <p className="text-lg font-semibold">
              {activeWorkflow === 'intake'
                ? 'Start Questionnaire Intake'
                : activeWorkflow === 'review'
                  ? 'Review Questionnaire Detail'
                  : 'Build Evidence Map'}
            </p>
            <p className="text-sm text-muted-foreground">
              {activeWorkflow === 'intake'
                ? 'Create the durable questionnaire record first so normalization, draft answers, trust links, and reviewer assignment all share one source object.'
                : activeWorkflow === 'review'
                  ? 'Choose a questionnaire below to continue row-level review, approval, and answer-library promotion.'
                  : 'Choose a questionnaire below to open or build the linked evidence map from the same imported rows.'}
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-primary/30 bg-gradient-to-r from-card via-card to-muted/20">
        <CardContent className="grid gap-4 p-5 md:grid-cols-3">
          <div className="rounded-md border border-border bg-background/60 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <FileSpreadsheet className="h-4 w-4 text-primary" />
              Common source formats
            </div>
            <p className="mt-2 text-sm text-muted-foreground">XLSX, CSV, PDF, DOCX, and pasted tables are common inputs in real buyer diligence.</p>
          </div>
          <div className="rounded-md border border-border bg-background/60 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <LayoutTemplate className="h-4 w-4 text-primary" />
              Current structured import path
            </div>
            <p className="mt-2 text-sm text-muted-foreground">CSV and JSON parse directly today. For XLSX, PDF, or DOCX, export to CSV or paste cleaned row text below.</p>
          </div>
          <div className="rounded-md border border-border bg-background/60 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <FileText className="h-4 w-4 text-primary" />
              Output you should expect
            </div>
            <p className="mt-2 text-sm text-muted-foreground">Mapped rows, cited drafts, reviewer assignment, evidence-map follow-up, and buyer-safe export options.</p>
          </div>
        </CardContent>
      </Card>

      <Card id="start-questionnaire-intake">
        <CardHeader>
          <CardTitle>Start Questionnaire Intake</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            value={organizationName}
            onChange={(event) => setOrganizationName(event.target.value)}
            placeholder="Buyer or customer organization"
          />
          <Input
            type="file"
            accept=".csv,.json,.txt"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
          <p className="text-xs text-muted-foreground">No structured export yet? Paste cleaned row text inline and route the file cleanup separately.</p>
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
            {busy ? 'Uploading...' : 'Create intake'}
          </Button>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
        </CardContent>
      </Card>

      <Card
        id="recent-questionnaire-uploads"
        className={cn(
          activeWorkflow === 'review' || activeWorkflow === 'evidence-map'
            ? 'border-primary/50 bg-primary/5 shadow-sm'
            : null
        )}
      >
        <CardHeader>
          <CardTitle>Recent Uploads</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {uploads.length === 0 ? (
            <EmptyState
              title={isTrial ? 'Start your first buyer questionnaire' : 'No questionnaires in review yet'}
              description={
                isTrial
                  ? 'Use this module when procurement sends a spreadsheet, CSV, or cleaned table. Your first intake creates a durable questionnaire record with mapped rows, review routing, and export-ready answer work.'
                  : 'New uploads become durable intake records with mapped rows, reviewer routing, and export-ready outputs.'
              }
              actionLabel={isTrial ? 'Create first intake' : 'Start intake'}
              actionHref="#start-questionnaire-intake"
              eyebrow="Questionnaire Workflow"
              supportingPoints={[
                isTrial ? 'What it is for: buyer diligence intake and response workflow.' : 'Import the buyer question set.',
                isTrial ? 'First action: upload or paste the questionnaire.' : 'Draft answers from approved evidence.',
                isTrial ? 'Output: a reviewable questionnaire record with evidence-backed answer work.' : 'Review and export only approved responses.'
              ]}
            />
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
                      <Link href={workflowRoutes.questionnaireReview(upload.id)}>Review Questionnaire</Link>
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <Link
                        href={
                          upload.evidenceMap
                            ? `/app/trust/evidence-maps/${upload.evidenceMap.id}`
                            : workflowRoutes.questionnaireEvidenceMap(upload.id)
                        }
                      >
                        {upload.evidenceMap ? 'Open Evidence Map' : 'Build Evidence Map'}
                      </Link>
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

