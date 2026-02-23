'use client';

import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/app/page-header';
import { EmptyState } from '@/components/app/empty-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type AssessmentOption = {
  id: string;
  name: string;
  customerName: string;
};

type Question = {
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

export function QuestionnaireInbox({ assessments }: { assessments: AssessmentOption[] }) {
  const [assessmentId, setAssessmentId] = useState(assessments[0]?.id ?? '');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [format, setFormat] = useState<'csv' | 'json'>('csv');
  const [content, setContent] = useState('question,answer,score,confidence\nDo you maintain approved security policies?,Yes,3,0.8');
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [overrides, setOverrides] = useState<Record<string, string | null>>({});
  const [importId, setImportId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [appliedAt, setAppliedAt] = useState<Date | null>(null);

  useEffect(() => {
    if (!assessmentId) return;
    fetch(`/api/assessments/${assessmentId}`)
      .then(async (response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (!payload?.questions) return;
        setQuestions(payload.questions.map((question: { id: string; prompt: string }) => ({ id: question.id, prompt: question.prompt })));
      });
  }, [assessmentId]);

  const selectedAssessment = useMemo(
    () => assessments.find((assessment) => assessment.id === assessmentId),
    [assessmentId, assessments]
  );

  async function preview() {
    if (!assessmentId) return;
    setBusy(true);
    setMessage(null);

    const response = await fetch(`/api/assessments/${assessmentId}/questionnaire/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ format, content })
    });
    const payload = await response.json();
    setBusy(false);

    if (!response.ok) {
      setMessage(payload.error ?? 'Unable to parse questionnaire');
      return;
    }

    setRows(payload.rows);
    setImportId(payload.importId);
    setAppliedAt(null);
    setOverrides(
      Object.fromEntries((payload.rows as PreviewRow[]).map((row) => [row.rowId, row.mappedQuestionId]))
    );
  }

  async function apply() {
    if (!assessmentId || !importId) return;
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
    const payload = await response.json();
    setBusy(false);

    if (!response.ok) {
      setMessage(payload.error ?? 'Unable to apply mappings');
      return;
    }

    setMessage(`Applied ${payload.appliedCount} rows (${payload.skippedCount} skipped).`);
    setAppliedAt(new Date());
  }

  function exportResponsePack() {
    const pack = {
      assessmentId,
      assessmentName: selectedAssessment?.name,
      generatedAt: new Date().toISOString(),
      rows: rows.map((row) => ({
        question: row.sourceQuestion,
        answer: row.sourceAnswer,
        mappedQuestionId: overrides[row.rowId] ?? row.mappedQuestionId
      }))
    };
    const blob = new Blob([JSON.stringify(pack, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `questionnaire-response-pack-${assessmentId}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  if (assessments.length === 0) {
    return (
      <EmptyState
        title="No assessments available"
        description="Create an assessment before importing questionnaires."
        actionLabel="Create Assessment"
        actionHref="/app/assessments/new"
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Questionnaire Inbox"
        description="Ingest customer questionnaires, review mappings, and build a reusable response pack."
      />

      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-[280px_120px_1fr]">
          <Select value={assessmentId} onChange={(event) => setAssessmentId(event.target.value)}>
            {assessments.map((assessment) => (
              <option key={assessment.id} value={assessment.id}>
                {assessment.name} - {assessment.customerName}
              </option>
            ))}
          </Select>
          <Select value={format} onChange={(event) => setFormat(event.target.value as 'csv' | 'json')}>
            <option value="csv">CSV</option>
            <option value="json">JSON</option>
          </Select>
          <Input readOnly value={`Mapped questions available: ${questions.length}`} />
          <div className="md:col-span-3">
            <Textarea rows={7} value={content} onChange={(event) => setContent(event.target.value)} />
          </div>
          <div className="md:col-span-3 flex flex-wrap gap-2">
            <Button onClick={preview} disabled={busy}>
              {busy ? 'Previewing...' : 'Preview Mapping'}
            </Button>
            <Button onClick={apply} variant="outline" disabled={busy || !importId}>
              Apply Mappings
            </Button>
            <Button onClick={exportResponsePack} variant="secondary" disabled={!rows.length || !appliedAt}>
              Export Response Pack
            </Button>
          </div>
          {message ? <p className="md:col-span-3 text-sm text-muted-foreground">{message}</p> : null}
        </CardContent>
      </Card>

      {rows.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Original question</TableHead>
                  <TableHead>Mapped control question</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Evidence needed</TableHead>
                  <TableHead>Suggested answer</TableHead>
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
                        <option value="">Skip</option>
                        {questions.map((question) => (
                          <option key={question.id} value={question.id}>
                            {question.prompt}
                          </option>
                        ))}
                      </Select>
                    </TableCell>
                    <TableCell>{Math.round(row.matchScore * 100)}%</TableCell>
                    <TableCell>
                      {row.sourceAnswer
                        ? 'Corroborating evidence recommended'
                        : 'Evidence plus draft answer required'}
                    </TableCell>
                    <TableCell>{row.sourceAnswer ?? 'No answer provided'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
