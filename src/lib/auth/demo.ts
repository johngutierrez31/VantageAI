const LOCKED_PRODUCTION_HOSTS = new Set(['app.vantageciso.com']);

type DemoModeOptions = {
  requestHost?: string | null;
};

function isProductionRuntime() {
  const nodeEnv = (process.env.NODE_ENV ?? '').toLowerCase();
  const vercelEnv = (process.env.VERCEL_ENV ?? '').toLowerCase();
  const netlifyContext = (process.env.CONTEXT ?? '').toLowerCase();

  return nodeEnv === 'production' || vercelEnv === 'production' || netlifyContext === 'production';
}

function normalizeHostCandidate(value?: string | null) {
  if (!value) return null;

  const firstValue = value
    .split(',')
    .map((item) => item.trim())
    .find(Boolean);
  if (!firstValue) return null;

  const candidate = firstValue.includes('://') ? firstValue : `https://${firstValue}`;
  try {
    return new URL(candidate).hostname.toLowerCase();
  } catch {
    const hostWithoutPath = firstValue.split('/')[0] ?? '';
    const hostWithoutPort = hostWithoutPath.split(':')[0] ?? '';
    return hostWithoutPort.toLowerCase() || null;
  }
}

function hasLockedProductionHost(options?: DemoModeOptions) {
  const requestHost = normalizeHostCandidate(options?.requestHost);
  if (requestHost && LOCKED_PRODUCTION_HOSTS.has(requestHost)) return true;

  const configuredHosts = [process.env.APP_BASE_URL, process.env.NEXTAUTH_URL, process.env.VERCEL_URL]
    .map((value) => normalizeHostCandidate(value))
    .filter((value): value is string => Boolean(value));

  return configuredHosts.some((host) => LOCKED_PRODUCTION_HOSTS.has(host));
}

export function isDemoModeEnabled(options: DemoModeOptions = {}) {
  if (process.env.DEMO_BYPASS_ENABLED !== 'true') return false;
  if (process.env.DEMO_MODE !== 'true') return false;
  if (hasLockedProductionHost(options)) return false;
  return !isProductionRuntime();
}

export function getDemoUserEmail() {
  return process.env.DEMO_USER_EMAIL ?? 'morgan.hale@astera.example';
}

export function getDemoTenantSlug() {
  return process.env.DEMO_TENANT_SLUG;
}
