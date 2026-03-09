import { prisma } from '@/lib/db/prisma';
import { buildSafetySystemPrompt, redactSecrets } from '@/lib/ai/safety';
import { searchEvidenceChunks } from '@/lib/evidence/search';
import { jaccardScore, normalizeQuestionText } from '@/lib/questionnaire/mapping';

export type DraftCitation = {
  evidenceId: string;
  evidenceName: string;
  chunkId: string;
  chunkIndex: number;
  snippet: string;
  score: number;
};

export type ApprovedAnswerCandidate = {
  id: string;
  normalizedQuestion: string;
  questionText: string;
  answerText: string;
  mappedControlIds: string[];
  supportingEvidenceIds: string[];
  scope: 'REUSABLE' | 'TENANT_SPECIFIC';
};

export type DraftSupportStrength = 'STRONG' | 'MODERATE' | 'WEAK' | 'MISSING';

export type DraftResult = {
  normalizedQuestion: string;
  mappedControlIds: string[];
  supportingEvidenceIds: string[];
  answerText: string;
  citations: DraftCitation[];
  model: string;
  confidenceScore: number;
  reviewRequired: boolean;
  reviewReason: string | null;
  notesForReviewer: string | null;
  supportStrength: DraftSupportStrength;
  approvedAnswerId: string | null;
};

type ApprovedAnswerMatch = ApprovedAnswerCandidate & {
  score: number;
};

function parseOpenAiAnswer(payload: unknown) {
  if (!payload || typeof payload !== 'object') return null;
  const choices = (payload as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) return null;
  const first = choices[0];
  if (!first || typeof first !== 'object') return null;
  const message = (first as { message?: unknown }).message;
  if (!message || typeof message !== 'object') return null;
  const content = (message as { content?: unknown }).content;
  if (typeof content === 'string' && content.trim()) return content.trim();
  return null;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value))
    )
  );
}

function buildEvidenceContext(citations: DraftCitation[]) {
  return citations
    .map((citation, index) => `[${index + 1}] ${citation.evidenceName}#${citation.chunkIndex}: ${citation.snippet}`)
    .join('\n\n');
}

function isSensitiveQuestion(questionText: string, guidance?: string | null) {
  const value = `${questionText}\n${guidance ?? ''}`.toLowerCase();
  return /(guarantee|commit|encryption|encrypt|residency|data\s+location|retention|retain|breach|notify|compliance|soc\s?2|iso\s?27001|hipaa|gdpr|pci)/.test(
    value
  );
}

function findBestApprovedAnswer(questionText: string, approvedAnswers: ApprovedAnswerCandidate[]) {
  let best: ApprovedAnswerMatch | null = null;

  for (const answer of approvedAnswers) {
    const score = Math.max(
      jaccardScore(questionText, answer.normalizedQuestion),
      jaccardScore(questionText, answer.questionText)
    );
    if (!best || score > best.score) {
      best = {
        ...answer,
        score: Number(score.toFixed(4))
      };
    }
  }

  if (!best || best.score < 0.3) return null;
  return best;
}

function inferSupportStrength(citations: DraftCitation[], approvedAnswerMatch: ApprovedAnswerMatch | null): DraftSupportStrength {
  const strongHits = citations.filter((citation) => citation.score >= 0.18).length;
  const moderateHits = citations.filter((citation) => citation.score >= 0.1).length;

  if (strongHits >= 2 || (strongHits >= 1 && approvedAnswerMatch?.score && approvedAnswerMatch.score >= 0.8)) {
    return 'STRONG';
  }

  if (moderateHits >= 1 || (approvedAnswerMatch?.score ?? 0) >= 0.72) {
    return 'MODERATE';
  }

  if (citations.length || approvedAnswerMatch) {
    return 'WEAK';
  }

  return 'MISSING';
}

function computeConfidence(args: {
  citations: DraftCitation[];
  approvedAnswerMatch: ApprovedAnswerMatch | null;
  mappedControlIds: string[];
  supportStrength: DraftSupportStrength;
}) {
  const strongestCitation = args.citations[0]?.score ?? 0;
  const evidenceComponent = clamp((strongestCitation + Math.min(args.citations.length, 3) * 0.08) * 0.55, 0, 0.45);
  const libraryComponent = clamp((args.approvedAnswerMatch?.score ?? 0) * 0.35, 0, 0.35);
  const controlComponent = args.mappedControlIds.length ? 0.12 : 0;
  const supportBonus =
    args.supportStrength === 'STRONG' ? 0.08 : args.supportStrength === 'MODERATE' ? 0.03 : 0;

  return Number(clamp(0.12 + evidenceComponent + libraryComponent + controlComponent + supportBonus, 0.05, 0.99).toFixed(2));
}

