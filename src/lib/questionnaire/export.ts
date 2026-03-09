type QuestionnaireExportRow = {
  rowKey: string;
  questionText: string;
  normalizedQuestion?: string | null;
  mappedPrompt?: string | null;
  answerText?: string | null;
  confidenceScore?: number | null;
  reviewStatus?: string | null;
  mappedControlIds?: string[] | null;
  supportingEvidenceIds?: string[] | null;
  citations?: Array<{ evidenceName?: string; chunkIndex?: number }> | null;
};

type QuestionnaireApprovedExportSource = {
  rowKey: string;
  questionText: string;
  normalizedQuestion?: string | null;
  mappedPrompt?: string | null;
  draft?: {
    answerText?: string | null;
    status?: string | null;
    confidenceScore?: number | null;
    mappedControlIds?: string[] | null;
    supportingEvidenceIds?: string[] | null;
    citations?: Array<{ evidenceName?: string; chunkIndex?: number }> | null;
  } | null;
};

function escapeCsv(value: string) {
  if (value.includes('"') || value.includes(',') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function buildQuestionnaireCsv(rows: QuestionnaireExportRow[]) {
  const header = [
    'row_key',
    'question',
    'normalized_question',
    'mapped_question',
    'approved_answer',
    'review_status',
    'confidence',
    'mapped_control_ids',
    'supporting_evidence_ids',
    'citations'
  ];

  const body = rows.map((row) => {
    const citationText = (row.citations ?? [])
      .map((citation) => {
        const name = citation.evidenceName ?? 'evidence';
        const index = typeof citation.chunkIndex === 'number' ? `#${citation.chunkIndex}` : '';
        return `${name}${index}`;
      })
      .join('; ');
    const confidenceText =
      typeof row.confidenceScore === 'number' && Number.isFinite(row.confidenceScore)
        ? row.confidenceScore.toFixed(2)
        : '';

    return [
      row.rowKey,
      row.questionText,
      row.normalizedQuestion ?? '',
      row.mappedPrompt ?? '',
      row.answerText ?? '',
      row.reviewStatus ?? '',
      confidenceText,
      (row.mappedControlIds ?? []).join('; '),
      (row.supportingEvidenceIds ?? []).join('; '),
      citationText
    ]
      .map((value) => escapeCsv(value))
      .join(',');
  });

  return [header.join(','), ...body].join('\n');
}

export function buildApprovedQuestionnaireExportRows(rows: QuestionnaireApprovedExportSource[]) {
  return rows
    .filter((row) => row.draft?.status === 'APPROVED' && row.draft.answerText)
    .map((row) => ({
      rowKey: row.rowKey,
      questionText: row.questionText,
      normalizedQuestion: row.normalizedQuestion ?? null,
      mappedPrompt: row.mappedPrompt ?? null,
      answerText: row.draft?.answerText ?? null,
      reviewStatus: row.draft?.status ?? null,
      confidenceScore: row.draft?.confidenceScore ?? null,
      mappedControlIds: row.draft?.mappedControlIds ?? [],
      supportingEvidenceIds: row.draft?.supportingEvidenceIds ?? [],
      citations: row.draft?.citations ?? []
    })) satisfies QuestionnaireExportRow[];
}
