import { NextRequest, NextResponse } from 'next/server';
import * as oidc from 'openid-client';
import { db, must } from '@/lib/db';
import { baseUrl, clientIp, rateLimit, route, slug } from '@/lib/http';
import { buildOidcAuthorizationUrl, discoverOidc, oidcCredentials } from '@/lib/oidc';
import { safeReturnTo } from '@/lib/auth';
import { signToken } from '@/lib/session';
import { DEMO_TENANT } from '@/lib/constants';

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

export const GET = route(async (req: NextRequest) => {
  rateLimit(`oidc:login:${clientIp(req)}`, 30, 10 * 60_000);
  const tenantId = slug(req.nextUrl.searchParams.get('tenant'));
  const returnTo = safeReturnTo(req.nextUrl.searchParams.get('returnTo'), `/${tenantId}/self-service`);
  const loginPage = new URL(`/${tenantId}/login`, req.url);
  const fail = (code: string) => {
    loginPage.searchParams.set('error', code);
    return NextResponse.redirect(loginPage);
  };

  if (tenantId === DEMO_TENANT) return fail('sso_not_configured');

  const [tenant, settings] = await Promise.all([
    db().from('tenants').select('id, status').eq('id', tenantId).maybeSingle().then(must),
    db().from('tenant_settings').select('oidc_enabled, oidc_issuer, oidc_client_id, oidc_client_secret_ciphertext')
      .eq('tenant_id', tenantId).maybeSingle().then(must),
  ]);
  if (!tenant || String(tenant.status).toLowerCase() === 'suspended' || !settings?.oidc_enabled || !settings.oidc_issuer) {
    return fail('sso_not_configured');
  }

  try {
    const { clientId, clientSecret } = oidcCredentials(settings);
    const config = await discoverOidc(settings.oidc_issuer, clientId, clientSecret);
    const callbackUrl = `${baseUrl(req)}${CALLBACK_PATH}`;
    const state = oidc.randomState();
    const nonce = oidc.randomNonce();
    const codeVerifier = oidc.randomPKCECodeVerifier();
    const authorizationUrl = await buildOidcAuthorizationUrl(config, callbackUrl, state, nonce, codeVerifier);
    const now = Math.floor(Date.now() / 1000);
    const transaction = await signToken<OidcTransaction>({
      tenant: tenantId,
      state,
      nonce,
      codeVerifier,
      returnTo,
      exp: now + 600,
    });

    const response = NextResponse.redirect(authorizationUrl);
    response.cookies.set(TRANSACTION_COOKIE, transaction, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: CALLBACK_PATH,
      maxAge: 600,
    });
    return response;
  } catch (error) {
    console.error('[oidc] authorization request could not be created:', error);
    return fail('sso_unavailable');
  }
});
