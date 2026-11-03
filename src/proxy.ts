import { NextRequest, NextResponse } from 'next/server';
import { PLATFORM_COOKIE, TENANT_COOKIE, readPlatformSession, readTenantSession } from '@/lib/session';

/** Paths that never need a tenant/platform session. */
const PUBLIC_PREFIXES = ['/home', '/_next', '/api', '/icon', '/apple-icon', '/opengraph-image', '/twitter-image', '/robots.txt', '/sitemap.xml', '/smartq-'];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === '/') return NextResponse.redirect(new URL('/home', req.url));
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p)) || /\.[a-z0-9]+$/i.test(pathname)) {
    return NextResponse.next();
  }

  /* ───── Vendor platform ───── */
  if (pathname === '/platform' || pathname.startsWith('/platform/')) {
    if (pathname === '/platform/login') return NextResponse.next();
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

  // Role based page access
  const needs: Record<string, string[]> = {
    'self-service': ['user', 'admin', 'manager'],
    admins: ['admin', 'manager'],
    manage: ['manager'],
  };
  const allowed = needs[sub];
  if (!session || !sameTenant) return toLogin(pathname);
  if (allowed && !allowed.includes(session.role)) {
    return NextResponse.redirect(new URL(`/${tenant}/access-denied`, req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image).*)'],
};
