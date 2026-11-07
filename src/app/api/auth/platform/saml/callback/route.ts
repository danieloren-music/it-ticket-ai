import { NextRequest, NextResponse } from 'next/server';
import { db, must } from '@/lib/db';
import { attachPlatformSession } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { baseUrl, clientIp, rateLimit, route } from '@/lib/http';
import {
  buildSaml,
  extractIdentity,
  platformSpAcsUrl,
  platformSpEntityId,
  readPlatformRelayState,
} from '@/lib/saml';
import { isOneOf, PLATFORM_ROLES } from '@/lib/constants';

export const runtime = 'nodejs';

export const POST = route(async (req: NextRequest) => {
  const ip = clientIp(req);
  rateLimit(`platform:saml:callback:${ip}`, 30, 10 * 60_000);
  const form = await req.formData();
  const samlResponse = form.get('SAMLResponse');
  const relayRaw = form.get('RelayState');
  const validRelay = await readPlatformRelayState(typeof relayRaw === 'string' ? relayRaw : null);
  const origin = baseUrl(req);
  const back = (code: string) => {
    const url = new URL('/platform/login', origin);
    url.searchParams.set('error', code);
    return NextResponse.redirect(url, { status: 303 });
  };
  if (typeof samlResponse !== 'string' || !validRelay) return back('sso_failed');

  let settings: unknown = null;
  try {
    settings = await db().from('platform_auth_settings')
      .select('saml_enabled, saml_login_url, saml_idp_cert')
      .eq('id', 'default')
      .maybeSingle();
  } catch {
    // Defensive against a missing table during early bootstrap or partial migrations.
    await audit({ actor: 'unknown', action: 'platform.auth.sso_rejected', ip });
    return back('sso_not_configured');
  }
  if (!settings?.saml_enabled || !settings.saml_login_url || !settings.saml_idp_cert) {
    return back('sso_not_configured');
  }

  let identity: { email: string; name: string };
  try {
    const saml = buildSaml(origin, settings, {
      entityId: platformSpEntityId(origin),
      acsUrl: platformSpAcsUrl(origin),
    });
    const { profile } = await saml.validatePostResponseAsync({
      SAMLResponse: samlResponse,
      RelayState: String(relayRaw),
    });
    if (!profile) throw new Error('Empty SAML profile');
    identity = extractIdentity(profile as unknown as Record<string, unknown>);
    if (!identity.email.includes('@')) throw new Error('Assertion did not contain an email address');
  } catch (error) {
    console.warn('[platform-saml] assertion rejected:', error instanceof Error ? error.message : error);
    await audit({ actor: 'unknown', action: 'platform.auth.sso_rejected', ip });
    return back('sso_failed');
  }

  const admin = must(await db().from('platform_admins')
    .select('role, full_name')
    .eq('email', identity.email)
    .maybeSingle());
  if (!admin || !isOneOf(PLATFORM_ROLES, admin.role)) {
    await audit({ actor: identity.email, action: 'platform.auth.sso_blocked_unprovisioned', ip });
    return back('account_not_provisioned');
  }

  const response = NextResponse.redirect(new URL('/platform', origin), { status: 303 });
  await attachPlatformSession(response, {
    sub: identity.email,
    name: admin.full_name || identity.name,
    role: admin.role,
  });
  await audit({ actor: identity.email, role: admin.role, action: 'platform.auth.sso_login', ip });
  return response;
}, { skipOriginCheck: true });
