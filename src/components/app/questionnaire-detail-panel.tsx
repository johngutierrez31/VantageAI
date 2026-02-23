'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { PageHeader } from '@/components/app/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type ItemRow = {
  id: string;
  rowKey: string;
  questionText: string;
  mappings: Array<{
    confidence: number;
    status: 'MAPPED' | 'UNMAPPED';
    templateQuestion?: { id: string; prompt: string } | null;
  }>;
  draftAnswers: Array<{
    answerText: string;
    model: string;
  }>;
};

type TemplateOption = {
  id: string;
  name: string;
};

export function QuestionnaireDetailPanel({
  questionnaireId,
  filename,
  items,
  templates
}: {
  questionnaireId: string;
  filename: string;
  items: ItemRow[];
  templates: TemplateOption[];
}) {
  const router = useRouter();
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? '');
  const [busy, setBusy] = useState<'map' | 'draft' | 'export' | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function runMap() {
    setBusy('map');
    setMessage(null);

    const response = await fetch(`/api/questionnaires/${questionnaireId}/map`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateId: templateId || undefined })
    });
    const payload = await response.json().catch(() => ({}));
    setBusy(null);

    if (!response.ok) {
      setMessage(payload.error ?? 'Mapping failed');
      return;
    }

    setMessage('Mapping complete.');
    router.refresh();
  }

  async function runDrafts() {
    setBusy('draft');
    setMessage(null);
    const response = await fetch(`/api/questionnaires/${questionnaireId}/draft`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const payload = await response.json().catch(() => ({}));
    setBusy(null);

    if (!response.ok) {
      setMessage(payload.error ?? 'Draft generation failed');
      return;
    }

    setMessage(`Drafted ${payload.draftCount ?? 0} answers.`);
    router.refresh();
  }

  async function exportCsv() {
    setBusy('export');
    setMessage(null);
    const response = await fetch(`/api/questionnaires/${questionnaireId}/export`, { method: 'POST' });
    setBusy(null);
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setMessage(payload.error ?? 'Export failed');
      return;
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${filename.replace(/\.[a-z0-9]+$/i, '')}-completed.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    setMessage('CSV exported.');
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={filename}
        description="Review mappings, generate cited draft answers, and export a completed questionnaire file."
        secondaryActions={[{ label: 'Back', href: '/app/questionnaires', variant: 'outline' }]}
      />

      <Card>
        <CardHeader>
          <CardTitle>Automation Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          <Select value={templateId} onChange={(event) => setTemplateId(event.target.value)} className="w-[280px]">
            {templates.length === 0 ? <option value="">No template available</option> : null}
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </Select>
          <Button onClick={runMap} disabled={busy !== null || templates.length === 0}>
            {busy === 'map' ? 'Mapping...' : 'Auto-map Questions'}
          </Button>
          <Button onClick={runDrafts} variant="outline" disabled={busy !== null}>
            {busy === 'draft' ? 'Drafting...' : 'Generate Draft Answers'}
          </Button>
          <Button onClick={exportCsv} variant="secondary" disabled={busy !== null}>
            {busy === 'export' ? 'Exporting...' : 'Export CSV'}
          </Button>
          {message ? <p className="w-full text-sm text-muted-foreground">{message}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Questionnaire Items</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Row</TableHead>
                <TableHead>Question</TableHead>
                <TableHead>Mapping</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead>Draft</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const mapping = item.mappings[0];
                const draft = item.draftAnswers[0];
                return (
                  <TableRow key={item.id}>
                    <TableCell>{item.rowKey}</TableCell>
                    <TableCell>{item.questionText}</TableCell>
                    <TableCell>{mapping?.templateQuestion?.prompt ?? 'Unmapped'}</TableCell>
                    <TableCell>{mapping ? `${Math.round(mapping.confidence * 100)}%` : '-'}</TableCell>
                    <TableCell>{draft?.answerText?.slice(0, 180) ?? 'No draft yet'}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
