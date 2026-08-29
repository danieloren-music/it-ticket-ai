import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. נתיבים ציבוריים פתוחים לחלוטין
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

  // 2. זיהוי נתיבי ארגון: /[tenant]/manage, /[tenant]/admins, /[tenant]/users, /[tenant]/login
  const match = pathname.match(/^\/([^\/]+)(?:\/(manage|admins|users|login))?/);

  if (match) {
    const routeTenant = match[1].toLowerCase();
    const routeType = match[2] || 'root';

    // דף לוגין ופורטל משתמשים פתוחים לגישה
    if (routeType === 'login' || routeType === 'users' || routeType === 'root') {
      return NextResponse.next();
    }

    // קריאת עוגיית ה-Session
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

    // 3. אכיפת הרשאות:
    // נתיב Manage: רק מנהל (Manager) של אותו ארגון מורשה
    if (routeType === 'manage') {
      if (!session || !isMatchingTenant || session.role !== 'manager') {
        const loginUrl = new URL(`/${match[1]}/login`, req.url);
        loginUrl.searchParams.set('returnTo', pathname);
        return NextResponse.redirect(loginUrl);
      }
    }

    // נתיב Admins: מנהל או טכנאי IT של אותו ארגון מורשים
    if (routeType === 'admins') {
      if (
        !session ||
        !isMatchingTenant ||
        (session.role !== 'manager' && session.role !== 'admin')
      ) {
        const loginUrl = new URL(`/${match[1]}/login`, req.url);
        loginUrl.searchParams.set('returnTo', pathname);
        return NextResponse.redirect(loginUrl);
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};