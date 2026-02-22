import { SessionContext } from '@/lib/auth/session';

const roleWeight = {
  CLIENT_VIEWER: 0,
  VIEWER: 1,
  ANALYST: 2,
  ADMIN: 3
} as const;

export function requireRole(session: SessionContext, minimum: keyof typeof roleWeight) {
  if (roleWeight[session.role] < roleWeight[minimum]) {
    throw new Error(`Forbidden for role ${session.role}`);
  }
}
