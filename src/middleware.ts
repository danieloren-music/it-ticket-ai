import { NextRequest, NextResponse } from 'next/server';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. נתיבים פתוחים לחלוטין
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
    const routeTenant = match[1];
    const routeType = match[2] || 'root';

    // אם זה דף ההתחברות עצמו - תמיד לאפשר כניסה
    if (routeType === 'login') {
      return NextResponse.next();
    }

    // בדיקת קיום הארגון
    const origin = req.nextUrl.origin;
    const verifyRes = await fetch(`${origin}/api/tenants/verify?tenant=${routeTenant}`);

    if (!verifyRes.ok) {
      return new NextResponse('Tenant Not Found', { status: 404 });
    }

    // קריאת נתוני Session Cookie
    const sessionCookie = req.cookies.get('smartq_session')?.value;
    let session: { role: 'manager' | 'admin' | 'user'; tenantId: string; email: string } | null = null;

    if (sessionCookie) {
      try {
        session = JSON.parse(Buffer.from(sessionCookie, 'base64').toString('utf-8'));
      } catch {
        session = null;
      }
    }

    // 3. אכיפת הרשאות:
    // נתיב Manage: דורש הרשאת manager
    if (routeType === 'manage') {
      if (!session || session.tenantId !== routeTenant || session.role !== 'manager') {
        const loginUrl = new URL(`/${routeTenant}/login`, req.url);
        loginUrl.searchParams.set('returnTo', pathname);
        return NextResponse.redirect(loginUrl);
      }
    }

    // נתיב Admins: דורש הרשאת admin או manager
    if (routeType === 'admins') {
      if (
        !session ||
        session.tenantId !== routeTenant ||
        (session.role !== 'manager' && session.role !== 'admin')
      ) {
        const loginUrl = new URL(`/${routeTenant}/login`, req.url);
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