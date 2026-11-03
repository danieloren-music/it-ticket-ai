import 'server-only';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import * as oidc from 'openid-client';
import { Agent, fetch as undiciFetch } from 'undici';
import { decryptIdpSecret } from './idp-secrets';

const TIMEOUT_MS = 10_000;
const MAX_RESPONSE_BYTES = 1_048_576;

export interface OidcClientSettings {
  oidc_client_id: string | null;
  oidc_client_secret_ciphertext: string | null;
}

export function oidcCredentials(settings: OidcClientSettings): { clientId: string; clientSecret: string } {
  const tenantClientId = settings.oidc_client_id?.trim();
  const clientId = tenantClientId || process.env.OIDC_CLIENT_ID?.trim();
  const clientSecret = tenantClientId
    ? settings.oidc_client_secret_ciphertext
      ? decryptIdpSecret(settings.oidc_client_secret_ciphertext)
      : ''
    : process.env.OIDC_CLIENT_SECRET || '';

  if (!clientId || !clientSecret) {
    throw new Error('OIDC client credentials are not configured.');
  }
  return { clientId, clientSecret };
}

function isPublicAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) {
    const [a, b, c] = address.split('.').map(Number);
    return !(
      a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && (b === 0 || b === 168 || (b === 88 && c === 99))) ||
      (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
      (a === 203 && b === 0 && c === 113)
    );
  }

  if (version === 6) {
    const normalized = address.toLowerCase();
    const [first, second] = normalized.split(':');
    const firstGroup = Number.parseInt(first || '0', 16);
    const secondGroup = Number.parseInt(second || '0', 16);
    return firstGroup >= 0x2000 && firstGroup <= 0x3fff &&
      !(firstGroup === 0x2001 && secondGroup <= 0x01ff) &&
      !(firstGroup === 0x2001 && secondGroup === 0x0db8) &&
      !(firstGroup === 0x3fff && secondGroup <= 0x0fff) &&
      !normalized.startsWith('2002:');
  }
  return false;
}

async function assertSafeIdentityProviderUrl(rawUrl: string): Promise<void> {
  const url = new URL(rawUrl);
  if (url.protocol !== 'https:' || url.username || url.password || url.hash) {
    throw new Error('Identity provider endpoints must use HTTPS and cannot contain credentials or fragments.');
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  const records = isIP(hostname) ? [{ address: hostname }] : await lookup(hostname, { all: true, verbatim: true });
  if (!records.length || records.some(({ address }) => !isPublicAddress(address))) {
    throw new Error('Identity provider endpoint resolves to a non-public network address.');
  }
}

function safeDnsLookup(
  hostname: string,
  options: { all?: boolean },
  callback: (error: NodeJS.ErrnoException | null, address: string | { address: string; family: number }[], family?: number) => void
): void {
  void lookup(hostname, { all: true, verbatim: true }).then((records) => {
    if (!records.length || records.some(({ address }) => !isPublicAddress(address))) {
      callback(Object.assign(new Error('Identity provider endpoint resolves to a non-public network address.'), { code: 'ENOTFOUND' }), '', 0);
      return;
    }

    if (options.all) {
      callback(null, records);
      return;
    }

    const [record] = records;
    callback(null, record.address, record.family);
  }).catch((error: NodeJS.ErrnoException) => {
    callback(error, '', 0);
  });
}

async function* streamBody(stream: ReadableStream): AsyncGenerator<Uint8Array> {
  const reader = stream.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return;
      if (!(value instanceof Uint8Array)) {
        throw new TypeError('OIDC request stream must contain byte chunks.');
      }
      yield value;
    }
  } finally {
    reader.releaseLock();
  }
}

const safeFetch: oidc.CustomFetch = async (url, options) => {
  await assertSafeIdentityProviderUrl(url);
  const dispatcher = new Agent({
    connect: { lookup: safeDnsLookup },
    headersTimeout: TIMEOUT_MS,
    bodyTimeout: TIMEOUT_MS,
    connectTimeout: TIMEOUT_MS,
    maxRedirections: 0,
    maxResponseSize: MAX_RESPONSE_BYTES,
  });
  const body = options.body instanceof ReadableStream
    ? streamBody(options.body)
    : options.body instanceof Uint8Array
      ? new Uint8Array(options.body).buffer
      : options.body;
  let completed = false;

  try {
    const response = await undiciFetch(url, {
      method: options.method,
      headers: options.headers,
      body,
      dispatcher,
      redirect: 'error',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      ...(options.duplex ? { duplex: options.duplex } : {}),
    });
    const responseBody = response.body ? await response.arrayBuffer() : null;
    completed = true;
    return new Response(responseBody, {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers),
    });
  } finally {
    if (completed) {
      await dispatcher.close();
    } else {
      await dispatcher.destroy();
    }
  }
};

export async function discoverOidc(
  issuer: string,
  clientId: string,
  clientSecret: string
): Promise<oidc.Configuration> {
  await assertSafeIdentityProviderUrl(issuer);
  return oidc.discovery(
    new URL(issuer),
    clientId,
    clientSecret,
    undefined,
    { [oidc.customFetch]: safeFetch }
  );
}

export async function buildOidcAuthorizationUrl(
  config: oidc.Configuration,
  callbackUrl: string,
  state: string,
  nonce: string,
  codeVerifier: string
): Promise<URL> {
  return oidc.buildAuthorizationUrl(config, {
    redirect_uri: callbackUrl,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    nonce,
    code_challenge: await oidc.calculatePKCECodeChallenge(codeVerifier),
    code_challenge_method: 'S256',
  });
}
