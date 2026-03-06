import { describe, expect, it } from 'vitest';
import { getSoloCisoCapabilities, getTopTrendActions, getTrendSignals } from '../src/lib/intel/trends';

describe('threat intelligence trend library', () => {
  it('returns sorted trend signals with source attribution', () => {
    const trends = getTrendSignals();

    expect(trends.length).toBeGreaterThanOrEqual(6);
    expect(trends[0]?.severity).toBe('critical');
    expect(trends.every((trend) => trend.sourceSet.length > 0)).toBe(true);
    expect(trends.every((trend) => trend.sourceSet.every((source) => source.url.startsWith('https://')))).toBe(
      true
    );
  });

  it('maps trends into capability blocks and top actions', () => {
    const capabilities = getSoloCisoCapabilities();
    const topActions = getTopTrendActions(8);

    expect(capabilities.length).toBeGreaterThanOrEqual(5);
    expect(capabilities.some((capability) => capability.linkedRoute === '/app/command-center')).toBe(true);
    expect(topActions).toHaveLength(8);
    expect(topActions.every((action) => action.action.length > 0)).toBe(true);
  });
});

