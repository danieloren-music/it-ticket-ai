import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // נתיבים פתוחים (דף הבית, תמונות, API לוגין/קולבק)
  if (
    pathname.startsWith('/home') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/smartq-logo.png') ||
    pathname.startsWith('/favicon.ico') ||
    pathname === '/'
  ) {
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

  // בדיקת נתיבי ה-Tenant: /[tenant]/manage, /[tenant]/admins, /[tenant]/users
  const match = pathname.match(/^\/([^\/]+)\/(manage|admins|users)/);
  if (match) {
    const [, routeTenant, routeType] = match;

    // 1. נתיב Manage: רק מנהלים (Manager) מורשים
    if (routeType === 'manage') {
      if (!session || session.tenantId !== routeTenant || session.role !== 'manager') {
        const loginUrl = new URL('/api/auth/saml/login', req.url);
        loginUrl.searchParams.set('tenant', routeTenant);
        loginUrl.searchParams.set('returnTo', pathname);
        return NextResponse.redirect(loginUrl);
      }
    }

    // 2. נתיב Admins: מנהל (Manager) או טכנאי IT (Admin) מורשים
    if (routeType === 'admins') {
      if (
        !session ||
        session.tenantId !== routeTenant ||
        (session.role !== 'manager' && session.role !== 'admin')
      ) {
        const loginUrl = new URL('/api/auth/saml/login', req.url);
        loginUrl.searchParams.set('tenant', routeTenant);
        loginUrl.searchParams.set('returnTo', pathname);
        return NextResponse.redirect(loginUrl);
      }
    }

    // 3. נתיב Users: מורשה לכולם (Manager, Admin, User)
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};