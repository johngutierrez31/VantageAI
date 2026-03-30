import { afterEach, describe, expect, it, vi } from 'vitest';
import { isDemoModeEnabled } from '@/lib/auth/demo';

describe('demo mode guardrails', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('enables demo mode in non-production when DEMO_MODE is true', () => {
    vi.stubEnv('DEMO_BYPASS_ENABLED', 'true');
    vi.stubEnv('DEMO_MODE', 'true');
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('APP_BASE_URL', 'http://localhost:3000');

    expect(isDemoModeEnabled()).toBe(true);
  });

  it('disables demo mode in production even when DEMO_MODE is true', () => {
    vi.stubEnv('DEMO_BYPASS_ENABLED', 'true');
    vi.stubEnv('DEMO_MODE', 'true');
    vi.stubEnv('NODE_ENV', 'production');

    expect(isDemoModeEnabled()).toBe(false);
  });

  it('disables demo mode when bypass flag is missing', () => {
    vi.stubEnv('DEMO_MODE', 'true');
    vi.stubEnv('NODE_ENV', 'development');

    expect(isDemoModeEnabled()).toBe(false);
  });

  it('disables demo mode when hosting context indicates production', () => {
    vi.stubEnv('DEMO_BYPASS_ENABLED', 'true');
    vi.stubEnv('DEMO_MODE', 'true');
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('CONTEXT', 'production');

    expect(isDemoModeEnabled()).toBe(false);
  });

  it('disables demo mode for locked production host from request context', () => {
    vi.stubEnv('DEMO_BYPASS_ENABLED', 'true');
    vi.stubEnv('DEMO_MODE', 'true');
    vi.stubEnv('NODE_ENV', 'development');

    expect(isDemoModeEnabled({ requestHost: 'app.vantageciso.com' })).toBe(false);
  });

  it('disables demo mode for locked production host from configured base url', () => {
    vi.stubEnv('DEMO_BYPASS_ENABLED', 'true');
    vi.stubEnv('DEMO_MODE', 'true');
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('APP_BASE_URL', 'https://app.vantageciso.com');

    expect(isDemoModeEnabled()).toBe(false);
  });
});
