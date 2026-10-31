import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { route, readJson, str, bad, HttpError, rateLimit, clientIp } from '@/lib/http';
import { requireTenant, attachTenantSession } from '@/lib/auth';
import { hashPassword, verifyPassword, passwordPolicyError } from '@/lib/password';
import { audit } from '@/lib/audit';

export const POST = route(async (req: NextRequest) => {
  const session = await requireTenant(req, { allowMustChange: true, blockDemo: true });
  const body = await readJson(req);
  rateLimit(`pwchange:${session.tenantId}:${session.sub}`, 10, 15 * 60_000);

  const current = str(body.currentPassword, 128, { min: 1, trim: false, field: 'Current password' });
  const next = str(body.newPassword, 128, { min: 1, trim: false, field: 'New password' });
  if (passwordPolicyError(next)) {
    throw bad('WEAK_PASSWORD', 'Password must be at least 10 characters and include letters and digits');
  }
  if (next === current) throw bad('SAME_PASSWORD', 'New password must be different from the current one');

  const { data: user } = await db()
    .from('tenant_users')
    .select('id, password_hash, full_name, site_location, phone_number')
    .eq('tenant_id', session.tenantId)
    .eq('email', session.sub)
    .maybeSingle();
  if (!user) throw new HttpError(404, 'NOT_FOUND', 'Local account not found (SSO users manage their password in the identity provider)');

  const check = await verifyPassword(current, user.password_hash);
  if (!check.ok) throw new HttpError(401, 'INVALID_CREDENTIALS', 'Current password is incorrect');

  await db()
    .from('tenant_users')
    .update({ password_hash: await hashPassword(next), must_change_password: false, updated_at: new Date().toISOString() })
    .eq('id', user.id);

  await audit({ tenantId: session.tenantId, actor: session.sub, role: session.role, action: 'auth.password_changed', ip: clientIp(req) });

  const res = NextResponse.json({ success: true });
  await attachTenantSession(res, {
    sub: session.sub, name: session.name, role: session.role, tenantId: session.tenantId,
    city: session.city, phone: session.phone,
  });
  return res;
});
