import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  PLATFORM_COOKIE,
  TENANT_COOKIE,
  PlatformSession,
  Role,
  TenantSession,
  cookieOptions,
  createPlatformToken,
  createTenantToken,
  readPlatformSession,
  readTenantSession,
} from './session';
import { forbidden, unauthorized, HttpError } from './http';
import { DEMO_TENANT, isOneOf, PLATFORM_READONLY_ROLES, PLATFORM_ROLES } from './constants';
import { db } from './db';

export const normalizeRole = (r: unknown): Role => {
  const value = String(r ?? '').trim().toLowerCase().replace(/[\s_-]+/g, ' ');
  if (['manager', 'administrator', 'organization admin', 'org admin'].includes(value)) return 'manager';
  if (['admin', 'technician', 'it technician', 'helpdesk', 'help desk', 'service desk'].includes(value)) return 'admin';
  return 'user';
};

export const dbRole = (r: Role) => (r === 'manager' ? 'Manager' : r === 'admin' ? 'Admin' : 'User');

/** Read the tenant session (or null) from a route-handler request. */
export async function getTenantSession(req: NextRequest): Promise<TenantSession | null> {
  return readTenantSession(req.cookies.get(TENANT_COOKIE)?.value);
}

/** Read the tenant session from a Server Component. */
export async function getTenantSessionFromCookies(): Promise<TenantSession | null> {
  const store = await cookies();
  return readTenantSession(store.get(TENANT_COOKIE)?.value);
}

interface GuardOptions {
  roles?: Role[];
  /** allow access while a forced password change is pending (change-password, me, logout) */
  allowMustChange?: boolean;
  /** reject demo sessions (read-only sandbox protection) */
  blockDemo?: boolean;
}

export async function requireTenant(req: NextRequest, opts: GuardOptions = {}): Promise<TenantSession> {
  const session = await getTenantSession(req);
  if (!session) throw unauthorized();
  if (session.demo && session.tenantId !== DEMO_TENANT) throw unauthorized();
  if (session.mcp && !opts.allowMustChange) {
    throw new HttpError(403, 'PASSWORD_CHANGE_REQUIRED', 'You must change your password before continuing');
  }
  if (!session.demo) {
    const client = db();
    const { data: tenant, error: tenantError } = await client
      .from('tenants')
      .select('status')
      .eq('id', session.tenantId)
      .maybeSingle();
    if (tenantError) throw new Error(`Could not validate tenant session: ${tenantError.message}`);
    if (!tenant || String(tenant.status).toLowerCase() === 'suspended') {
      throw new HttpError(403, 'TENANT_UNAVAILABLE', 'This organization is not available');
    }

    const { data: user, error: userError } = await client
      .from('tenant_users')
      .select('role, is_active')
      .eq('tenant_id', session.tenantId)
      .eq('email', session.sub)
      .maybeSingle();
    if (userError) throw new Error(`Could not validate user session: ${userError.message}`);
    if (!user) throw unauthorized();
    if (user.is_active === false) throw unauthorized();
    session.role = normalizeRole(user.role);
  }
  if (opts.roles && !opts.roles.includes(session.role)) throw forbidden();
  if (opts.blockDemo && session.demo) {
    throw new HttpError(403, 'DEMO_READONLY', 'This action is disabled in the public demo');
  }
  return session;
}

export async function requirePlatform(req: NextRequest, opts: { write?: boolean } = {}): Promise<PlatformSession> {
  const session = await readPlatformSession(req.cookies.get(PLATFORM_COOKIE)?.value);
  if (!session) throw unauthorized();
  const client = db();
  const { data: admin, error } = await client
    .from('platform_admins')
    .select('role')
    .eq('email', session.sub.toLowerCase())
    .maybeSingle();
  if (error) throw new Error(`Could not validate platform session: ${error.message}`);
  if (admin) {
    if (!isOneOf(PLATFORM_ROLES, admin.role)) throw unauthorized();
    session.role = admin.role;
  } else {
    const bootstrapEmail = process.env.PLATFORM_BOOTSTRAP_EMAIL?.trim().toLowerCase();
    const { count, error: countError } = await client
      .from('platform_admins')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'Super Admin');
    if (countError) throw new Error(`Could not validate bootstrap access: ${countError.message}`);
    if (session.sub.toLowerCase() !== bootstrapEmail || (count ?? 0) > 0) throw unauthorized();
  }
  if (opts.write && PLATFORM_READONLY_ROLES.has(session.role)) {
    throw forbidden('READ_ONLY_ROLE', 'Your platform role is read-only');
  }
  return session;
}

export async function attachTenantSession(
  res: NextResponse,
  data: Omit<TenantSession, 'typ' | 'iat' | 'exp'>
): Promise<void> {
  const { token, maxAge } = await createTenantToken(data);
  res.cookies.set(TENANT_COOKIE, token, cookieOptions(maxAge));
}

export async function attachPlatformSession(
  res: NextResponse,
  data: Omit<PlatformSession, 'typ' | 'iat' | 'exp'>
): Promise<void> {
  const { token, maxAge } = await createPlatformToken(data);
  res.cookies.set(PLATFORM_COOKIE, token, cookieOptions(maxAge));
}

/** Only allow same-site relative redirects. */
export function safeReturnTo(value: string | null | undefined, fallback: string): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return fallback;
  return value;
}

export function defaultLanding(tenant: string, role: Role): string {
  if (role === 'manager') return `/${tenant}/manage`;
  if (role === 'admin') return `/${tenant}/admins`;
  return `/${tenant}/self-service`;
}
