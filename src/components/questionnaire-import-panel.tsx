'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Paste CSV or JSON and review auto-mapping before applying responses.</p>
      <div className="grid gap-2">
        <div className="grid gap-2 md:grid-cols-[120px_1fr]">
          <Select value={format} onChange={(event) => setFormat(event.target.value as 'csv' | 'json')}>
            <option value="csv">CSV</option>
            <option value="json">JSON</option>
          </Select>
          <Input readOnly value={`Mapped questions available: ${questions.length}`} />
        </div>
        <Textarea
          rows={6}
          value={content}
          onChange={(event) => setContent(event.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          <Button onClick={preview} disabled={busy}>{busy ? 'Parsing...' : 'Preview mapping'}</Button>
          <Button variant="outline" onClick={apply} disabled={busy || !importId}>
            {busy ? 'Applying...' : 'Apply mappings'}
          </Button>
        </div>
      </div>
      {rows.length ? (
        <div className="rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Imported Question</TableHead>
                <TableHead>Mapped Template Question</TableHead>
                <TableHead>Match</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.rowId}>
                  <TableCell>{row.sourceQuestion}</TableCell>
                  <TableCell>
                    <Select
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
                    </Select>
                  </TableCell>
                  <TableCell>{Math.round((row.matchScore ?? 0) * 100)}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
    </div>
  );
}