function buildReviewReason(args: {
  confidenceScore: number;
  supportStrength: DraftSupportStrength;
  sensitiveQuestion: boolean;
}) {
  const reasons: string[] = [];

  if (args.supportStrength === 'MISSING') {
    reasons.push('Missing approved supporting evidence');
  } else if (args.supportStrength === 'WEAK') {
    reasons.push('Evidence support is weak');
  }

  if (args.confidenceScore < 0.85) {
    reasons.push(`Confidence ${args.confidenceScore.toFixed(2)} is below approval threshold`);
  }

  if (args.sensitiveQuestion) {
    reasons.push('Question implies a sensitive security or compliance commitment');
  }

  return reasons.length ? reasons.join('; ') : null;
}

function buildNotesForReviewer(args: {
  questionText: string;
  approvedAnswerMatch: ApprovedAnswerMatch | null;
  citations: DraftCitation[];
  mappedControlIds: string[];
  supportStrength: DraftSupportStrength;
}) {
  const notes: string[] = [];

  if (args.approvedAnswerMatch) {
    notes.push(
      `Matched approved answer library entry at ${(args.approvedAnswerMatch.score * 100).toFixed(0)}% similarity (${args.approvedAnswerMatch.scope.toLowerCase()}).`
    );
  }

  if (!args.citations.length) {
    notes.push('No fresh evidence snippets were retrieved for this question.');
  } else if (args.supportStrength === 'WEAK') {
    notes.push('Retrieved evidence exists but support quality is weak; verify buyer-safe wording before approval.');
  }

  if (!args.mappedControlIds.length) {
    notes.push('No mapped control id was available for this draft.');
  }

  if (!notes.length) {
    notes.push(`Review final wording for buyer-safe language before sending: ${args.questionText}`);
  }

  return notes.join(' ');
}

function buildFallbackAnswer(args: {
  questionText: string;
  guidance?: string | null;
  approvedAnswerMatch: ApprovedAnswerMatch | null;
  citations: DraftCitation[];
}) {
  if (args.approvedAnswerMatch?.score && args.approvedAnswerMatch.score >= 0.82) {
    return args.approvedAnswerMatch.answerText;
  }

  if (!args.citations.length) {
    return 'Support is currently insufficient to provide an approved questionnaire response. Internal review and evidence collection are required before sharing.';
  }

  const snippetSummary = args.citations
    .slice(0, 3)
    .map((citation, index) => `[${index + 1}] ${citation.snippet}`)
    .join(' ');

  const guidance = args.guidance ? `Mapped guidance: ${args.guidance}. ` : '';
  const approvedPrefix =
    args.approvedAnswerMatch?.score && args.approvedAnswerMatch.score >= 0.6
      ? `${args.approvedAnswerMatch.answerText}\n\n`
      : '';

  return `${approvedPrefix}${guidance}Evidence-backed draft for "${args.questionText}": ${snippetSummary}`.trim();
}

async function completeWithOpenAI(input: {
  questionText: string;
  guidance?: string | null;
  context: string;
  approvedAnswerText?: string | null;
  model: string;
}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: input.model,
      temperature: 0.1,
      max_tokens: 900,
      messages: [
        {
          role: 'system',
          content: [
            'You are assisting with security questionnaires.',
            buildSafetySystemPrompt(),
            'Use only approved answer language and provided evidence.',
            'Do not invent facts, commitments, or compliance claims.',
            'Return concise enterprise-ready answers with citation markers [1], [2] when claims rely on snippets.'
          ].join(' ')
        },
        {
          role: 'user',
          content: [
            `Question: ${redactSecrets(input.questionText)}`,
            input.guidance ? `Mapped guidance: ${redactSecrets(input.guidance)}` : '',
            input.approvedAnswerText ? `Approved answer candidate: ${redactSecrets(input.approvedAnswerText)}` : '',
            'Evidence snippets:',
            input.context || 'No evidence snippets available.',
            'Write a buyer-safe draft answer grounded only in the approved answer candidate and evidence.'
          ]
            .filter(Boolean)
            .join('\n\n')
        }
      ]
    })
  });

  if (!response.ok) return null;
  const payload = await response.json();
  return parseOpenAiAnswer(payload);
}

