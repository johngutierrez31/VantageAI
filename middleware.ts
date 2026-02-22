import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

function isPublicApiRoute(pathname: string) {
  return pathname.startsWith('/api/auth') || pathname === '/api/stripe/webhook';
}

export default withAuth(
  function middleware(req) {
    const pathname = req.nextUrl.pathname;
    const token = req.nextauth.token;

    if (isPublicApiRoute(pathname)) {
      return NextResponse.next();
    }

    if (!token) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('callbackUrl', `${pathname}${req.nextUrl.search}`);
      return NextResponse.redirect(loginUrl);
    }

    if (!token.activeTenantId || !token.role) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'No active tenant membership' }, { status: 403 });
      }

      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('error', 'NoMembership');
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ req, token }) => {
        const pathname = req.nextUrl.pathname;

        if (isPublicApiRoute(pathname) || pathname === '/login') {
          return true;
        }

        if (pathname.startsWith('/app') || pathname.startsWith('/api')) {
          return !!token;
        }

        return true;
      }
    }
  }
);

export const config = {
  matcher: ['/app/:path*', '/api/:path*']
};
