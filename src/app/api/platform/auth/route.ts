import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual, createHash } from 'node:crypto';
import { db } from '@/lib/db';
import { route, readJson, str, email, rateLimit, clientIp, HttpError } from '@/lib/http';
import { attachPlatformSession } from '@/lib/auth';
import { hashPassword, verifyPassword } from '@/lib/password';
import { audit } from '@/lib/audit';
import { PLATFORM_COOKIE, readPlatformSession } from '@/lib/session';

const MAX_FAILED = 5;
const LOCK_MINUTES = 15;
const sha = (v: string) => createHash('sha256').update(v).digest();
const invalid = () => new HttpError(401, 'INVALID_CREDENTIALS', 'Invalid vendor credentials');

/** Who am I (platform console reads the httpOnly cookie through this). */
export const GET = route(async (req: NextRequest) => {
  const s = await readPlatformSession(req.cookies.get(PLATFORM_COOKIE)?.value);
  if (!s) return NextResponse.json({ admin: null }, { status: 401 });
  const { data } = await db().from('platform_admins').select('department').eq('email', s.sub.toLowerCase()).maybeSingle();
  return NextResponse.json({ admin: { email: s.sub, name: s.name, role: s.role, department: data?.department ?? '' } });
});

export const POST = route(async (req: NextRequest) => {
  const ip = clientIp(req);
  const body = await readJson(req);
  const userEmail = email(body.email);
  const password = str(body.password, 128, { min: 1, trim: false, field: 'Password' });

  rateLimit(`platform:login:ip:${ip}`, 15, 10 * 60_000);
  rateLimit(`platform:login:acct:${userEmail}`, 6, 10 * 60_000);

  const { data: admin } = await db().from('platform_admins').select('*').eq('email', userEmail).maybeSingle();

  let identity: { email: string; name: string; role: string } | null = null;

  if (admin) {
    if (admin.locked_until && new Date(admin.locked_until).getTime() > Date.now()) {
      throw new HttpError(423, 'ACCOUNT_LOCKED', 'Account temporarily locked. Try again later.');
    }
    const check = await verifyPassword(password, admin.password_hash);
    if (!check.ok) {
      const attempts = (admin.failed_attempts ?? 0) + 1;
      const lock = attempts >= MAX_FAILED;
      await db().from('platform_admins').update({
        failed_attempts: lock ? 0 : attempts,
        locked_until: lock ? new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString() : null,
      }).eq('id', admin.id);
      await audit({ actor: userEmail, action: lock ? 'platform.account_locked' : 'platform.login_failed', ip });
      throw invalid();
    }
    const update: Record<string, unknown> = { failed_attempts: 0, locked_until: null, last_login_at: new Date().toISOString() };
    if (check.needsRehash) update.password_hash = await hashPassword(password);
    await db().from('platform_admins').update(update).eq('id', admin.id);
    identity = { email: admin.email, name: admin.full_name, role: admin.role };
  } else {
    // Bootstrap operator defined in environment variables (first-run access).
    const bootEmail = process.env.PLATFORM_BOOTSTRAP_EMAIL?.trim().toLowerCase();
    const bootPass = process.env.PLATFORM_BOOTSTRAP_PASSWORD;
    const ok = Boolean(bootEmail && bootPass && bootEmail === userEmail && timingSafeEqual(sha(password), sha(bootPass)));
    if (!ok) {
      await verifyPassword(password, 'scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=');
      await audit({ actor: userEmail, action: 'platform.login_failed', meta: { reason: 'unknown_user' }, ip });
      throw invalid();
    }
    identity = { email: userEmail, name: userEmail.split('@')[0], role: 'Super Admin' };
  }

  const res = NextResponse.json({ success: true, admin: identity });
  await attachPlatformSession(res, { sub: identity.email, name: identity.name, role: identity.role });
  await audit({ actor: identity.email, role: identity.role, action: 'platform.login', ip });
  return res;
});

export const DELETE = route(async () => {
  const res = NextResponse.json({ success: true });
  res.cookies.set(PLATFORM_COOKIE, '', { path: '/', maxAge: 0 });
  return res;
});
