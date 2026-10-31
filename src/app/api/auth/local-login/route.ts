import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { route, readJson, str, email, slug, rateLimit, clientIp, HttpError } from '@/lib/http';
import { hashPassword, verifyPassword } from '@/lib/password';
import { attachTenantSession, normalizeRole } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { DEMO_TENANT } from '@/lib/constants';

const MAX_FAILED = 5;
const LOCK_MINUTES = 15;

const invalid = () => new HttpError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');

export const POST = route(async (req: NextRequest) => {
  const ip = clientIp(req);
  const body = await readJson(req);
  const tenantId = slug(body.tenantSlug);
  const userEmail = email(body.email);
  const password = str(body.password, 128, { min: 1, trim: false, field: 'Password' });

  rateLimit(`login:ip:${ip}`, 30, 10 * 60_000);
  rateLimit(`login:acct:${tenantId}:${userEmail}`, 8, 10 * 60_000);

  // The public sandbox is only reachable through /api/demo/start
  if (tenantId === DEMO_TENANT) throw invalid();

  const client = db();
  const { data: tenant } = await client.from('tenants').select('id, status').eq('id', tenantId).maybeSingle();
  if (!tenant || String(tenant.status).toLowerCase() === 'suspended') throw invalid();

  const { data: user } = await client
    .from('tenant_users')
    .select('id, email, full_name, role, department, site_location, phone_number, password_hash, is_active, failed_attempts, locked_until, must_change_password')
    .eq('tenant_id', tenantId)
    .eq('email', userEmail)
    .maybeSingle();

  if (!user) {
    // Burn comparable CPU time so response timing does not reveal whether the account exists.
    await verifyPassword(password, 'scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=');
    await audit({ tenantId, actor: userEmail, action: 'auth.login_failed', meta: { reason: 'unknown_user' }, ip });
    throw invalid();
  }

  if (user.locked_until && new Date(user.locked_until).getTime() > Date.now()) {
    await audit({ tenantId, actor: userEmail, action: 'auth.login_blocked', meta: { reason: 'locked' }, ip });
    throw new HttpError(423, 'ACCOUNT_LOCKED', 'Account temporarily locked after repeated failed attempts. Try again later.');
  }

  const check = await verifyPassword(password, user.password_hash);
  if (!check.ok) {
    const attempts = (user.failed_attempts ?? 0) + 1;
    const lock = attempts >= MAX_FAILED;
    await client
      .from('tenant_users')
      .update({
        failed_attempts: lock ? 0 : attempts,
        locked_until: lock ? new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString() : null,
      })
      .eq('id', user.id);
    await audit({ tenantId, actor: userEmail, action: lock ? 'auth.account_locked' : 'auth.login_failed', meta: { attempts }, ip });
    throw invalid();
  }

  if (user.is_active === false) {
    throw new HttpError(403, 'ACCOUNT_DISABLED', 'This account has been disabled. Contact your administrator.');
  }

  const update: Record<string, unknown> = {
    failed_attempts: 0,
    locked_until: null,
    last_login_at: new Date().toISOString(),
  };
  if (check.needsRehash) update.password_hash = await hashPassword(password);
  await client.from('tenant_users').update(update).eq('id', user.id);

  const role = normalizeRole(user.role);
  const res = NextResponse.json({
    success: true,
    mustChangePassword: Boolean(user.must_change_password),
    user: { email: user.email, name: user.full_name, role },
  });
  await attachTenantSession(res, {
    sub: user.email,
    name: user.full_name || user.email.split('@')[0],
    role,
    tenantId,
    mcp: Boolean(user.must_change_password) || undefined,
    city: user.site_location || undefined,
    phone: user.phone_number || undefined,
  });
  await audit({ tenantId, actor: user.email, role, action: 'auth.login', ip });
  return res;
});
