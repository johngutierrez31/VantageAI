'use client';

import { useEffect, useState } from 'react';

type ScoreResult = {
  overall: number;
  confidence: number;
  byDomain: Record<string, number>;
};

export function ScoreCard({ assessmentId }: { assessmentId: string }) {
  const [score, setScore] = useState<ScoreResult | null>(null);

  useEffect(() => {
    fetch(`/api/assessments/${assessmentId}/score`).then((r) => r.json()).then(setScore);
  }, [assessmentId]);

  if (!score) return <div className="card">Loading score...</div>;

  return (
    <div className="card">
      <h3>Readiness Score</h3>
      <p>Overall: {score.overall} / 4</p>
      <p>Confidence: {Math.round(score.confidence * 100)}%</p>
      <ul>{Object.entries(score.byDomain).map(([domain, value]) => <li key={domain}>{domain}: {value}</li>)}</ul>
    </div>
  );
}
