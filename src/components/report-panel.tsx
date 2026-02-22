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

  function exportReport(format: 'html' | 'markdown' | 'json' | 'pdf') {
    if (!report) return;
    window.location.href = `/api/reports/${report.id}/export?format=${format}`;
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
            <button onClick={() => exportReport('html')}>Export HTML</button>
            <button onClick={() => exportReport('markdown')}>Export Markdown</button>
            <button onClick={() => exportReport('json')}>Export JSON</button>
            <button onClick={() => exportReport('pdf')}>Export PDF Plan</button>
          </div>
        </div>
      ) : (
        <p>No report yet.</p>
      )}
      {message ? <p>{message}</p> : null}
    </div>
  );
}
