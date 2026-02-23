export function isDemoModeEnabled() {
  return process.env.DEMO_MODE === 'true';
}

export function getDemoUserEmail() {
  return process.env.DEMO_USER_EMAIL ?? 'admin@vantageciso.local';
}

export function getDemoTenantSlug() {
  return process.env.DEMO_TENANT_SLUG;
}
