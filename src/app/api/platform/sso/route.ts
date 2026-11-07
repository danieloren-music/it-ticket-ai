import { NextRequest, NextResponse } from 'next/server';
import { db, must } from '@/lib/db';
import { bad, baseUrl, forbidden, route, readJson, str } from '@/lib/http';
import { requirePlatform } from '@/lib/auth';
import { platformSpAcsUrl, platformSpEntityId, normalizeSamlCert } from '@/lib/saml';
import { audit } from '@/lib/audit';

const COLUMNS = 'saml_enabled, saml_login_url, saml_idp_cert';

export const GET = route(async (req: NextRequest) => {
  const session = await requirePlatform(req);
  if (session.role !== 'Super Admin') throw forbidden();

  const data = must(await db().from('platform_auth_settings').select(COLUMNS).eq('id', 'default').maybeSingle());
  const origin = baseUrl(req);
  return NextResponse.json({
    settings: {
      saml_enabled: data?.saml_enabled ?? false,
      saml_login_url: data?.saml_login_url ?? '',
      saml_idp_cert: data?.saml_idp_cert ?? '',
    },
    sp: { entityId: platformSpEntityId(origin), acsUrl: platformSpAcsUrl(origin) },
  });
});

export const PUT = route(async (req: NextRequest) => {
  const session = await requirePlatform(req, { write: true });
  if (session.role !== 'Super Admin') throw forbidden();

  const body = await readJson(req);
  const loginUrl = str(body.saml_login_url, 500);
  if (loginUrl) {
    let url: URL;
    try { url = new URL(loginUrl); } catch { throw bad('VALIDATION', 'Login URL is not a valid URL'); }
    if (url.protocol !== 'https:') throw bad('VALIDATION', 'Login URL must use https');
  }

  let certificate: string;
  try {
    certificate = normalizeSamlCert(str(body.saml_idp_cert, 8000, { trim: false }));
  } catch {
    throw bad('VALIDATION', 'Certificate is not valid base64 / PEM');
  }
  const enabled = body.saml_enabled === true;
  if (enabled && (!loginUrl || !certificate)) {
    throw bad('VALIDATION', 'SAML requires an HTTPS login URL and a signing certificate');
  }

  must(await db().from('platform_auth_settings').upsert({
    id: 'default',
    saml_enabled: enabled,
    saml_login_url: loginUrl || null,
    saml_idp_cert: certificate || null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' }).select('id'));

  await audit({ actor: session.sub, role: session.role, action: 'platform.sso_updated', meta: { samlEnabled: enabled } });
  return NextResponse.json({ success: true });
});

export const DELETE = route(async (req: NextRequest) => {
  const session = await requirePlatform(req, { write: true });
  if (session.role !== 'Super Admin') throw forbidden();

  must(await db().from('platform_auth_settings').upsert({
    id: 'default',
    saml_enabled: false,
    saml_login_url: null,
    saml_idp_cert: null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' }).select('id'));
  await audit({ actor: session.sub, role: session.role, action: 'platform.sso_deleted', target: 'saml' });
  return NextResponse.json({ success: true });
});

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
