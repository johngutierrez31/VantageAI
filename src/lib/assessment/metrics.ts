import { computeAssessmentScore } from '@/lib/scoring/engine';

type QuestionLike = {
  id: string;
  prompt: string;
  weight: number;
  control: {
    code: string;
    domain: string;
    title?: string;
    weight?: number;
  };
};

type ResponseLike = {
  questionId: string;
  score: number | null;
  confidence: number | null;
  answer: string | null;
  evidenceLinks?: Array<{ evidenceId: string }>;
};

export function computeScoreFromResponses(questions: QuestionLike[], responses: ResponseLike[]) {
  const byQuestionId = new Map(responses.map((response) => [response.questionId, response]));

  const scoredQuestions = questions.map((question) => {
    const response = byQuestionId.get(question.id);
    return {
      domain: question.control.domain,
      controlCode: question.control.code,
      score: response?.score ?? 0,
      weight: question.weight ?? 1,
      confidence: response?.confidence ?? 0.5
    };
  });

  return computeAssessmentScore(scoredQuestions);
}

type ControlCoverage = {
  controlCode: string;
  domain: string;
  title: string;
  weight: number;
  averageScore: number;
  coverage: number;
  evidenceCount: number;
  status: 'OPEN' | 'PARTIAL' | 'COVERED';
  evidenceTier: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';
};

export function buildControlCoverage(questions: QuestionLike[], responses: ResponseLike[]): ControlCoverage[] {
  const responseByQuestionId = new Map(responses.map((response) => [response.questionId, response]));
  const byControl = new Map<
    string,
    {
      controlCode: string;
      domain: string;
      title: string;
      weight: number;
      questionCount: number;
      answeredCount: number;
      scores: number[];
      evidenceCount: number;
    }
  >();

  for (const question of questions) {
    const key = question.control.code;
    const bucket = byControl.get(key) ?? {
      controlCode: question.control.code,
      domain: question.control.domain,
      title: question.control.title ?? question.prompt,
      weight: question.control.weight ?? question.weight ?? 1,
      questionCount: 0,
      answeredCount: 0,
      scores: [],
      evidenceCount: 0
    };

    bucket.questionCount += 1;

    const response = responseByQuestionId.get(question.id);
    if (response && typeof response.score === 'number') {
      bucket.answeredCount += 1;
      bucket.scores.push(response.score);
      bucket.evidenceCount += response.evidenceLinks?.length ?? 0;
    }

    byControl.set(key, bucket);
  }

  return Array.from(byControl.values())
    .map((item) => {
      const averageScore = item.scores.length
        ? Number((item.scores.reduce((total, score) => total + score, 0) / item.scores.length).toFixed(2))
        : 0;
      const coverage = item.questionCount ? Number((item.answeredCount / item.questionCount).toFixed(2)) : 0;
      const status: ControlCoverage['status'] = averageScore >= 3 ? 'COVERED' : averageScore >= 2 ? 'PARTIAL' : 'OPEN';
      const evidenceTier: ControlCoverage['evidenceTier'] = item.evidenceCount >= item.questionCount * 2
        ? 'HIGH'
        : item.evidenceCount >= item.questionCount
        ? 'MEDIUM'
        : item.evidenceCount > 0
        ? 'LOW'
        : 'NONE';

      return {
        controlCode: item.controlCode,
        domain: item.domain,
        title: item.title,
        weight: item.weight,
        averageScore,
        coverage,
        evidenceCount: item.evidenceCount,
        status,
        evidenceTier
      };
    })
    .sort((a, b) => {
      if (a.status !== b.status) {
        const weight: Record<ControlCoverage['status'], number> = { OPEN: 0, PARTIAL: 1, COVERED: 2 };
        return weight[a.status] - weight[b.status];
      }
      return b.weight - a.weight;
    });
}

export function buildTrendSeries(scores: Array<{ createdAt: Date; overall: number }>) {
  if (!scores.length) return [];

  const ordered = [...scores].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  return ordered.map((entry) => ({
    label: entry.createdAt.toISOString().slice(5, 10),
    value: entry.overall
  }));
}
