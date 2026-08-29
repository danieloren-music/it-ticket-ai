import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. קבצים ונתיבים ציבוריים
  if (
    pathname.startsWith('/home') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/platform') ||
    pathname.startsWith('/smartq-logo.png') ||
    pathname.startsWith('/favicon.ico') ||
    pathname === '/'
  ) {
    return NextResponse.next();
  }

  // 2. בדיקת נתיבי Tenant
  const match = pathname.match(/^\/([^\/]+)(?:\/(manage|admins|users|login))?/);

  if (match) {
    const rawTenant = match[1];
    const routeTenant = rawTenant.toLowerCase();
    const routeType = match[2] || 'root';

    if (routeType === 'login') {
      return NextResponse.next();
    }

    const sessionCookie = req.cookies.get('smartq_session')?.value;
    let session: { role: 'manager' | 'admin' | 'user'; tenantId: string; email: string } | null = null;

    if (sessionCookie) {
      try {
        session = JSON.parse(Buffer.from(sessionCookie, 'base64').toString('utf-8'));
      } catch {
        session = null;
      }
    }

    const isMatchingTenant = session?.tenantId?.toLowerCase() === routeTenant;

    const redirectToLogin = () => {
      const loginUrl = new URL(`/${rawTenant}/login`, req.url);
      loginUrl.searchParams.set('returnTo', pathname);
      return NextResponse.redirect(loginUrl);
    };

    // אכיפת לוגין על כל נתיבי הארגון:
    if (routeType === 'manage') {
      if (!session || !isMatchingTenant || session.role !== 'manager') {
        return redirectToLogin();
      }
    }

    if (routeType === 'admins') {
      if (!session || !isMatchingTenant || (session.role !== 'manager' && session.role !== 'admin')) {
        return redirectToLogin();
      }
    }

    if (routeType === 'users' || routeType === 'root') {
      if (!session || !isMatchingTenant) {
        return redirectToLogin();
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};