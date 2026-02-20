'use client';

import { useMemo, useState } from 'react';

type Props = {
  assessmentId: string;
  questions: Array<{ id: string; prompt: string; weight: number; control: { domain: string; code: string } }>;
};

export function ResponseEditor({ assessmentId, questions }: Props) {
  const [scores, setScores] = useState<Record<string, number>>({});
  const completion = useMemo(() => Math.round((Object.keys(scores).length / Math.max(questions.length, 1)) * 100), [scores, questions.length]);

  async function save(questionId: string) {
    await fetch(`/api/assessments/${assessmentId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId, score: Number(scores[questionId] ?? 0), confidence: 0.7 })
    });
  }

  return (
    <div>
      <div className="card">Completion: {completion}%</div>
      {questions.map((q) => (
        <div className="card" key={q.id}>
          <div>{q.control.domain} / {q.control.code}</div>
          <div>{q.prompt}</div>
          <input
            type="number"
            min={0}
            max={4}
            step={1}
            value={scores[q.id] ?? ''}
            onChange={(e) => setScores((prev) => ({ ...prev, [q.id]: Number(e.target.value) }))}
          />
          <button onClick={() => save(q.id)}>Save response</button>
        </div>
      ))}
    </div>
  );
}
