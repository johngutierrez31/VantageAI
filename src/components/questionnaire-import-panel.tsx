'use client';

import { useState } from 'react';

type QuestionOption = {
  id: string;
  prompt: string;
};

type PreviewRow = {
  rowId: string;
  sourceQuestion: string;
  sourceAnswer?: string;
  sourceScore?: number;
  sourceConfidence?: number;
  mappedQuestionId: string | null;
  mappedPrompt: string | null;
  matchScore: number;
};

type Props = {
  assessmentId: string;
  questions: QuestionOption[];
};

export function QuestionnaireImportPanel({ assessmentId, questions }: Props) {
  const [format, setFormat] = useState<'csv' | 'json'>('csv');
  const [content, setContent] = useState('question,answer,score,confidence\nDo you maintain approved security policies?,Yes,3,0.8');
  const [importId, setImportId] = useState<string | null>(null);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [overrides, setOverrides] = useState<Record<string, string | null>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function preview() {
    setBusy(true);
    setMessage(null);

    const response = await fetch(`/api/assessments/${assessmentId}/questionnaire/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ format, content })
    });

    const json = await response.json();

    if (!response.ok) {
      setMessage(json.error ?? 'Failed to parse questionnaire');
      setBusy(false);
      return;
    }

    setImportId(json.importId);
    setRows(json.rows);
    setOverrides(
      Object.fromEntries(
        (json.rows as PreviewRow[]).map((row) => [row.rowId, row.mappedQuestionId])
      )
    );
    setBusy(false);
  }

  async function apply() {
    if (!importId) return;

    setBusy(true);
    setMessage(null);

    const response = await fetch(`/api/assessments/${assessmentId}/questionnaire/commit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        importId,
        overrides: rows.map((row) => ({
          rowId: row.rowId,
          mappedQuestionId: overrides[row.rowId] ?? null
        }))
      })
    });

    const json = await response.json();
    if (!response.ok) {
      setMessage(json.error ?? 'Failed to apply questionnaire mappings');
      setBusy(false);
      return;
    }

    setMessage(`Applied ${json.appliedCount} rows (${json.skippedCount} skipped).`);
    setBusy(false);
  }

  return (
    <div className="card">
      <h3>Questionnaire Import</h3>
      <p>Paste CSV or JSON then preview auto-mapping before applying responses.</p>
      <div className="grid">
        <select value={format} onChange={(event) => setFormat(event.target.value as 'csv' | 'json')}>
          <option value="csv">CSV</option>
          <option value="json">JSON</option>
        </select>
        <textarea
          rows={6}
          value={content}
          onChange={(event) => setContent(event.target.value)}
        />
        <button onClick={preview} disabled={busy}>{busy ? 'Parsing...' : 'Preview mapping'}</button>
      </div>
      {rows.length ? (
        <div style={{ marginTop: 16 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th align="left">Imported Question</th>
                <th align="left">Mapped Template Question</th>
                <th align="left">Match</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.rowId}>
                  <td>{row.sourceQuestion}</td>
                  <td>
                    <select
                      value={overrides[row.rowId] ?? ''}
                      onChange={(event) =>
                        setOverrides((prev) => ({
                          ...prev,
                          [row.rowId]: event.target.value || null
                        }))
                      }
                    >
                      <option value="">Skip row</option>
                      {questions.map((question) => (
                        <option key={question.id} value={question.id}>{question.prompt}</option>
                      ))}
                    </select>
                  </td>
                  <td>{Math.round((row.matchScore ?? 0) * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button style={{ marginTop: 12 }} onClick={apply} disabled={busy || !importId}>
            {busy ? 'Applying...' : 'Apply mappings'}
          </button>
        </div>
      ) : null}
      {message ? <p>{message}</p> : null}
    </div>
  );
}
