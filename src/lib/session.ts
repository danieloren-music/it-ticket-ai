/**
 * Signed session tokens (HMAC-SHA256) built on Web Crypto, so the exact same code
 * runs in the Next.js proxy and Node route handlers.
 *
 * Token format: base64url(JSON payload) + "." + base64url(signature)
 */

export type Role = 'user' | 'admin' | 'manager';

export interface TenantSession {
  typ: 'tenant';
  sub: string; // email
  name: string;
  role: Role;
  tenantId: string;
  authSource?: 'local' | 'sso' | 'demo';
  demo?: boolean;
  permissions?: string[];
  apiKeyId?: string;
  /** user must change their password before doing anything else */
  mcp?: boolean;
  city?: string;
  phone?: string;
  iat: number;
  exp: number;
}

export interface PlatformSession {
  typ: 'platform';
  sub: string;
  name: string;
  role: string;
  iat: number;
  exp: number;
}

export const TENANT_COOKIE = 'smartq_session';
export const PLATFORM_COOKIE = 'smartq_platform_session';

export const TENANT_TTL_SECONDS = 60 * 60 * 12;
export const DEMO_TTL_SECONDS = 60 * 60 * 2;
export const PLATFORM_TTL_SECONDS = 60 * 60 * 8;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(input: string): Uint8Array {
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (input.length % 4)) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV !== 'production') {
    return 'dev-only-insecure-secret-change-me';
  }
  throw new Error('SESSION_SECRET is not configured (minimum 32 characters).');
}

async function hmacKey(usage: 'sign' | 'verify'): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', encoder.encode(getSecret()), { name: 'HMAC', hash: 'SHA-256' }, false, [usage]);
}

/** Sign an arbitrary JSON payload. `exp`/`iat` are managed by the caller. */
export async function signToken<T extends object>(payload: T): Promise<string> {
  const body = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const sig = await crypto.subtle.sign('HMAC', await hmacKey('sign'), encoder.encode(body));
  return `${body}.${toBase64Url(new Uint8Array(sig))}`;
}

/** Verify signature + expiry. Returns null for anything invalid (never throws). */
export async function verifyToken<T extends { exp?: number }>(token: string | undefined | null): Promise<T | null> {
  if (!token || token.length > 4096) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  try {
    const [body, sig] = parts;
    const ok = await crypto.subtle.verify(
      'HMAC',
      await hmacKey('verify'),
      fromBase64Url(sig) as BufferSource,
      encoder.encode(body)
    );
    if (!ok) return null;
    const payload = JSON.parse(decoder.decode(fromBase64Url(body))) as T;
    if (typeof payload.exp !== 'number' || payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

const nowSec = () => Math.floor(Date.now() / 1000);

export async function createTenantToken(
  data: Omit<TenantSession, 'typ' | 'iat' | 'exp'>
): Promise<{ token: string; maxAge: number }> {
  const maxAge = data.demo ? DEMO_TTL_SECONDS : TENANT_TTL_SECONDS;
  const iat = nowSec();
  const token = await signToken<TenantSession>({ ...data, typ: 'tenant', iat, exp: iat + maxAge });
  return { token, maxAge };
}

export async function createPlatformToken(
  data: Omit<PlatformSession, 'typ' | 'iat' | 'exp'>
): Promise<{ token: string; maxAge: number }> {
  const iat = nowSec();
  const token = await signToken<PlatformSession>({
    ...data,
    typ: 'platform',
    iat,
    exp: iat + PLATFORM_TTL_SECONDS,
  });
  return { token, maxAge: PLATFORM_TTL_SECONDS };
}

export async function readTenantSession(token: string | undefined | null): Promise<TenantSession | null> {
  const s = await verifyToken<TenantSession>(token);
  return s && s.typ === 'tenant' ? s : null;
}

export async function readPlatformSession(token: string | undefined | null): Promise<PlatformSession | null> {
  const s = await verifyToken<PlatformSession>(token);
  return s && s.typ === 'platform' ? s : null;
}

export function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  };
}
