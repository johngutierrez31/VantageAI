export type ImportedQuestionRow = {
  question: string;
  answer?: string;
  score?: number;
  confidence?: number;
};

function parseNumber(value: string | undefined) {
  if (!value) return undefined;
  const parsed = Number(value.trim());
  if (!Number.isFinite(parsed)) return undefined;
  return parsed;
}

function splitCsvLine(line: string) {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      const nextChar = line[index + 1];
      if (inQuotes && nextChar === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      cells.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

export function parseCsvQuestionnaire(content: string): ImportedQuestionRow[] {
  const lines = content
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) return [];

  const firstCells = splitCsvLine(lines[0]).map((item) => item.toLowerCase());
  const hasHeader = firstCells.includes('question') || firstCells.includes('prompt');

  const startIndex = hasHeader ? 1 : 0;
  const questionIndex = hasHeader ? Math.max(firstCells.indexOf('question'), firstCells.indexOf('prompt')) : 0;
  const answerIndex = hasHeader ? firstCells.indexOf('answer') : 1;
  const scoreIndex = hasHeader ? firstCells.indexOf('score') : 2;
  const confidenceIndex = hasHeader ? firstCells.indexOf('confidence') : 3;

  const rows: ImportedQuestionRow[] = [];

  for (let index = startIndex; index < lines.length; index += 1) {
    const cells = splitCsvLine(lines[index]);
    const question = cells[questionIndex] ?? '';

    if (!question.trim()) {
      continue;
    }

    rows.push({
      question: question.trim(),
      answer: cells[answerIndex]?.trim() || undefined,
      score: parseNumber(cells[scoreIndex]),
      confidence: parseNumber(cells[confidenceIndex])
    });
  }

  return rows;
}

export function parseJsonQuestionnaire(content: string): ImportedQuestionRow[] {
  const parsed = JSON.parse(content) as unknown;
  if (!Array.isArray(parsed)) return [];

  const rows: ImportedQuestionRow[] = [];

  for (const row of parsed) {
    if (!row || typeof row !== 'object') continue;

    const record = row as Record<string, unknown>;
    const question = record.question ?? record.prompt;
    const answer = record.answer;
    const score = record.score;
    const confidence = record.confidence;

    if (typeof question !== 'string' || !question.trim()) {
      continue;
    }

    rows.push({
      question: question.trim(),
      answer: typeof answer === 'string' ? answer : undefined,
      score: typeof score === 'number' ? score : undefined,
      confidence: typeof confidence === 'number' ? confidence : undefined
    });
  }

  return rows;
}

export function parseQuestionnaireImport(format: 'csv' | 'json', content: string) {
  if (format === 'json') return parseJsonQuestionnaire(content);
  return parseCsvQuestionnaire(content);
}
