function isProductionRuntime() {
  const nodeEnv = (process.env.NODE_ENV ?? '').toLowerCase();
  const vercelEnv = (process.env.VERCEL_ENV ?? '').toLowerCase();
  const netlifyContext = (process.env.CONTEXT ?? '').toLowerCase();

  return nodeEnv === 'production' || vercelEnv === 'production' || netlifyContext === 'production';
}

export function isDemoModeEnabled() {
  if (process.env.DEMO_BYPASS_ENABLED !== 'true') return false;
  if (process.env.DEMO_MODE !== 'true') return false;
  return !isProductionRuntime();
}

export function getDemoUserEmail() {
  return process.env.DEMO_USER_EMAIL ?? 'morgan.hale@astera.example';
}

export function getDemoTenantSlug() {
  return process.env.DEMO_TENANT_SLUG;
}
