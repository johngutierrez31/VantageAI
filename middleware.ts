import { NextResponse, type NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { WorkspaceMode } from '@prisma/client';
import { isDemoModeEnabled } from './src/lib/auth/demo';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const AUTH_PATH_PREFIX = '/api/auth';
const SETTINGS_PATH_PREFIX = '/app/settings';
const DEMO_REDIRECT_PATH = '/app/tools?mode=demo';

type TokenMembership = {
  tenantId?: string;
  workspaceMode?: WorkspaceMode;
};

type TokenShape = {
  activeTenantId?: string;
  activeTenantWorkspaceMode?: WorkspaceMode;
  role?: string;
  memberships?: TokenMembership[];
};

function isPublicApiRoute(pathname: string) {
  return pathname.startsWith(AUTH_PATH_PREFIX) || pathname === '/api/stripe/webhook';
}

function resolveWorkspaceModeFromToken(token: unknown): WorkspaceMode | null {
  if (!token || typeof token !== 'object') return null;

  const castToken = token as TokenShape;
  if (castToken.activeTenantWorkspaceMode) return castToken.activeTenantWorkspaceMode;
  if (!castToken.activeTenantId || !Array.isArray(castToken.memberships)) return null;

  const membership = castToken.memberships.find((item) => item.tenantId === castToken.activeTenantId);
  return membership?.workspaceMode ?? null;
}

function hasTenantMembership(token: unknown) {
  if (!token || typeof token !== 'object') return false;
  const castToken = token as TokenShape;
  return Boolean(castToken.activeTenantId && castToken.role);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith('/api') && !pathname.startsWith('/app')) {
    return NextResponse.next();
  }

  if (isPublicApiRoute(pathname)) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET
  });

  const anonymousDemoSession = isDemoModeEnabled({ requestHost: request.nextUrl.hostname }) && !token;
  const workspaceMode = resolveWorkspaceModeFromToken(token);
  const demoWorkspace = workspaceMode === 'DEMO' || anonymousDemoSession;

  if (!token && !anonymousDemoSession) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (token && !hasTenantMembership(token)) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'No active tenant membership' }, { status: 403 });
    }

    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('error', 'NoMembership');
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith(SETTINGS_PATH_PREFIX) && demoWorkspace) {
    return NextResponse.redirect(new URL(DEMO_REDIRECT_PATH, request.url));
  }

  if (pathname.startsWith('/api/') && MUTATING_METHODS.has(request.method) && demoWorkspace) {
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
  matcher: ['/app/:path*', '/api/:path*']
};
