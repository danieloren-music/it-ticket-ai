import { NextRequest, NextResponse } from 'next/server';
import { route } from '@/lib/http';
import { getTenantSession } from '@/lib/auth';
import { db } from '@/lib/db';

/** Session + tenant branding for the signed-in user. Cookie is httpOnly, so the UI reads it here. */
export const GET = route(async (req: NextRequest) => {
  const session = await getTenantSession(req);
  if (!session) return NextResponse.json({ session: null }, { status: 401 });

  const { data: tenant } = await db().from('tenants').select('id, name, domain').eq('id', session.tenantId).maybeSingle();

  return NextResponse.json({
    session: {
      email: session.sub,
      name: session.name,
      role: session.role,
      tenantId: session.tenantId,
      demo: Boolean(session.demo),
      mustChangePassword: Boolean(session.mcp),
      city: session.city ?? '',
      phone: session.phone ?? '',
    },
    tenant: tenant ?? { id: session.tenantId, name: session.tenantId, domain: '' },
  });
});
