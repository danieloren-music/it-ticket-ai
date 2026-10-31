import { NextRequest, NextResponse } from 'next/server';
import { route, readJson, rateLimit, clientIp, HttpError } from '@/lib/http';
import { attachTenantSession, defaultLanding } from '@/lib/auth';
import { DEMO_USERS, demoEnabled, ensureDemoTenant } from '@/lib/demo';
import { DEMO_TENANT } from '@/lib/constants';
import { audit } from '@/lib/audit';

/** Starts a short-lived, restricted session in the public sandbox organization. */
export const POST = route(async (req: NextRequest) => {
  if (!demoEnabled()) throw new HttpError(404, 'DEMO_DISABLED', 'Demo is disabled');
  rateLimit(`demo:start:${clientIp(req)}`, 30, 60 * 60_000);

  const body = await readJson(req);
  const key = body.role === 'admin' ? 'admin' : body.role === 'manager' ? 'manager' : 'user';
  const persona = DEMO_USERS[key];

  await ensureDemoTenant();

  const redirect = defaultLanding(DEMO_TENANT, key);
  const res = NextResponse.json({ success: true, redirect });
  await attachTenantSession(res, {
    sub: persona.email,
    name: persona.name,
    role: key,
    tenantId: DEMO_TENANT,
    demo: true,
    city: persona.site,
  });
  await audit({ tenantId: DEMO_TENANT, actor: persona.email, role: key, action: 'demo.started', ip: clientIp(req) });
  return res;
});
