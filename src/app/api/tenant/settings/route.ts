import { NextRequest, NextResponse } from 'next/server';
import { db, must } from '@/lib/db';
import { route, readJson, str, baseUrl, bad, clientIp } from '@/lib/http';
import { requireTenant } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { spAcsUrl, spEntityId } from '@/lib/saml';
import { decryptIdpSecret, encryptIdpSecret } from '@/lib/idp-secrets';

export const runtime = 'nodejs';

const COLS = 'saml_enabled, saml_login_url, saml_idp_cert, oidc_enabled, oidc_issuer, oidc_client_id, oidc_client_secret_ciphertext';

/** SSO configuration for the signed-in manager's own organization. */
export const GET = route(async (req: NextRequest) => {
  const session = await requireTenant(req, { permission: 'settings:manage' });
  const data = must(await db().from('tenant_settings').select(COLS).eq('tenant_id', session.tenantId).maybeSingle());
  const origin = baseUrl(req);
  return NextResponse.json({
    settings: {
      saml_enabled: data?.saml_enabled ?? false,
      saml_login_url: data?.saml_login_url ?? '',
      saml_idp_cert: data?.saml_idp_cert ?? '',
      oidc_enabled: data?.oidc_enabled ?? false,
      oidc_issuer: data?.oidc_issuer ?? '',
      oidc_client_id: data?.oidc_client_id ?? '',
      has_oidc_client_secret: Boolean(data?.oidc_client_secret_ciphertext),
      platform_oidc_client_available: Boolean(process.env.OIDC_CLIENT_ID && process.env.OIDC_CLIENT_SECRET),
    },
    sp: {
      entityId: spEntityId(origin),
      acsUrl: spAcsUrl(origin),
      oidcCallbackUrl: `${origin}/api/auth/oidc/callback`,
    },
  });
});

function normalizeCert(raw: string): string {
  const blocks = [...raw.matchAll(/-----BEGIN CERTIFICATE-----([\s\S]*?)-----END CERTIFICATE-----/g)];
  const bodies = blocks.length
    ? blocks.map((block) => block[1].replace(/\s+/g, ''))
    : [raw.replace(/\s+/g, '')];
  if (!bodies[0]) return '';
  if (bodies.some((body) => !/^[A-Za-z0-9+/=]+$/.test(body) || body.length < 200)) {
    throw bad('VALIDATION', 'Certificate is not valid base64 / PEM');
  }
  return bodies.map((body) => `-----BEGIN CERTIFICATE-----\n${body}\n-----END CERTIFICATE-----`).join('\n');
}

export const PUT = route(async (req: NextRequest) => {
  const session = await requireTenant(req, { permission: 'settings:manage', blockDemo: true });
  const body = await readJson(req);

  const existing = must(
    await db().from('tenant_settings')
      .select('oidc_client_id, oidc_client_secret_ciphertext')
      .eq('tenant_id', session.tenantId)
      .maybeSingle()
  );
  const loginUrl = str(body.saml_login_url, 500);
  if (loginUrl) {
    let u: URL;
    try { u = new URL(loginUrl); } catch { throw bad('VALIDATION', 'Login URL is not a valid URL'); }
    if (u.protocol !== 'https:') throw bad('VALIDATION', 'Login URL must use https');
  }

  const samlEnabled = body.saml_enabled === true;
  const samlCert = normalizeCert(str(body.saml_idp_cert, 8000, { trim: false }));
  if (samlEnabled && (!loginUrl || !samlCert)) {
    throw bad('VALIDATION', 'SAML requires an HTTPS login URL and a signing certificate');
  }

  const oidcEnabled = body.oidc_enabled === true;
  const issuer = str(body.oidc_issuer, 500);
  if (issuer) {
    let url: URL;
    try { url = new URL(issuer); } catch { throw bad('VALIDATION', 'OIDC issuer is not a valid URL'); }
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || !url.hostname.includes('.')) {
      throw bad('VALIDATION', 'OIDC issuer must be a public HTTPS issuer URL without credentials, query, or fragment');
    }
  }
  if (oidcEnabled && !issuer) throw bad('VALIDATION', 'OIDC requires an issuer URL');

  const clientId = str(body.oidc_client_id, 500) || null;
  const clientSecret = str(body.oidc_client_secret, 4000, { trim: false });
  if (clientSecret && !clientId) {
    throw bad('VALIDATION', 'A client secret can only be saved with a client ID');
  }
  if (clientId && !clientSecret && (
    existing?.oidc_client_id !== clientId || !existing.oidc_client_secret_ciphertext
  )) {
    throw bad('VALIDATION', 'Enter the client secret for this client ID');
  }
  let clientSecretCiphertext = existing?.oidc_client_secret_ciphertext ?? null;
  if (clientSecret) clientSecretCiphertext = encryptIdpSecret(clientSecret);
  else if (!clientId) clientSecretCiphertext = null;
  if (oidcEnabled) {
    if (!clientId && !(process.env.OIDC_CLIENT_ID && process.env.OIDC_CLIENT_SECRET)) {
      throw bad('VALIDATION', 'Configure SmartQ OIDC client credentials or enter a tenant-specific client ID and secret');
    }
    if (clientId && !clientSecretCiphertext) throw bad('VALIDATION', 'A client secret is required for this client ID');
    if (clientId && clientSecretCiphertext) decryptIdpSecret(clientSecretCiphertext);
  }

  const payload = {
    tenant_id: session.tenantId,
    saml_enabled: samlEnabled,
    saml_login_url: loginUrl,
    saml_idp_cert: samlCert,
    oidc_enabled: oidcEnabled,
    oidc_issuer: issuer || null,
    oidc_client_id: clientId,
    oidc_client_secret_ciphertext: clientSecretCiphertext,
    updated_at: new Date().toISOString(),
  };
  must(await db().from('tenant_settings').upsert(payload, { onConflict: 'tenant_id' }).select('tenant_id'));
  await audit({
    tenantId: session.tenantId, actor: session.sub, role: session.role, action: 'settings.sso_updated',
    meta: {
      samlEnabled,
      oidcEnabled,
      hasSamlCertificate: Boolean(payload.saml_idp_cert),
      hasOidcClientSecret: Boolean(clientSecretCiphertext),
    },
    ip: clientIp(req),
  });
  return NextResponse.json({ success: true });
});

export const DELETE = route(async (req: NextRequest) => {
  const session = await requireTenant(req, { permission: 'settings:manage', blockDemo: true });
  must(await db().from('tenant_settings').update({
    saml_enabled: false,
    saml_login_url: null,
    saml_idp_cert: null,
    oidc_enabled: false,
    oidc_issuer: null,
    oidc_client_id: null,
    oidc_client_secret_ciphertext: null,
    updated_at: new Date().toISOString(),
  }).eq('tenant_id', session.tenantId).select('tenant_id'));
  await audit({
    tenantId: session.tenantId, actor: session.sub, role: session.role,
    action: 'settings.sso_deleted', target: 'sso', ip: clientIp(req),
  });
  return NextResponse.json({ success: true });
});
