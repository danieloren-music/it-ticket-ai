import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. נתיבים סטטיים וציבוריים מוחלטים
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

  // 2. זיהוי נתיבי ארגון: /[tenant], /[tenant]/users, /[tenant]/admins, /[tenant]/manage, /[tenant]/login
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return NextResponse.next();

  const rawTenant = segments[0];
  const routeTenant = rawTenant.toLowerCase();
  const subRoute = segments[1] || '';

  // דף הלוגין עצמו פתוח לגישה חופשית
  if (subRoute === 'login') {
    return NextResponse.next();
  }

  // 3. קריאה ופענוח של עוגיית ה-Session
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

  // 4. אכיפת הרשאות מלאה (RBAC):

  // נתיב הבסיס /[tenant]
  if (!subRoute) {
    if (!session || !isMatchingTenant) {
      return redirectToLogin(`/${rawTenant}/manage`);
    }
    return NextResponse.redirect(new URL(`/${rawTenant}/manage`, req.url));
  }

  // נתיב Manage: מנהל (Manager) בלבד
  if (subRoute === 'manage') {
    if (!session || !isMatchingTenant || session.role !== 'manager') {
      return redirectToLogin(pathname);
    }
  }

  // נתיב Admins: מנהל (Manager) או טכנאי (Admin)
  if (subRoute === 'admins') {
    if (!session || !isMatchingTenant || (session.role !== 'manager' && session.role !== 'admin')) {
      return redirectToLogin(pathname);
    }
  }

  // נתיב Users: משתמש מאומת (User, Admin, Manager)
  if (subRoute === 'users') {
    if (!session || !isMatchingTenant) {
      return redirectToLogin(pathname);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};