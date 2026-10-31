import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { route, slug, baseUrl, rateLimit, clientIp } from '@/lib/http';
import { buildSaml, createRelayState } from '@/lib/saml';
import { safeReturnTo } from '@/lib/auth';
import { DEMO_TENANT } from '@/lib/constants';

export const GET = route(async (req: NextRequest) => {
  rateLimit(`saml:login:${clientIp(req)}`, 30, 10 * 60_000);
  const tenant = slug(req.nextUrl.searchParams.get('tenant'));
  const returnTo = safeReturnTo(req.nextUrl.searchParams.get('returnTo'), `/${tenant}/self-service`);
  const loginPage = new URL(`/${tenant}/login`, req.url);

  const fail = (code: string) => {
    loginPage.searchParams.set('error', code);
    return NextResponse.redirect(loginPage);
  };

  if (tenant === DEMO_TENANT) return fail('sso_not_configured');

  const [{ data: tenantRow }, { data: settings }] = await Promise.all([
    db().from('tenants').select('id, status').eq('id', tenant).maybeSingle(),
    db().from('tenant_settings').select('*').eq('tenant_id', tenant).maybeSingle(),
  ]);
  if (!tenantRow || String(tenantRow.status).toLowerCase() === 'suspended') return fail('sso_not_configured');
  if (!settings?.saml_login_url || !settings?.saml_idp_cert) return fail('sso_not_configured');

  const saml = buildSaml(baseUrl(req), settings);
  const relayState = await createRelayState(tenant, returnTo);
  const url = await saml.getAuthorizeUrlAsync(relayState, undefined, {});
  return NextResponse.redirect(url);
});
