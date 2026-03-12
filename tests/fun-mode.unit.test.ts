import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FUN_HIT_COUNT,
  formatRetroHitCount,
  getNextFunHitCount,
  getRetroRouteLabel,
  getStoredFunHitCount,
  parseFunModePreference
} from '@/lib/ui/fun-mode';

describe('fun mode helpers', () => {
  it('parses stored fun mode preferences safely', () => {
    expect(parseFunModePreference('true')).toBe(true);
    expect(parseFunModePreference('false')).toBe(false);
    expect(parseFunModePreference('maybe')).toBeNull();
    expect(parseFunModePreference(null)).toBeNull();
  });

  it('uses a stable fallback for invalid hit counters', () => {
    expect(getStoredFunHitCount('not-a-number')).toBe(DEFAULT_FUN_HIT_COUNT);
    expect(getStoredFunHitCount(null, 9)).toBe(9);
  });

  it('increments the hit counter from stored state', () => {
    expect(getNextFunHitCount('1337009')).toBe(1337010);
    expect(getNextFunHitCount(null)).toBe(DEFAULT_FUN_HIT_COUNT + 1);
  });

  it('formats retro hit counters with leading zeroes', () => {
    expect(formatRetroHitCount(42)).toBe('0000042');
  });

  it('maps app routes to retro labels', () => {
    expect(getRetroRouteLabel('/app/command-center')).toBe('Command Center');
    expect(getRetroRouteLabel('/app/trust/inbox')).toBe('TrustOps');
    expect(getRetroRouteLabel('/app/settings/members')).toBe('Settings');
    expect(getRetroRouteLabel('/app/unknown')).toBe('Security Console');
  });
});
