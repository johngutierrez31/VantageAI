'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type ReportSummary = {
  id: string;
  title: string;
  summary: string;
  createdAt: string;
};

type Props = {
  assessmentId: string;
};

export function ReportPanel({ assessmentId }: Props) {
  const [report, setReport] = useState<ReportSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadLatest = useCallback(async () => {
    const response = await fetch(`/api/assessments/${assessmentId}/report`);
    if (!response.ok) return;

    const json = await response.json();
    setReport({
      id: json.id,
      title: json.title,
      summary: json.summary,
      createdAt: json.createdAt
    });
  }, [assessmentId]);

  useEffect(() => {
    void loadLatest();
  }, [loadLatest]);

  async function generate() {
    setBusy(true);
    setMessage(null);

    const response = await fetch(`/api/assessments/${assessmentId}/report`, { method: 'POST' });
    const json = await response.json();

    if (!response.ok) {
      setMessage(json.error ?? 'Failed to generate report');
      setBusy(false);
      return;
    }

    setReport({
      id: json.id,
      title: json.title,
      summary: json.summary,
      createdAt: json.createdAt
    });
    setBusy(false);
  }

  async function exportReport(format: 'html' | 'markdown' | 'json' | 'pdf') {
    if (!report) return;
    setExportingFormat(format);
    setMessage(null);

    const response = await fetch(`/api/reports/${report.id}/export?format=${format}`);

    if (!response.ok) {
      let errorMessage = 'Failed to export report';
      try {
        const payload = await response.json();
        errorMessage = payload.error ?? errorMessage;
      } catch {
        // Ignore parse error and keep default message.
      }

      setMessage(errorMessage);
      setExportingFormat(null);
      return;
    }

    const blob = await response.blob();
    const contentDisposition = response.headers.get('Content-Disposition') ?? '';
    const fileNameMatch = contentDisposition.match(/filename="([^"]+)"/i);
    const fileName = fileNameMatch?.[1] ?? `${report.title}.${format === 'markdown' ? 'md' : format}`;
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(objectUrl);

    setExportingFormat(null);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Report Generation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button onClick={generate} disabled={busy}>{busy ? 'Generating...' : 'Generate report'}</Button>
        {report ? (
          <div className="space-y-2">
            <p className="font-semibold">{report.title}</p>
            <p className="text-sm text-muted-foreground">{report.summary}</p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => exportReport('html')} disabled={exportingFormat !== null} variant="outline">
                {exportingFormat === 'html' ? 'Exporting HTML...' : 'Export HTML'}
              </Button>
              <Button onClick={() => exportReport('markdown')} disabled={exportingFormat !== null} variant="outline">
                {exportingFormat === 'markdown' ? 'Exporting Markdown...' : 'Export Markdown'}
              </Button>
              <Button onClick={() => exportReport('json')} disabled={exportingFormat !== null} variant="outline">
                {exportingFormat === 'json' ? 'Exporting JSON...' : 'Export JSON'}
              </Button>
              <Button onClick={() => exportReport('pdf')} disabled={exportingFormat !== null}>
                {exportingFormat === 'pdf' ? 'Preparing PDF...' : 'Export PDF'}
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No report yet.</p>
        )}
        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      </CardContent>
    </Card>
  );
}
