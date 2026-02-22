'use client';

import { useMemo, useState } from 'react';

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

  const completion = useMemo(
    () => Math.round((Object.keys(scores).length / Math.max(questions.length, 1)) * 100),
    [scores, questions.length]
  );

  async function save(questionId: string) {
    setSavingId(questionId);

    await fetch(`/api/assessments/${assessmentId}`, {
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

    setSavingId(null);
  }

  async function generateDraft(questionId: string) {
    setRagBusyId(questionId);

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
    }

    setRagBusyId(null);
  }

  return (
    <div>
      <div className="card">Completion: {completion}%</div>
      {questions.map((q) => (
        <div className="card" key={q.id}>
          <div>{q.control.domain} / {q.control.code}</div>
          <div>{q.prompt}</div>
          <textarea
            rows={4}
            placeholder="Answer"
            value={answers[q.id] ?? ''}
            onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
            style={{ width: '100%', marginTop: 8 }}
          />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
            <input
              type="number"
              min={0}
              max={4}
              step={1}
              value={scores[q.id] ?? ''}
              onChange={(e) => setScores((prev) => ({ ...prev, [q.id]: Number(e.target.value) }))}
            />
            <button onClick={() => save(q.id)} disabled={savingId === q.id}>
              {savingId === q.id ? 'Saving...' : 'Save response'}
            </button>
            <button onClick={() => generateDraft(q.id)} disabled={ragBusyId === q.id}>
              {ragBusyId === q.id ? 'Generating...' : 'Generate with evidence'}
            </button>
          </div>
          {aiDraftByQuestion[q.id] ? <p><strong>AI Draft:</strong> {aiDraftByQuestion[q.id]}</p> : null}
          {citationsByQuestion[q.id]?.length ? (
            <ul>
              {citationsByQuestion[q.id].map((citation) => (
                <li key={citation.chunkId}>
                  {citation.label} - {citation.snippet}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ))}
    </div>
  );
}
