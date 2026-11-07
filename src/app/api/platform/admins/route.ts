import { NextRequest, NextResponse } from 'next/server';
import { db, must } from '@/lib/db';
import { route, readJson, str, email, bad, HttpError, clientIp } from '@/lib/http';
import { attachPlatformSession, requirePlatform } from '@/lib/auth';
import { generateTempPassword, hashPassword, passwordPolicyError, randomToken, verifyPassword } from '@/lib/password';
import { audit } from '@/lib/audit';
import { PLATFORM_ROLES, isOneOf } from '@/lib/constants';

const COLS = 'id, email, full_name, role, department, sso_only, last_login_at, created_at';

export const GET = route(async (req: NextRequest) => {
  await requirePlatform(req);
  const admins = must(await db().from('platform_admins').select(COLS).order('created_at', { ascending: false }));
  return NextResponse.json({ admins: admins ?? [] });
});

/**
 * Create / update a platform user.
 * - Super Admins manage everyone.
 * - Anyone may update their own name/department/password (password needs the current one); never their own role.
 */
export const POST = route(async (req: NextRequest) => {
  const session = await requirePlatform(req, { write: true });
  const body = await readJson(req);

  const target = email(body.email);
  const self = target === session.sub.toLowerCase();
  if (!self && session.role !== 'Super Admin') throw new HttpError(403, 'FORBIDDEN', 'Only a Super Admin can manage platform users');

  const fullName = str(body.fullName, 120, { min: 2, field: 'Full name' });
  const department = str(body.department, 120) || 'Cloud Operations';

  const { data: existing } = await db().from('platform_admins').select('*').eq('email', target).maybeSingle();

  let role = existing?.role ?? session.role;
  if (!self || !existing) {
    if (!isOneOf(PLATFORM_ROLES, body.role)) throw bad('VALIDATION', 'Invalid role');
    role = body.role;
  }
  if (self && existing && body.role && body.role !== existing.role) {
    throw new HttpError(403, 'FORBIDDEN', 'You cannot change your own role');
  }

  const newPassword0 = typeof body.password === 'string' ? body.password : '';
  // The env-based bootstrap operator has no DB row; never create one implicitly (it would shadow the env login).
  if (self && !existing && !newPassword0) return NextResponse.json({ success: true, admin: null });

  let passwordHash: string | undefined;
  let tempPassword: string | undefined;
  const newPassword = typeof body.password === 'string' ? body.password : '';
  const ssoOnly = body.ssoOnly === true;

  if (newPassword) {
    if (passwordPolicyError(newPassword)) throw bad('WEAK_PASSWORD', 'Password must be at least 10 characters and include letters and digits');
    if (self && existing) {
      const current = str(body.currentPassword, 128, { min: 1, trim: false, field: 'Current password' });
      if (!(await verifyPassword(current, existing.password_hash)).ok) throw new HttpError(401, 'INVALID_CREDENTIALS', 'Current password is incorrect');
    }
    passwordHash = await hashPassword(newPassword);
  } else if (!existing) {
    if (!ssoOnly) tempPassword = generateTempPassword();
    passwordHash = await hashPassword(tempPassword ?? randomToken(32));
  }

  if (existing) {
    const patch: Record<string, unknown> = { full_name: fullName, role, department, updated_at: new Date().toISOString() };
    if (passwordHash) {
      patch.password_hash = passwordHash;
      patch.password_changed_at = new Date().toISOString();
      patch.failed_attempts = 0;
      patch.locked_until = null;
    }
    const admin = must(await db().from('platform_admins').update(patch).eq('id', existing.id).select(COLS).single());
    if (!admin) throw new Error('Platform user update returned no user');
    if (passwordHash) {
      must(await db().from('platform_password_resets').delete().eq('admin_email', target));
    }
    await audit({ actor: session.sub, role: session.role, action: 'platform.user_updated', target, meta: { role }, ip: clientIp(req) });
    const res = NextResponse.json({ success: true, admin });
    if (self && passwordHash) {
      await attachPlatformSession(res, { sub: admin.email, name: admin.full_name, role: admin.role });
    }
    return res;
  }

  const admin = must(
    await db().from('platform_admins').insert({ email: target, password_hash: passwordHash, full_name: fullName, role, department, sso_only: ssoOnly }).select(COLS).single()
  );
  await audit({ actor: session.sub, role: session.role, action: 'platform.user_created', target, meta: { role, ssoOnly }, ip: clientIp(req) });
  return NextResponse.json({ success: true, admin, tempPassword }, { status: 201 });
});

export const DELETE = route(async (req: NextRequest) => {
  const session = await requirePlatform(req, { write: true });
  if (session.role !== 'Super Admin') throw new HttpError(403, 'FORBIDDEN', 'Only a Super Admin can delete platform users');
  const target = email(req.nextUrl.searchParams.get('email'));
  if (target === session.sub.toLowerCase()) throw new HttpError(409, 'CANNOT_DELETE_SELF', 'You cannot delete your own account');

  must(await db().from('platform_password_resets').delete().eq('admin_email', target));
  must(await db().from('platform_admins').delete().eq('email', target).select('id'));
  await audit({ actor: session.sub, role: session.role, action: 'platform.user_deleted', target, ip: clientIp(req) });
  return NextResponse.json({ success: true });
});
