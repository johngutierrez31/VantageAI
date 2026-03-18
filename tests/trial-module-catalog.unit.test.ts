import { describe, expect, it } from 'vitest';
import { getModuleCommercialState, MODULE_CATALOG } from '@/lib/product/module-catalog';

describe('trial module commercial state', () => {
  it('treats core modules as included during an active trial', () => {
    const state = getModuleCommercialState('FREE', MODULE_CATALOG[0], {
      workspaceMode: 'TRIAL',
      isTrialActive: true
    });

    expect(state).toMatchObject({
      included: true,
      badge: 'Included in 14-day trial',
      upgradeCtaLabel: 'Open module'
    });
    expect(state.helperText).toContain('blank workspace');
  });

  it('preserves paid packaging logic outside of trial mode', () => {
    const state = getModuleCommercialState('FREE', MODULE_CATALOG[3], {
      workspaceMode: 'PAID',
      isTrialActive: false
    });

    expect(state.included).toBe(false);
    expect(state.badge).toBe('Packaging target: Enterprise');
    expect(state.upgradeCtaLabel).toBe('Review Enterprise packaging');
  });
});