async function hydrateApprovedEvidenceCitations(tenantId: string, approvedAnswerMatch: ApprovedAnswerMatch | null) {
  if (!approvedAnswerMatch?.supportingEvidenceIds.length) return [];

  const evidence = await prisma.evidence.findMany({
    where: {
      tenantId,
      id: { in: approvedAnswerMatch.supportingEvidenceIds }
    },
    select: {
      id: true,
      name: true
    }
  });

  return evidence.map((item) => ({
    evidenceId: item.id,
    evidenceName: item.name,
    chunkId: `approved:${item.id}`,
    chunkIndex: -1,
    snippet: 'Approved library answer linked to this evidence artifact.',
    score: 0.12
  })) satisfies DraftCitation[];
}

export async function generateDraftAnswer(input: {
  tenantId: string;
  questionText: string;
  guidance?: string | null;
  mappedControlIds?: string[];
  approvedAnswers?: ApprovedAnswerCandidate[];
}) {
  const normalizedQuestion = normalizeQuestionText(input.questionText);
  const approvedAnswerMatch = findBestApprovedAnswer(normalizedQuestion, input.approvedAnswers ?? []);
  const evidenceHits = await searchEvidenceChunks(input.tenantId, input.questionText, 6);
  const hydratedApprovedCitations = await hydrateApprovedEvidenceCitations(input.tenantId, approvedAnswerMatch);

  const citations = [
    ...evidenceHits.map((result) => ({
      evidenceId: result.evidenceId,
      evidenceName: result.evidenceName,
      chunkId: result.chunkId,
      chunkIndex: result.chunkIndex,
      snippet: result.snippet,
      score: result.score
    })),
    ...hydratedApprovedCitations
  ]
    .reduce<DraftCitation[]>((acc, citation) => {
      if (acc.some((item) => item.chunkId === citation.chunkId)) return acc;
      acc.push(citation);
      return acc;
    }, [])
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  const mappedControlIds = uniqueStrings([
    ...(input.mappedControlIds ?? []),
    ...(approvedAnswerMatch?.mappedControlIds ?? [])
  ]);
  const supportingEvidenceIds = uniqueStrings([
    ...citations.map((citation) => citation.evidenceId),
    ...(approvedAnswerMatch?.supportingEvidenceIds ?? [])
  ]);

  const supportStrength = inferSupportStrength(citations, approvedAnswerMatch);
  const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
  const aiAnswer = await completeWithOpenAI({
    questionText: input.questionText,
    guidance: input.guidance,
    context: buildEvidenceContext(citations),
    approvedAnswerText: approvedAnswerMatch?.answerText ?? null,
    model
  });

  const answerText =
    aiAnswer ??
    buildFallbackAnswer({
      questionText: input.questionText,
      guidance: input.guidance,
      approvedAnswerMatch,
      citations
    });

  const confidenceScore = computeConfidence({
    citations,
    approvedAnswerMatch,
    mappedControlIds,
    supportStrength
  });
  const sensitiveQuestion = isSensitiveQuestion(input.questionText, input.guidance);
  const reviewRequired =
    confidenceScore < 0.85 || supportStrength === 'WEAK' || supportStrength === 'MISSING' || sensitiveQuestion;
  const reviewReason = buildReviewReason({
    confidenceScore,
    supportStrength,
    sensitiveQuestion
  });

  return {
    normalizedQuestion,
    mappedControlIds,
    supportingEvidenceIds,
    answerText,
    citations,
    model: aiAnswer ? model : approvedAnswerMatch?.score && approvedAnswerMatch.score >= 0.82 ? 'approved-answer-library' : 'heuristic-fallback',
    confidenceScore,
    reviewRequired,
    reviewReason,
    notesForReviewer: buildNotesForReviewer({
      questionText: input.questionText,
      approvedAnswerMatch,
      citations,
      mappedControlIds,
      supportStrength
    }),
    supportStrength,
    approvedAnswerId: approvedAnswerMatch?.id ?? null
  } satisfies DraftResult;
}
