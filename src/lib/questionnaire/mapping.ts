import { ImportedQuestionRow } from '@/lib/questionnaire/parser';

type QuestionTarget = {
  id: string;
  prompt: string;
};

export type MappingResult = {
  sourceQuestion: string;
  sourceAnswer?: string;
  sourceScore?: number;
  sourceConfidence?: number;
  mappedQuestionId: string | null;
  mappedPrompt: string | null;
  matchScore: number;
};

function tokenize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 1);
}

function jaccardScore(a: string, b: string) {
  const setA = new Set(tokenize(a));
  const setB = new Set(tokenize(b));

  if (!setA.size || !setB.size) return 0;

  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection += 1;
  }

  const union = new Set([...setA, ...setB]).size;
  return union ? intersection / union : 0;
}

export function mapQuestionnaireRows(rows: ImportedQuestionRow[], targets: QuestionTarget[]): MappingResult[] {
  return rows.map((row) => {
    let bestTarget: QuestionTarget | null = null;
    let bestScore = 0;

    for (const target of targets) {
      const score = jaccardScore(row.question, target.prompt);
      if (score > bestScore) {
        bestScore = score;
        bestTarget = target;
      }
    }

    return {
      sourceQuestion: row.question,
      sourceAnswer: row.answer,
      sourceScore: row.score,
      sourceConfidence: row.confidence,
      mappedQuestionId: bestScore >= 0.08 ? bestTarget?.id ?? null : null,
      mappedPrompt: bestScore >= 0.08 ? bestTarget?.prompt ?? null : null,
      matchScore: Number(bestScore.toFixed(4))
    };
  });
}
