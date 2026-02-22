export type ScoredQuestion = {
  domain: string;
  controlCode: string;
  score: number;
  weight: number;
  confidence?: number;
};

export type ScoreResult = {
  overall: number;
  confidence: number;
  byDomain: Record<string, number>;
  gaps: Array<{ domain: string; controlCode: string; score: number; recommendation: string }>;
};
