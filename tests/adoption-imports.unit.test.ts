import { describe, expect, it } from 'vitest';
import { parseImportRows, summarizeImport } from '@/lib/adoption/imports';

describe('adoption import helpers', () => {
  it('parses pipe-delimited manual finding rows without a header', () => {
    const rows = parseImportRows(
      'FINDINGS',
      'MANUAL',
      'Privileged access review gap | Quarterly admin review still depends on manual exports. | HIGH | OPEN | IAM-1'
    );

    expect(rows).toEqual([
      {
        title: 'Privileged access review gap',
        description: 'Quarterly admin review still depends on manual exports.',
        priority: 'HIGH',
        status: 'OPEN',
        controlcode: 'IAM-1'
      }
    ]);
  });

  it('parses CSV approved answers using header names', () => {
    const rows = parseImportRows(
      'APPROVED_ANSWERS',
      'CSV',
      ['questionText,answerText,scope', '"Do you enforce MFA?","Yes. MFA is enforced for privileged accounts.",REUSABLE'].join('\n')
    );

    expect(rows).toEqual([
      {
        questiontext: 'Do you enforce MFA?',
        answertext: 'Yes. MFA is enforced for privileged accounts.',
        scope: 'REUSABLE'
      }
    ]);
  });

  it('summarizes partial imports in operator language', () => {
    expect(
      summarizeImport({
        target: 'RISKS',
        source: 'CONNECTOR_EXPORT',
        createdCount: 2,
        failedCount: 1
      })
    ).toBe('connector-assisted import created 2 risks with 1 row failure.');
  });
});
