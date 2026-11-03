import { NextRequest, NextResponse } from 'next/server';
import { db, must } from '@/lib/db';
import { route, readJson, str, email as emailField, bad, HttpError, clientIp } from '@/lib/http';
import { requireTenant } from '@/lib/auth';
import { generateTempPassword, hashPassword, passwordPolicyError } from '@/lib/password';
import { audit } from '@/lib/audit';
import { ROLES, isOneOf } from '@/lib/constants';

const COLUMNS =
  'id, email, full_name, role, job_title, department, site_location, phone_number, is_active, last_login_at, must_change_password, created_at';

/** Directory is manager-only. The tenant always comes from the signed session, never from the request. */
export const GET = route(async (req: NextRequest) => {
  const session = await requireTenant(req, { roles: ['manager'] });
  const users = must(
    await db().from('tenant_users').select(COLUMNS).eq('tenant_id', session.tenantId).order('created_at', { ascending: false }).limit(2000)
  );
  return NextResponse.json({ users: users ?? [] });
});

async function managerCount(tenantId: string): Promise<number> {
  const { count } = await db()
    .from('tenant_users')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('role', 'Manager')
    .eq('is_active', true);
  return count ?? 0;
}

/** Create or update a directory user. */
export const POST = route(async (req: NextRequest) => {
  const session = await requireTenant(req, { roles: ['manager'], blockDemo: true });
  const body = await readJson(req);

  const userEmail = emailField(body.email);
  const fullName = str(body.fullName, 120, { min: 2, field: 'Full name' });
  if (!isOneOf(ROLES, body.role)) throw bad('VALIDATION', 'Invalid role');
  const role = body.role;
  const fields = {
    full_name: fullName,
    role,
    job_title: str(body.jobTitle, 120) || 'Employee',
    department: str(body.department, 120) || 'General',
    site_location: str(body.siteLocation, 120) || 'Headquarters',
    phone_number: str(body.phoneNumber, 40),
    is_active: body.isActive === false ? false : true,
  };

  const { data: existing } = await db()
    .from('tenant_users')
    .select('id, role, is_active')
    .eq('tenant_id', session.tenantId)
    .eq('email', userEmail)
    .maybeSingle();

  // Never leave an organization without an active manager.
  if (existing && existing.role === 'Manager' && (role !== 'Manager' || fields.is_active === false)) {
    if ((await managerCount(session.tenantId)) <= 1) {
      throw new HttpError(409, 'LAST_MANAGER', 'The organization must keep at least one active manager');
    }
  }

  let tempPassword: string | undefined;
  let passwordHash: string | undefined;
  const providedPassword = typeof body.password === 'string' ? body.password : '';

  if (providedPassword) {
    if (passwordPolicyError(providedPassword)) {
      throw bad('WEAK_PASSWORD', 'Password must be at least 10 characters and include letters and digits');
    }
    passwordHash = await hashPassword(providedPassword);
  } else if (!existing) {
    tempPassword = generateTempPassword();
    passwordHash = await hashPassword(tempPassword);
  }

  if (existing) {
    const patch: Record<string, unknown> = { ...fields, updated_at: new Date().toISOString() };
    if (passwordHash) {
      patch.password_hash = passwordHash;
      patch.must_change_password = true;
      patch.failed_attempts = 0;
      patch.locked_until = null;
    }
    const user = must(await db().from('tenant_users').update(patch)
      .eq('tenant_id', session.tenantId).eq('id', existing.id).select(COLUMNS).single());
    await audit({
      tenantId: session.tenantId, actor: session.sub, role: session.role, action: 'user.updated',
      target: userEmail, meta: { role, active: fields.is_active, passwordReset: Boolean(passwordHash) }, ip: clientIp(req),
    });
    return NextResponse.json({ success: true, user });
  }

  const user = must(
    await db()
      .from('tenant_users')
      .insert({ tenant_id: session.tenantId, email: userEmail, password_hash: passwordHash, must_change_password: true, ...fields })
      .select(COLUMNS)
      .single()
  );
  await audit({
    tenantId: session.tenantId, actor: session.sub, role: session.role, action: 'user.created',
    target: userEmail, meta: { role }, ip: clientIp(req),
  });
  // The one-time password is returned exactly once and is never stored in clear text.
  return NextResponse.json({ success: true, user, tempPassword }, { status: 201 });
});

export const DELETE = route(async (req: NextRequest) => {
  const session = await requireTenant(req, { roles: ['manager'], blockDemo: true });
  const target = emailField(req.nextUrl.searchParams.get('email'));

  if (target === session.sub.toLowerCase()) {
    throw new HttpError(409, 'CANNOT_DELETE_SELF', 'You cannot delete your own account');
  }
  const { data: existing } = await db()
    .from('tenant_users').select('id, role').eq('tenant_id', session.tenantId).eq('email', target).maybeSingle();
  if (!existing) throw new HttpError(404, 'NOT_FOUND', 'User not found');
  if (existing.role === 'Manager' && (await managerCount(session.tenantId)) <= 1) {
    throw new HttpError(409, 'LAST_MANAGER', 'The organization must keep at least one active manager');
  }

  must(await db().from('tenant_users').delete()
    .eq('tenant_id', session.tenantId).eq('id', existing.id).select('id'));
  await audit({ tenantId: session.tenantId, actor: session.sub, role: session.role, action: 'user.deleted', target, ip: clientIp(req) });
  return NextResponse.json({ success: true });
});
