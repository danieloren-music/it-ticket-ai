import { NextRequest, NextResponse } from 'next/server';
import { db, must } from '@/lib/db';
import { API_KEY_SCOPES, type ApiKeyScope } from '@/lib/constants';
import { audit } from '@/lib/audit';
import { requireTenant } from '@/lib/auth';
import { bad, clientIp, HttpError, readJson, route, str } from '@/lib/http';
import { issueApiKey } from '@/lib/api-keys';

const ID_RE = /^[0-9a-f-]{36}$/i;
const COLUMNS = 'id, name, key_prefix, scopes, expires_at, last_used_at, revoked_at, created_at';

function scopesFrom(value: unknown): ApiKeyScope[] {
  if (!Array.isArray(value) || !value.length || value.some((scope) => !API_KEY_SCOPES.includes(scope as ApiKeyScope))) {
    throw bad('VALIDATION', 'Choose at least one supported API scope');
  }
  return [...new Set(value as ApiKeyScope[])];
}

function expirationFrom(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value)) || Date.parse(value) <= Date.now()) {
    throw bad('VALIDATION', 'Expiration must be a future date');
  }
  return new Date(value).toISOString();
}

export const GET = route(async (req: NextRequest) => {
  const session = await requireTenant(req, { permission: 'api_keys:manage' });
  const keys = must(await db().from('tenant_api_keys').select(COLUMNS)
    .eq('tenant_id', session.tenantId).order('created_at', { ascending: false }));
  return NextResponse.json({ keys: keys ?? [] });
});

export const POST = route(async (req: NextRequest) => {
  const session = await requireTenant(req, { permission: 'api_keys:manage', blockDemo: true });
  const body = await readJson(req);
  const name = str(body.name, 120, { min: 2, field: 'Key name' });
  const scopes = scopesFrom(body.scopes);
  const expiresAt = expirationFrom(body.expiresAt);
  const issued = issueApiKey();
  const key = must(await db().from('tenant_api_keys').insert({
    tenant_id: session.tenantId,
    name,
    key_prefix: issued.prefix,
    key_hash: issued.hash,
    scopes,
    expires_at: expiresAt,
    created_by: session.sub,
  }).select(COLUMNS).single());
  if (!key) throw new Error('API key was not created');
  await audit({
    tenantId: session.tenantId, actor: session.sub, role: session.role,
    action: 'api_key.created', target: key.name, meta: { scopes, expiresAt }, ip: clientIp(req),
  });
  return NextResponse.json({ success: true, key, secret: issued.raw }, { status: 201 });
});

export const PATCH = route(async (req: NextRequest) => {
  const session = await requireTenant(req, { permission: 'api_keys:manage', blockDemo: true });
  const id = req.nextUrl.searchParams.get('id') ?? '';
  if (!ID_RE.test(id)) throw bad('VALIDATION', 'Invalid API key ID');
  const body = await readJson(req);
  const patch = {
    name: str(body.name, 120, { min: 2, field: 'Key name' }),
    scopes: scopesFrom(body.scopes),
    expires_at: expirationFrom(body.expiresAt),
  };
  const key = must(await db().from('tenant_api_keys').update(patch)
    .eq('tenant_id', session.tenantId).eq('id', id).is('revoked_at', null).select(COLUMNS).maybeSingle());
  if (!key) throw new HttpError(404, 'NOT_FOUND', 'API key not found');
  await audit({
    tenantId: session.tenantId, actor: session.sub, role: session.role,
    action: 'api_key.updated', target: key.name, meta: { scopes: patch.scopes, expiresAt: patch.expires_at }, ip: clientIp(req),
  });
  return NextResponse.json({ success: true, key });
});

export const DELETE = route(async (req: NextRequest) => {
  const session = await requireTenant(req, { permission: 'api_keys:manage', blockDemo: true });
  const id = req.nextUrl.searchParams.get('id') ?? '';
  if (!ID_RE.test(id)) throw bad('VALIDATION', 'Invalid API key ID');
  const key = must(await db().from('tenant_api_keys').update({ revoked_at: new Date().toISOString() })
    .eq('tenant_id', session.tenantId).eq('id', id).is('revoked_at', null).select('name').maybeSingle());
  if (!key) throw new HttpError(404, 'NOT_FOUND', 'Active API key not found');
  await audit({ tenantId: session.tenantId, actor: session.sub, role: session.role, action: 'api_key.revoked', target: key.name, ip: clientIp(req) });
  return NextResponse.json({ success: true });
});
