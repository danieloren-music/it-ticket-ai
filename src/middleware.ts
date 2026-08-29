import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. נתיבים סטטיים וציבוריים
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

  // 2. זיהוי נתיבי ארגון
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return NextResponse.next();

  const rawTenant = segments[0];
  const routeTenant = rawTenant.toLowerCase();
  const subRoute = segments[1] || '';

  // דפי Login ו-Access-Denied פתוחים
  if (subRoute === 'login' || subRoute === 'access-denied') {
    return NextResponse.next();
  }

  // הפניה אחורית עבור /users ישן אל /new-request
  if (subRoute === 'users') {
    return NextResponse.redirect(new URL(`/${rawTenant}/new-request`, req.url));
  }

  // 3. פענוח עוגיית Session
  const sessionCookie = req.cookies.get('smartq_session')?.value;
  let session: { role?: 'manager' | 'admin' | 'user'; tenantId?: string; email?: string } | null = null;

  if (sessionCookie) {
    try {
      session = JSON.parse(Buffer.from(sessionCookie, 'base64').toString('utf-8'));
    } catch {
      session = null;
    }
  }

  const isMatchingTenant = session?.tenantId?.toLowerCase() === routeTenant;

  const redirectToLogin = (targetPath: string) => {
    const loginUrl = new URL(`/${rawTenant}/login`, req.url);
    loginUrl.searchParams.set('returnTo', targetPath);
    return NextResponse.redirect(loginUrl);
  };

  const redirectToAccessDenied = () => {
    return NextResponse.redirect(new URL(`/${rawTenant}/access-denied`, req.url));
  };

  // 4. אכיפת הרשאות:

  // נתיב הבסיס /[tenant] -> מפנה ישירות ל-new-request
  if (!subRoute) {
    if (!session || !isMatchingTenant) {
      return redirectToLogin(`/${rawTenant}/new-request`);
    }
    return NextResponse.redirect(new URL(`/${rawTenant}/new-request`, req.url));
  }

  // נתיב new-request: דורש משתמש מחובר (User / Admin / Manager)
  if (subRoute === 'new-request') {
    if (!session || !isMatchingTenant) {
      return redirectToLogin(pathname);
    }
  }

  // נתיב admins: דורש טכנאי או מנהל (Admin / Manager)
  if (subRoute === 'admins') {
    if (!session || !isMatchingTenant) {
      return redirectToLogin(pathname);
    }
    if (session.role !== 'manager' && session.role !== 'admin') {
      return redirectToAccessDenied();
    }
  }

  // נתיב manage: דורש מנהל בלבד (Manager)
  if (subRoute === 'manage') {
    if (!session || !isMatchingTenant) {
      return redirectToLogin(pathname);
    }
    if (session.role !== 'manager') {
      return redirectToAccessDenied();
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};