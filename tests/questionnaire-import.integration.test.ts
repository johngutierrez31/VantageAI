import { describe, expect, it } from 'vitest';
import { parseQuestionnaireImport } from '../src/lib/questionnaire/parser';
import { mapQuestionnaireRows } from '../src/lib/questionnaire/mapping';

describe('questionnaire import mapping workflow', () => {
  it('parses CSV rows and maps them to closest template questions', () => {
    const csv = [
      'question,answer,score,confidence',
      'Do you maintain approved security policies?,Yes,3,0.8',
      'Is MFA required for admins?,Yes,4,0.9'
    ].join('\n');

    const rows = parseQuestionnaireImport('csv', csv);
    const mappings = mapQuestionnaireRows(rows, [
      { id: 'q1', prompt: 'Do you maintain approved security policies?' },
      { id: 'q2', prompt: 'Is MFA enforced for privileged accounts?' }
    ]);

    expect(rows).toHaveLength(2);
    expect(mappings[0].mappedQuestionId).toBe('q1');
    expect(mappings[0].matchScore).toBeGreaterThan(0.8);
    expect(mappings[1].mappedQuestionId).toBe('q2');
  });
});
