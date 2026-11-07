import { NextRequest, NextResponse } from 'next/server';
import { db, must } from '@/lib/db';
import { baseUrl, clientIp, rateLimit, route } from '@/lib/http';
import { buildSaml, createPlatformRelayState, platformSpAcsUrl, platformSpEntityId, type SamlSettings } from '@/lib/saml';

export const runtime = 'nodejs';

export const GET = route(async (req: NextRequest) => {
  rateLimit(`platform:saml:login:${clientIp(req)}`, 30, 10 * 60_000);
  const origin = baseUrl(req);
  const loginPage = new URL('/platform/login', origin);
  const fail = (code: string) => {
    loginPage.searchParams.set('error', code);
    return NextResponse.redirect(loginPage);
  };

  let settings: SamlSettings | null = null;
  try {
    const result = await db().from('platform_auth_settings')
      .select('saml_enabled, saml_login_url, saml_idp_cert')
      .eq('id', 'default')
      .maybeSingle();
    settings = result.data as SamlSettings | null;
  } catch {
    // Defensive against a missing table during early bootstrap or partial migrations.
    return fail('sso_not_configured');
  }
  if (!settings?.saml_enabled || !settings.saml_login_url || !settings.saml_idp_cert) {
    return fail('sso_not_configured');
  }

  try {
    const saml = buildSaml(origin, settings, {
      entityId: platformSpEntityId(origin),
      acsUrl: platformSpAcsUrl(origin),
    });
    const relayState = await createPlatformRelayState();
    return NextResponse.redirect(await saml.getAuthorizeUrlAsync(relayState, undefined, {}));
  } catch (error) {
    console.error('[platform-saml] authorization request could not be created:', error);
    return fail('sso_unavailable');
  }
});
