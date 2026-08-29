import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. נתיבים פתוחים לחלוטין (אתר ראשי, קבצים סטטיים, פלטפורמה, ו-API)
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

  // 2. זיהוי נתיב Tenant: /[tenant]/manage, /[tenant]/admins, /[tenant]/users, /[tenant]/login
  const match = pathname.match(/^\/([^\/]+)(?:\/(manage|admins|users|login))?/);

  if (match) {
    const rawTenant = match[1];
    const routeTenant = rawTenant.toLowerCase();
    const routeType = match[2] || 'root';

    // דף הלוגין עצמו פתוח לגישה
    if (routeType === 'login') {
      return NextResponse.next();
    }

    // קריאת עוגיית Session
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

    // הפניה ללוגין אם אין Session מאומת לאותו ארגון
    const redirectToLogin = () => {
      const loginUrl = new URL(`/${rawTenant}/login`, req.url);
      loginUrl.searchParams.set('returnTo', pathname);
      return NextResponse.redirect(loginUrl);
    };

    // 3. אכיפת הרשאות (RBAC):
    
    // נתיב Manage: רק מנהל (Manager) מורשה
    if (routeType === 'manage') {
      if (!session || !isMatchingTenant || session.role !== 'manager') {
        return redirectToLogin();
      }
    }

    // נתיב Admins: מנהל או טכנאי IT מורשים
    if (routeType === 'admins') {
      if (
        !session ||
        !isMatchingTenant ||
        (session.role !== 'manager' && session.role !== 'admin')
      ) {
        return redirectToLogin();
      }
    }

    // נתיב Users: דורש הזדהות מול Entra ID / כניסה מקומית (User, Admin, Manager)
    if (routeType === 'users') {
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