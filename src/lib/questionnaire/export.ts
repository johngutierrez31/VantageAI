type QuestionnaireExportRow = {
  rowKey: string;
  questionText: string;
  mappedPrompt?: string | null;
  answerText?: string | null;
  citations?: Array<{ evidenceName?: string; chunkIndex?: number }> | null;
};

function escapeCsv(value: string) {
  if (value.includes('"') || value.includes(',') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function buildQuestionnaireCsv(rows: QuestionnaireExportRow[]) {
  const header = ['row_key', 'question', 'mapped_question', 'draft_answer', 'citations'];

  const body = rows.map((row) => {
    const citationText = (row.citations ?? [])
      .map((citation) => {
        const name = citation.evidenceName ?? 'evidence';
        const index = typeof citation.chunkIndex === 'number' ? `#${citation.chunkIndex}` : '';
        return `${name}${index}`;
      })
      .join('; ');

    return [
      row.rowKey,
      row.questionText,
      row.mappedPrompt ?? '',
      row.answerText ?? '',
      citationText
    ]
      .map((value) => escapeCsv(value))
      .join(',');
  });

  return [header.join(','), ...body].join('\n');
}
