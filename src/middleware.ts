import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Root redirect to /home
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/home', req.url));
  }

  // 2. Static and Public files
  if (
    pathname.startsWith('/home') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/smartq-logo.png') ||
    pathname.startsWith('/favicon.ico')
  ) {
    return NextResponse.next();
  }

  // 3. Vendor Platform Lock
  if (pathname.startsWith('/platform')) {
    if (pathname === '/platform/login') {
      return NextResponse.next();
    }
    const platformCookie = req.cookies.get('smartq_platform_session')?.value;
    if (!platformCookie) {
      return NextResponse.redirect(new URL('/platform/login', req.url));
    }
    try {
      const parsed = JSON.parse(Buffer.from(platformCookie, 'base64').toString('utf-8'));
      if (!parsed.isPlatformAdmin) {
        return NextResponse.redirect(new URL('/platform/login', req.url));
      }
    } catch {
      return NextResponse.redirect(new URL('/platform/login', req.url));
    }
    return NextResponse.next();
  }

  // 4. Root endpoints without tenant slug
  if (pathname === '/selfservice' || pathname === '/self-service') {
    return NextResponse.redirect(new URL('/rafael/self-service', req.url));
  }
  if (pathname === '/manage') {
    return NextResponse.redirect(new URL('/rafael/manage', req.url));
  }
  if (pathname === '/admins') {
    return NextResponse.redirect(new URL('/rafael/admins', req.url));
  }

  // 5. Tenant Sub-Routes Processing
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return NextResponse.next();

  const rawTenant = segments[0];
  const routeTenant = rawTenant.toLowerCase();
  const subRoute = (segments[1] || '').toLowerCase();

  // Redirect legacy or typo routes
  if (subRoute === 'selfservice' || subRoute === 'new-request' || subRoute === 'users') {
    return NextResponse.redirect(new URL(`/${rawTenant}/self-service`, req.url));
  }

  // Open pages
  if (subRoute === 'login' || subRoute === 'access-denied') {
    return NextResponse.next();
  }

  // 6. Decode Tenant Session
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

  // 7. Intelligent Tenant Root Gateway: /[tenant]
  if (!subRoute) {
    if (!session || !isMatchingTenant) {
      return redirectToLogin(`/${rawTenant}/self-service`);
    }
    if (session.role === 'manager') {
      return NextResponse.redirect(new URL(`/${rawTenant}/manage`, req.url));
    }
    if (session.role === 'admin') {
      return NextResponse.redirect(new URL(`/${rawTenant}/admins`, req.url));
    }
    return NextResponse.redirect(new URL(`/${rawTenant}/self-service`, req.url));
  }

  // 8. RBAC Page Enforcements
  if (subRoute === 'self-service') {
    if (!session || !isMatchingTenant) {
      return redirectToLogin(pathname);
    }
  }

  if (subRoute === 'admins') {
    if (!session || !isMatchingTenant) {
      return redirectToLogin(pathname);
    }
    if (session.role !== 'manager' && session.role !== 'admin') {
      return redirectToAccessDenied();
    }
  }

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