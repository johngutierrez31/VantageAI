import { describe, expect, it } from 'vitest';
import { buildSuiteExportBaseName, slugifyExportName } from '@/lib/export/file-names';

describe('export file names', () => {
  it('slugifies export names safely', () => {
    expect(slugifyExportName(' Board Brief / Q1 ')).toBe('board-brief-q1');
    expect(slugifyExportName('***', 'fallback')).toBe('fallback');
  });

  it('builds suite-prefixed export base names', () => {
    expect(buildSuiteExportBaseName('after-action', 'After Action Report', 'Validation incident')).toBe(
      'vantageciso-after-action-after-action-report-validation-incident'
    );
  });
});
