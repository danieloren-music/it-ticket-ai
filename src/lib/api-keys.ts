import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { db, must } from './db';
import { HttpError, unauthorized } from './http';
import type { NextRequest } from 'next/server';
import type { TenantSession } from './session';
import type { ApiKeyScope } from './constants';

export function issueApiKey(): { raw: string; prefix: string; hash: string } {
  const raw = `sq_live_${randomBytes(32).toString('base64url')}`;
  return {
    raw,
    prefix: raw.slice(0, 16),
    hash: createHash('sha256').update(raw).digest('hex'),
  };
}

export async function requireApiKey(req: NextRequest, scope: ApiKeyScope): Promise<TenantSession> {
  const authorization = req.headers.get('authorization') ?? '';
  const match = /^Bearer (sq_live_[A-Za-z0-9_-]{40,})$/.exec(authorization);
  if (!match) throw unauthorized();
  const keyHash = createHash('sha256').update(match[1]).digest('hex');
  const key = must(await db()
    .from('tenant_api_keys')
    .select('id, tenant_id, name, scopes, expires_at, revoked_at')
    .eq('key_hash', keyHash)
    .maybeSingle());
  if (!key || key.revoked_at || (key.expires_at && Date.parse(key.expires_at) <= Date.now())) throw unauthorized();
  if (!(key.scopes as string[]).includes(scope)) throw new HttpError(403, 'INSUFFICIENT_SCOPE', `API key requires ${scope}`);

  const tenant = must(await db().from('tenants').select('status').eq('id', key.tenant_id).maybeSingle());
  if (!tenant || String(tenant.status).toLowerCase() === 'suspended') {
    throw new HttpError(403, 'TENANT_UNAVAILABLE', 'This organization is not available');
  }
  must(await db().from('tenant_api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', key.id));
  return {
    typ: 'tenant',
    sub: `api:${key.id}`,
    name: `API · ${key.name}`,
    role: 'manager',
    tenantId: key.tenant_id,
    apiKeyId: key.id,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60,
  };
}
