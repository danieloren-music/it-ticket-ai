import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { route, baseUrl, rateLimit, clientIp } from '@/lib/http';
import { buildSaml, extractIdentity, readRelayState, roleFromGroups } from '@/lib/saml';
import { attachTenantSession, defaultLanding } from '@/lib/auth';
import { audit } from '@/lib/audit';

// Cross-site POST from the identity provider: the same-origin check is intentionally skipped.
// Trust comes from the XML signature (verified below) and the HMAC-signed RelayState.
export const POST = route(
  async (req: NextRequest) => {
    const ip = clientIp(req);
    rateLimit(`saml:cb:${ip}`, 30, 10 * 60_000);

    const form = await req.formData();
    const samlResponse = form.get('SAMLResponse');
    const relayRaw = form.get('RelayState');
    const relay = await readRelayState(typeof relayRaw === 'string' ? relayRaw : null);

    const origin = baseUrl(req);
    const back = (tenant: string | undefined, code: string) => {
      const url = new URL(tenant ? `/${tenant}/login` : '/home', origin);
      url.searchParams.set('error', code);
      return NextResponse.redirect(url, { status: 303 });
    };

    if (typeof samlResponse !== 'string' || !relay) return back(relay?.tenant, 'sso_failed');
    const tenantId = relay.tenant;

    const [{ data: tenant }, { data: settings }] = await Promise.all([
      db().from('tenants').select('id, status').eq('id', tenantId).maybeSingle(),
      db().from('tenant_settings').select('*').eq('tenant_id', tenantId).maybeSingle(),
    ]);
    if (!tenant || String(tenant.status).toLowerCase() === 'suspended' || !settings) return back(tenantId, 'sso_not_configured');

    let identity;
    try {
      const saml = buildSaml(origin, settings);
      // Verifies signature against the tenant's IdP certificate, audience, validity window and issuer.
      const { profile } = await saml.validatePostResponseAsync({ SAMLResponse: samlResponse, RelayState: String(relayRaw) });
      if (!profile) throw new Error('Empty SAML profile');
      identity = extractIdentity(profile as unknown as Record<string, unknown>);
      if (!identity.email.includes('@')) throw new Error('Assertion did not contain an email address');
    } catch (err) {
      console.warn('[saml] assertion rejected:', err instanceof Error ? err.message : err);
      await audit({ tenantId, actor: 'unknown', action: 'auth.sso_rejected', ip });
      return back(tenantId, 'sso_failed');
    }

    // A locally disabled account stays disabled even if the IdP lets the user in.
    const { data: local } = await db()
      .from('tenant_users')
      .select('is_active, site_location, phone_number')
      .eq('tenant_id', tenantId)
      .eq('email', identity.email)
      .maybeSingle();
    if (local && local.is_active === false) {
      await audit({ tenantId, actor: identity.email, action: 'auth.sso_blocked_disabled', ip });
      return back(tenantId, 'account_disabled');
    }

    const role = roleFromGroups(identity.groups, settings);
    const res = NextResponse.redirect(new URL(relay.returnTo || defaultLanding(tenantId, role), origin), { status: 303 });
    await attachTenantSession(res, {
      sub: identity.email,
      name: identity.name,
      role,
      tenantId,
      city: local?.site_location || undefined,
      phone: local?.phone_number || undefined,
    });
    await audit({ tenantId, actor: identity.email, role, action: 'auth.sso_login', ip });
    return res;
  },
  { skipOriginCheck: true }
);
