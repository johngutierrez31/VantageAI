'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

type Citation = {
  evidenceId: string;
  evidenceName: string;
  chunkId: string;
  label: string;
  snippet: string;
  similarity: number;
};

type Props = {
  assessmentId: string;
  questions: Array<{ id: string; prompt: string; weight: number; control: { domain: string; code: string } }>;
};

export function ResponseEditor({ assessmentId, questions }: Props) {
  const [scores, setScores] = useState<Record<string, number>>({});
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [ragBusyId, setRagBusyId] = useState<string | null>(null);
  const [aiDraftByQuestion, setAiDraftByQuestion] = useState<Record<string, string>>({});
  const [citationsByQuestion, setCitationsByQuestion] = useState<Record<string, Citation[]>>({});
  const [message, setMessage] = useState<string | null>(null);

  const completion = useMemo(
    () => Math.round((Object.keys(scores).length / Math.max(questions.length, 1)) * 100),
    [scores, questions.length]
  );

  async function save(questionId: string) {
    setSavingId(questionId);
    setMessage(null);

    const response = await fetch(`/api/assessments/${assessmentId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionId,
        answer: answers[questionId] ?? undefined,
        score: Number(scores[questionId] ?? 0),
        confidence: 0.7,
        rationale: aiDraftByQuestion[questionId] ? 'Includes AI draft with cited evidence.' : undefined
      })
    });

    const payload = await response.json();
    setSavingId(null);

    if (!response.ok) {
      setMessage(payload.error ?? 'Failed to save response');
      return;
    }

    setMessage('Response saved.');
  }

  async function generateDraft(questionId: string) {
    setRagBusyId(questionId);
    setMessage(null);

    const response = await fetch(`/api/assessments/${assessmentId}/rag`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId })
    });

    const json = await response.json();
    if (response.ok) {
      setAiDraftByQuestion((prev) => ({ ...prev, [questionId]: json.answer }));
      setCitationsByQuestion((prev) => ({ ...prev, [questionId]: json.citations ?? [] }));
      setAnswers((prev) => ({ ...prev, [questionId]: json.answer ?? '' }));
    } else {
      setMessage(json.error ?? 'Failed to generate draft');
    }

    setRagBusyId(null);
  }

  return (
    <div className="space-y-3">
      <div className="rounded-md border border-border bg-muted/20 p-3 text-sm">
        Completion snapshot: <span className="font-semibold">{completion}%</span>
      </div>

      {questions.map((question) => (
        <div key={question.id} className="rounded-md border border-border p-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {question.control.domain} - {question.control.code}
          </p>
          <p className="mt-1 text-sm font-medium">{question.prompt}</p>
          <Textarea
            rows={4}
            placeholder="Answer"
            value={answers[question.id] ?? ''}
            onChange={(event) => setAnswers((prev) => ({ ...prev, [question.id]: event.target.value }))}
            className="mt-2"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Input
              type="number"
              min={0}
              max={4}
              step={1}
              value={scores[question.id] ?? ''}
              onChange={(event) => setScores((prev) => ({ ...prev, [question.id]: Number(event.target.value) }))}
              className="w-[120px]"
            />
            <Button onClick={() => save(question.id)} disabled={savingId === question.id} size="sm">
              {savingId === question.id ? 'Saving...' : 'Save response'}
            </Button>
            <Button onClick={() => generateDraft(question.id)} disabled={ragBusyId === question.id} size="sm" variant="outline">
              {ragBusyId === question.id ? 'Generating...' : 'Generate with evidence'}
            </Button>
          </div>
          {aiDraftByQuestion[question.id] ? (
            <p className="mt-2 text-sm text-muted-foreground">
              <strong>AI Draft:</strong> {aiDraftByQuestion[question.id]}
            </p>
          ) : null}
          {citationsByQuestion[question.id]?.length ? (
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {citationsByQuestion[question.id].map((citation) => (
                <li key={citation.chunkId} className="text-sm text-muted-foreground">
                  {citation.label} - {citation.snippet}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ))}

      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
    </div>
  );
}
