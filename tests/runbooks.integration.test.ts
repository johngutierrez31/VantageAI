import { describe, expect, it } from 'vitest';
import { getSecurityRunbookById, getSecurityRunbooks } from '../src/lib/intel/runbooks';

describe('security runbook catalog', () => {
  it('returns runbooks with executable task templates', () => {
    const runbooks = getSecurityRunbooks();

    expect(runbooks.length).toBeGreaterThanOrEqual(4);
    expect(runbooks.every((runbook) => runbook.tasks.length > 0)).toBe(true);
    expect(runbooks.some((runbook) => runbook.severity === 'critical')).toBe(true);
  });

  it('finds specific runbooks by id', () => {
    const runbook = getSecurityRunbookById('identity-compromise');
    expect(runbook).toBeTruthy();
    expect(runbook?.title).toContain('Identity');
    expect(getSecurityRunbookById('does-not-exist')).toBeNull();
  });
});

