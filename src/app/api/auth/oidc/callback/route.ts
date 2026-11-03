import { NextRequest, NextResponse } from 'next/server';
import * as oidc from 'openid-client';
import { audit } from '@/lib/audit';
import { attachTenantSession, defaultLanding, normalizeRole, safeReturnTo } from '@/lib/auth';
import { db, must } from '@/lib/db';
import { baseUrl, clientIp, rateLimit, route } from '@/lib/http';
import { discoverOidc, oidcCredentials } from '@/lib/oidc';
import { verifyToken } from '@/lib/session';

export const runtime = 'nodejs';

const TRANSACTION_COOKIE = 'smartq_oidc_transaction';
const CALLBACK_PATH = '/api/auth/oidc/callback';

interface OidcTransaction {
  tenant: string;
  state: string;
  nonce: string;
  codeVerifier: string;
  returnTo: string;
  exp: number;
}

function clearTransactionCookie(response: NextResponse): NextResponse {
  response.cookies.set(TRANSACTION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: CALLBACK_PATH,
    maxAge: 0,
  });
  return response;
}

export const GET = route(async (req: NextRequest) => {
  const ip = clientIp(req);
  rateLimit(`oidc:callback:${ip}`, 30, 10 * 60_000);

  const state = req.nextUrl.searchParams.get('state');
  const transaction = await verifyToken<OidcTransaction>(req.cookies.get(TRANSACTION_COOKIE)?.value);
  const back = (tenantId: string | undefined, code: string) => {
    const url = new URL(tenantId ? `/${tenantId}/login` : '/home', baseUrl(req));
    url.searchParams.set('error', code);
    return clearTransactionCookie(NextResponse.redirect(url));
  };

  if (!transaction || !state || state !== transaction.state) return back(undefined, 'sso_failed');
  const tenantId = transaction.tenant;
  if (req.nextUrl.searchParams.has('error')) return back(tenantId, 'sso_failed');

  const [tenant, settings] = await Promise.all([
    db().from('tenants').select('id, status').eq('id', tenantId).maybeSingle().then(must),
    db().from('tenant_settings')
      .select('oidc_enabled, oidc_issuer, oidc_client_id, oidc_client_secret_ciphertext')
      .eq('tenant_id', tenantId).maybeSingle().then(must),
  ]);
  if (!tenant || String(tenant.status).toLowerCase() === 'suspended' ||
      !settings?.oidc_enabled || !settings.oidc_issuer) {
    return back(tenantId, 'sso_not_configured');
  }

  let identity: { email: string; name: string } | null = null;
  try {
    const { clientId, clientSecret } = oidcCredentials(settings);
    const config = await discoverOidc(settings.oidc_issuer, clientId, clientSecret);
    const tokens = await oidc.authorizationCodeGrant(config, new URL(req.url), {
      expectedState: transaction.state,
      expectedNonce: transaction.nonce,
      pkceCodeVerifier: transaction.codeVerifier,
    });
    const claims = tokens.claims();
    if (!claims || typeof claims.sub !== 'string' || !claims.sub) throw new Error('OIDC ID token has no subject');
    if (claims.email_verified === false) throw new Error('OIDC email claim is not verified');
    const emailClaim = [claims.email, claims.preferred_username, claims.upn]
      .find((value) => typeof value === 'string' && value.includes('@'));
    if (typeof emailClaim !== 'string') throw new Error('OIDC ID token has no usable email claim');
    const userEmail = emailClaim.trim().toLowerCase();
    const displayName = typeof claims.name === 'string' ? claims.name.trim() : userEmail.split('@')[0];
    identity = { email: userEmail, name: displayName };
  } catch (error) {
    console.warn('[oidc] callback rejected:', error instanceof Error ? error.message : error);
    await audit({ tenantId, actor: 'unknown', action: 'auth.sso_rejected', ip });
    return back(tenantId, 'sso_failed');
  }
  if (!identity) return back(tenantId, 'sso_failed');

  const local = must(
    await db().from('tenant_users')
      .select('role, is_active, site_location, phone_number')
      .eq('tenant_id', tenantId)
      .eq('email', identity.email)
      .maybeSingle()
  );
  if (!local || local.is_active === false) {
    const reason = local ? 'auth.sso_blocked_disabled' : 'auth.sso_blocked_unprovisioned';
    await audit({ tenantId, actor: identity.email, action: reason, ip });
    return back(tenantId, local ? 'account_disabled' : 'account_not_provisioned');
  }

  const role = normalizeRole(local.role);
  const returnTo = safeReturnTo(transaction.returnTo, defaultLanding(tenantId, role));
  const response = clearTransactionCookie(
    NextResponse.redirect(new URL(returnTo, baseUrl(req)), { status: 303 })
  );
  await attachTenantSession(response, {
    sub: identity.email,
    name: identity.name,
    role,
    tenantId,
    authSource: 'sso',
    city: local.site_location || undefined,
    phone: local.phone_number || undefined,
  });
  await audit({ tenantId, actor: identity.email, role, action: 'auth.sso_login', ip });
  return response;
}, { skipOriginCheck: true });
