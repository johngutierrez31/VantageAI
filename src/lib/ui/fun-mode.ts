export const FUN_MODE_COOKIE = 'vantage_fun_mode';
export const FUN_MODE_STORAGE_KEY = 'vantage_fun_mode';
export const HIT_COUNTER_STORAGE_KEY = 'vantage_fun_hits';
export const DEFAULT_FUN_HIT_COUNT = 1337000;

const RETRO_ROUTE_LABELS = [
  ['/app/command-center', 'Command Center'],
  ['/app/pulse', 'Pulse'],
  ['/app/ai-governance', 'AI Governance'],
  ['/app/response-ops', 'Response Ops'],
  ['/app/trust', 'TrustOps'],
  ['/app/questionnaires', 'Questionnaires'],
  ['/app/copilot', 'Copilot'],
  ['/app/security-analyst', 'Security Analyst'],
  ['/app/cyber-range', 'Cyber Range'],
  ['/app/runbooks', 'Runbooks'],
  ['/app/policies', 'Policies'],
  ['/app/settings', 'Settings']
] as const;

export function parseFunModePreference(value: string | null | undefined): boolean | null {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return null;
}

export function getStoredFunHitCount(
  value: string | null | undefined,
  fallback = DEFAULT_FUN_HIT_COUNT
): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function getNextFunHitCount(
  value: string | null | undefined,
  fallback = DEFAULT_FUN_HIT_COUNT
): number {
  return getStoredFunHitCount(value, fallback) + 1;
}

export function formatRetroHitCount(count: number): string {
  return String(count).padStart(7, '0');
}

export function getRetroRouteLabel(pathname: string | null | undefined): string {
  if (!pathname) return 'Security Console';

  const matchedRoute = RETRO_ROUTE_LABELS.find(([route]) => pathname === route || pathname.startsWith(`${route}/`));
  return matchedRoute?.[1] ?? 'Security Console';
}
