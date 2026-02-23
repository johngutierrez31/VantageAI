import { SessionContext } from '@/lib/auth/session';

const roleWeight = {
  VIEWER: 0,
  MEMBER: 1,
  ADMIN: 2,
  OWNER: 3
} as const;

export function requireRole(session: SessionContext, minimum: keyof typeof roleWeight) {
  if (roleWeight[session.role] < roleWeight[minimum]) {
    throw new Error(`Forbidden for role ${session.role}`);
  }
}

