import { NextRequest, NextResponse } from 'next/server';
import { readPlatformSession, readTenantSession, PLATFORM_COOKIE, TENANT_COOKIE } from '@/lib/session';

/** Paths that never need a tenant/platform session. */
const PUBLIC_PREFIXES = ['/home', '/_next', '/api', '/icon', '/apple-icon', '/opengraph-image', '/twitter-image', '/robots.txt', '/sitemap.xml', '/smartq-'];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === '/') return NextResponse.redirect(new URL('/platform/login', req.url));
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p)) || /\.[a-z0-9]+$/i.test(pathname)) {
    return NextResponse.next();
  }

  /* ───── Vendor platform ───── */
  if (pathname === '/platform' || pathname.startsWith('/platform/')) {
    if (['/platform/login', '/platform/forgot-password', '/platform/reset-password'].includes(pathname)) {
      return NextResponse.next();
    }
    const platform = await readPlatformSession(req.cookies.get(PLATFORM_COOKIE)?.value);
    if (!platform) return NextResponse.redirect(new URL('/platform/login', req.url));
    return NextResponse.next();
  }

  /* ───── Tenant routes: /[tenant]/[page] ───── */
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return NextResponse.next();

  const rawTenant = segments[0];
  const tenant = rawTenant.toLowerCase();
  const sub = (segments[1] || '').toLowerCase();

  // Legacy / typo aliases
  if (sub === 'selfservice' || sub === 'new-request' || sub === 'users') {
    return NextResponse.redirect(new URL(`/${tenant}/self-service`, req.url));
  }
  // Legacy tenant-less shortcuts used to hard-code a single customer; send visitors to the main site instead.
  if (segments.length === 1 && ['selfservice', 'self-service', 'manage', 'admins'].includes(tenant)) {
    return NextResponse.redirect(new URL('/home', req.url));
  }

  if (sub === 'login' || sub === 'access-denied') return NextResponse.next();

  const session = await readTenantSession(req.cookies.get(TENANT_COOKIE)?.value);
  const sameTenant = session?.tenantId.toLowerCase() === tenant;

  // ✅ FIX: If the session belongs to a *different* tenant (global admin session bleed prevention),
  //    clear the tenant cookie and redirect to the target tenant's dedicated login.
  if (session && session.tenantId.toLowerCase() !== tenant) {
    const res = NextResponse.redirect(new URL(`/${tenant}/login`, req.url));
    res.cookies.set(TENANT_COOKIE, '', { path: '/', maxAge: 0 });
    return res;
  }

  const toLogin = (returnTo: string) => {
    const url = new URL(`/${tenant}/login`, req.url);
    url.searchParams.set('returnTo', returnTo);
    return NextResponse.redirect(url);
  };

  // /[tenant] → role-aware gateway
  if (!sub) {
    if (!session || !sameTenant) return toLogin(`/${tenant}/self-service`);
    const target = session.role === 'manager' ? 'manage' : session.role === 'admin' ? 'admins' : 'self-service';
    return NextResponse.redirect(new URL(`/${tenant}/${target}`, req.url));
  }

  // Role based page access — enforce clean tenant isolation.
  if (!session || !sameTenant) return toLogin(pathname);

  // Page access is a shell only; tenant-scoped API handlers enforce roles and group permissions.
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image).*)'],
};
