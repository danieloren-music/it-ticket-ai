import { NextRequest, NextResponse } from 'next/server';
import { db, must } from '@/lib/db';
import { route, baseUrl, rateLimit, clientIp } from '@/lib/http';
import { buildSaml, extractIdentity, readRelayState } from '@/lib/saml';
import { attachTenantSession, defaultLanding, normalizeRole } from '@/lib/auth';
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

    const [tenant, settings] = await Promise.all([
      db().from('tenants').select('id, status').eq('id', tenantId).maybeSingle().then(must),
      db().from('tenant_settings').select('*').eq('tenant_id', tenantId).maybeSingle().then(must),
    ]);
    if (!tenant || String(tenant.status).toLowerCase() === 'suspended' ||
        !settings?.saml_enabled || !settings.saml_login_url || !settings.saml_idp_cert) {
      return back(tenantId, 'sso_not_configured');
    }

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

    // SSO access requires an active local account even when the IdP authenticates the user.
    const local = must(
      await db()
        .from('tenant_users')
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
    const res = NextResponse.redirect(new URL(relay.returnTo || defaultLanding(tenantId, role), origin), { status: 303 });
    await attachTenantSession(res, {
      sub: identity.email,
      name: identity.name,
      role,
      tenantId,
      authSource: 'sso',
      city: local?.site_location || undefined,
      phone: local?.phone_number || undefined,
    });
    await audit({ tenantId, actor: identity.email, role, action: 'auth.sso_login', ip });
    return res;
  },
  { skipOriginCheck: true }
);
