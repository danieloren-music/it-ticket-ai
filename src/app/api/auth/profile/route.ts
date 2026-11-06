import { NextRequest, NextResponse } from 'next/server';
import { audit } from '@/lib/audit';
import { requireTenant } from '@/lib/auth';
import { db, must } from '@/lib/db';
import { clientIp, HttpError, readJson, route, str } from '@/lib/http';

export const PATCH = route(async (req: NextRequest) => {
  const session = await requireTenant(req);
  if (session.demo) throw new HttpError(403, 'DEMO_READONLY', 'Profile changes are disabled in the public demo');
  const body = await readJson(req);
  const fullName = str(body.fullName, 120, { min: 2, field: 'Full name' });
  const user = must(await db().from('tenant_users')
    .update({ full_name: fullName, updated_at: new Date().toISOString() })
    .eq('tenant_id', session.tenantId)
    .eq('email', session.sub.toLowerCase())
    .select('full_name')
    .single());
  if (!user) throw new Error('Profile update returned no user');
  await audit({ tenantId: session.tenantId, actor: session.sub, role: session.role, action: 'user.profile_updated', ip: clientIp(req) });
  return NextResponse.json({ success: true, name: user.full_name });
});
