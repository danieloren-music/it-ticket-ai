import { NextRequest, NextResponse } from 'next/server';
import { route } from '@/lib/http';
import { getTenantSession } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { PLATFORM_COOKIE, TENANT_COOKIE } from '@/lib/session';

export const POST = route(async (req: NextRequest) => {
  const session = await getTenantSession(req);
  const res = NextResponse.json({ success: true });
  res.cookies.set(TENANT_COOKIE, '', { path: '/', maxAge: 0 });
  res.cookies.set(PLATFORM_COOKIE, '', { path: '/', maxAge: 0 });
  if (session) await audit({ tenantId: session.tenantId, actor: session.sub, role: session.role, action: 'auth.logout' });
  return res;
});
