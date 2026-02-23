'use client';

import { useCallback, useEffect, useState } from 'react';

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
    <div className="card">
      <h3>Report Generation</h3>
      <button onClick={generate} disabled={busy}>{busy ? 'Generating...' : 'Generate report'}</button>
      {report ? (
        <div style={{ marginTop: 12 }}>
          <p><strong>{report.title}</strong></p>
          <p>{report.summary}</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={() => exportReport('html')} disabled={exportingFormat !== null}>
              {exportingFormat === 'html' ? 'Exporting HTML...' : 'Export HTML'}
            </button>
            <button onClick={() => exportReport('markdown')} disabled={exportingFormat !== null}>
              {exportingFormat === 'markdown' ? 'Exporting Markdown...' : 'Export Markdown'}
            </button>
            <button onClick={() => exportReport('json')} disabled={exportingFormat !== null}>
              {exportingFormat === 'json' ? 'Exporting JSON...' : 'Export JSON'}
            </button>
            <button onClick={() => exportReport('pdf')} disabled={exportingFormat !== null}>
              {exportingFormat === 'pdf' ? 'Preparing PDF...' : 'Export PDF'}
            </button>
          </div>
        </div>
      ) : (
        <p>No report yet.</p>
      )}
      {message ? <p>{message}</p> : null}
    </div>
  );
}
