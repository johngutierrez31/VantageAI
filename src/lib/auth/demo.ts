export function isDemoModeEnabled() {
  return process.env.DEMO_MODE === 'true';
}

export function getDemoUserEmail() {
  return process.env.DEMO_USER_EMAIL ?? 'morgan.hale@astera.example';
}

export function getDemoTenantSlug() {
  return process.env.DEMO_TENANT_SLUG;
}
