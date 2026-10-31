import { NextRequest, NextResponse } from 'next/server';
import { db, must } from '@/lib/db';
import { route, readJson, str, baseUrl, bad, clientIp } from '@/lib/http';
import { requireTenant } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { spAcsUrl, spEntityId } from '@/lib/saml';

const COLS = 'saml_login_url, saml_idp_cert, saml_group_managers_id, saml_group_admins_id, saml_group_users_id';

/** SSO configuration for the signed-in manager's own organization. */
export const GET = route(async (req: NextRequest) => {
  const session = await requireTenant(req, { roles: ['manager'] });
  const { data } = await db().from('tenant_settings').select(COLS).eq('tenant_id', session.tenantId).maybeSingle();
  const origin = baseUrl(req);
  return NextResponse.json({
    settings: {
      saml_login_url: data?.saml_login_url ?? '',
      saml_idp_cert: data?.saml_idp_cert ?? '',
      saml_group_managers_id: data?.saml_group_managers_id ?? '',
      saml_group_admins_id: data?.saml_group_admins_id ?? '',
      saml_group_users_id: data?.saml_group_users_id ?? '',
    },
    sp: { entityId: spEntityId(origin), acsUrl: spAcsUrl(origin) },
  });
});

function normalizeCert(raw: string): string {
  const body = raw.replace(/-----(BEGIN|END) CERTIFICATE-----/g, '').replace(/\s+/g, '');
  if (!body) return '';
  if (!/^[A-Za-z0-9+/=]+$/.test(body) || body.length < 200) throw bad('VALIDATION', 'Certificate is not valid base64 / PEM');
  return body;
}

export const PUT = route(async (req: NextRequest) => {
  const session = await requireTenant(req, { roles: ['manager'], blockDemo: true });
  const body = await readJson(req);

  const loginUrl = str(body.saml_login_url, 500);
  if (loginUrl) {
    let u: URL;
    try { u = new URL(loginUrl); } catch { throw bad('VALIDATION', 'Login URL is not a valid URL'); }
    if (u.protocol !== 'https:') throw bad('VALIDATION', 'Login URL must use https');
  }

  const payload = {
    tenant_id: session.tenantId,
    saml_login_url: loginUrl,
    saml_idp_cert: normalizeCert(str(body.saml_idp_cert, 8000, { trim: false })),
    saml_group_managers_id: str(body.saml_group_managers_id, 80),
    saml_group_admins_id: str(body.saml_group_admins_id, 80),
    saml_group_users_id: str(body.saml_group_users_id, 80),
    updated_at: new Date().toISOString(),
  };
  must(await db().from('tenant_settings').upsert(payload, { onConflict: 'tenant_id' }).select('tenant_id'));
  await audit({
    tenantId: session.tenantId, actor: session.sub, role: session.role, action: 'settings.sso_updated',
    meta: { hasCert: Boolean(payload.saml_idp_cert), hasLoginUrl: Boolean(loginUrl) }, ip: clientIp(req),
  });
  return NextResponse.json({ success: true });
});
