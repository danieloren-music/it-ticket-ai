import { SAML } from '@node-saml/node-saml';
import { signToken, verifyToken } from './session';
import { safeReturnTo } from './auth';

export interface SamlSettings {
  saml_login_url?: string | null;
  saml_idp_cert?: string | null;
}

export const spEntityId = (origin: string) => `${origin}/api/auth/saml/metadata`;
export const spAcsUrl = (origin: string) => `${origin}/api/auth/saml/callback`;

export function buildSaml(origin: string, settings: SamlSettings): SAML {
  if (!settings.saml_login_url || !settings.saml_idp_cert) {
    throw new Error('SAML is not fully configured for this organization');
  }
  return new SAML({
    callbackUrl: spAcsUrl(origin),
    entryPoint: settings.saml_login_url,
    issuer: spEntityId(origin),
    audience: spEntityId(origin),
    idpCert: settings.saml_idp_cert,
    identifierFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
    // Entra ID signs the assertion (default), not the outer response.
    wantAssertionsSigned: true,
    wantAuthnResponseSigned: false,
    disableRequestedAuthnContext: true,
    acceptedClockSkewMs: 5 * 60 * 1000,
  });
}

/** RelayState is HMAC-signed so the tenant / redirect target cannot be tampered with in transit. */
export async function createRelayState(tenant: string, returnTo: string): Promise<string> {
  return signToken({ tenant, returnTo: safeReturnTo(returnTo, `/${tenant}/self-service`), exp: Math.floor(Date.now() / 1000) + 600 });
}

export async function readRelayState(token: string | null | undefined): Promise<{ tenant: string; returnTo: string } | null> {
  const payload = await verifyToken<{ tenant: string; returnTo: string; exp: number }>(token);
  if (!payload?.tenant) return null;
  return { tenant: payload.tenant, returnTo: safeReturnTo(payload.returnTo, `/${payload.tenant}/self-service`) };
}

const CLAIMS = {
  email: [
    'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
    'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/upn',
    'email', 'mail',
  ],
  name: [
    'http://schemas.microsoft.com/identity/claims/displayname',
    'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name',
    'displayName', 'name',
  ],
};

function pick(profile: Record<string, unknown>, keys: string[]): unknown {
  const attrs = (profile.attributes ?? {}) as Record<string, unknown>;
  for (const k of keys) {
    if (profile[k] !== undefined && profile[k] !== null && profile[k] !== '') return profile[k];
    if (attrs[k] !== undefined && attrs[k] !== null && attrs[k] !== '') return attrs[k];
  }
  return undefined;
}

function firstString(value: unknown): string {
  const first = Array.isArray(value) ? value[0] : value;
  return typeof first === 'string' ? first : '';
}

export function extractIdentity(profile: Record<string, unknown>) {
  const email = (firstString(pick(profile, CLAIMS.email)) || String(profile.nameID || '')).trim().toLowerCase();
  const name = (firstString(pick(profile, CLAIMS.name)) || email.split('@')[0]).trim();
  return { email, name };
}
