import { afterEach, describe, expect, it, vi } from 'vitest';
import { isDemoModeEnabled } from '@/lib/auth/demo';

describe('demo mode guardrails', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('enables demo mode when DEMO_MODE is true and host is not production', () => {
    vi.stubEnv('DEMO_MODE', 'true');
    vi.stubEnv('APP_BASE_URL', 'http://localhost:3000');

    expect(isDemoModeEnabled()).toBe(true);
  });

  it('disables demo mode when DEMO_MODE is not true', () => {
    expect(isDemoModeEnabled()).toBe(false);
  });

  it('disables demo mode for locked production host from request context', () => {
    vi.stubEnv('DEMO_MODE', 'true');

    expect(isDemoModeEnabled({ requestHost: 'app.vantageciso.com' })).toBe(false);
  });

  it('disables demo mode for locked production host from configured base url', () => {
    vi.stubEnv('DEMO_MODE', 'true');
    vi.stubEnv('APP_BASE_URL', 'https://app.vantageciso.com');

    expect(isDemoModeEnabled()).toBe(false);
  });
});
