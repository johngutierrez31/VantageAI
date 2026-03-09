import { describe, expect, it } from 'vitest';
import { buildQuarterFromReportingPeriod } from '../src/lib/pulse/quarterly-reviews';

describe('pulse quarterly review cadence', () => {
  it('normalizes monthly reporting periods into quarterly review periods', () => {
    expect(buildQuarterFromReportingPeriod('2026-03')).toBe('2026-Q1');
    expect(buildQuarterFromReportingPeriod('2026-Q3')).toBe('2026-Q3');
  });
});
