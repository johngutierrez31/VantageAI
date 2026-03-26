import { NextResponse, type NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { WorkspaceMode } from '@prisma/client';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const AUTH_PATH_PREFIX = '/api/auth';
const SETTINGS_PATH_PREFIX = '/app/settings';
const DEMO_REDIRECT_PATH = '/app/tools?mode=demo';

type TokenMembership = {
  tenantId?: string;
  workspaceMode?: WorkspaceMode;
};

function resolveWorkspaceModeFromToken(token: unknown): WorkspaceMode | null {
  if (!token || typeof token !== 'object') return null;

  const activeTenantWorkspaceMode = (token as { activeTenantWorkspaceMode?: WorkspaceMode }).activeTenantWorkspaceMode;
  if (activeTenantWorkspaceMode) return activeTenantWorkspaceMode;

  const activeTenantId = (token as { activeTenantId?: string }).activeTenantId;
  const memberships = (token as { memberships?: TokenMembership[] }).memberships;
  if (!activeTenantId || !Array.isArray(memberships)) return null;

  const match = memberships.find((membership) => membership.tenantId === activeTenantId);
  return match?.workspaceMode ?? null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith('/api') && !pathname.startsWith(SETTINGS_PATH_PREFIX)) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET
  });
  const workspaceMode = resolveWorkspaceModeFromToken(token);
  const anonymousDemoSession = process.env.DEMO_MODE === 'true' && !token;
  const demoWorkspace = workspaceMode === 'DEMO' || anonymousDemoSession;

  if (pathname.startsWith(SETTINGS_PATH_PREFIX) && demoWorkspace) {
    return NextResponse.redirect(new URL(DEMO_REDIRECT_PATH, request.url));
  }

  if (!pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  if (!MUTATING_METHODS.has(request.method) || pathname.startsWith(AUTH_PATH_PREFIX)) {
    return NextResponse.next();
  }

  if (demoWorkspace) {
    return NextResponse.json(
      {
        error:
          'Demo workspace is read-only. Sign in to a trial or paid workspace to create, edit, or publish records.'
      },
      { status: 403 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*', '/app/settings/:path*']
};

