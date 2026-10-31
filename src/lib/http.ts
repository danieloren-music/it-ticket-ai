import { NextRequest, NextResponse } from 'next/server';

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message?: string,
    public extra?: Record<string, unknown>
  ) {
    super(message || code);
  }
}

export const bad = (code: string, message?: string) => new HttpError(400, code, message);
export const unauthorized = () => new HttpError(401, 'UNAUTHENTICATED', 'Authentication required');
export const forbidden = (code = 'FORBIDDEN', message = 'You do not have permission to do this') =>
  new HttpError(403, code, message);
export const notFoundErr = (what = 'Resource') => new HttpError(404, 'NOT_FOUND', `${what} not found`);

type Handler<C> = (req: NextRequest, ctx: C) => Promise<NextResponse | Response>;

/** Wraps a route handler: same-origin check on mutations + uniform error responses. */
export function route<C = unknown>(handler: Handler<C>, opts: { skipOriginCheck?: boolean } = {}) {
  return async (req: NextRequest, ctx: C) => {
    try {
      if (!opts.skipOriginCheck && !['GET', 'HEAD', 'OPTIONS'].includes(req.method)) assertSameOrigin(req);
      return await handler(req, ctx);
    } catch (err) {
      if (err instanceof HttpError) {
        const headers: Record<string, string> = {};
        if (err.status === 429 && typeof err.extra?.retryAfter === 'number') {
          headers['Retry-After'] = String(err.extra.retryAfter);
        }
        return NextResponse.json({ error: err.message, code: err.code, ...err.extra }, { status: err.status, headers });
      }
      console.error(`[api] ${req.method} ${req.nextUrl.pathname} failed:`, err);
      return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL' }, { status: 500 });
    }
  };
}

export function assertSameOrigin(req: NextRequest) {
  const origin = req.headers.get('origin');
  if (!origin) return; // non-browser client or same-origin navigation
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  let originHost = '';
  try {
    originHost = new URL(origin).host;
  } catch {
    throw forbidden('CSRF', 'Invalid origin');
  }
  if (!host || originHost !== host) throw forbidden('CSRF', 'Cross-origin request blocked');
}

export async function readJson(req: NextRequest): Promise<Record<string, unknown>> {
  try {
    const body = await req.json();
    if (body && typeof body === 'object' && !Array.isArray(body)) return body as Record<string, unknown>;
  } catch {
    /* fallthrough */
  }
  throw bad('INVALID_JSON', 'Request body must be a JSON object');
}

export function clientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}

export function baseUrl(req: NextRequest): string {
  const env = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, '');
  if (env) return env;
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? req.nextUrl.host;
  const proto = req.headers.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

/* ───────────── validation helpers ───────────── */

export function str(v: unknown, max: number, opts: { min?: number; field?: string; trim?: boolean } = {}): string {
  const s = typeof v === 'string' ? (opts.trim === false ? v : v.trim()) : '';
  if (s.length < (opts.min ?? 0)) throw bad('VALIDATION', `${opts.field ?? 'Field'} is required`);
  if (s.length > max) throw bad('VALIDATION', `${opts.field ?? 'Field'} is too long (max ${max})`);
  return s;
}

const EMAIL_RE = /^[^\s@,;()<>"']+@[^\s@,;()<>"']+\.[A-Za-z\u0590-\u05FF]{2,}$/;
export function email(v: unknown, field = 'Email'): string {
  const s = str(v, 254, { min: 3, field }).toLowerCase();
  if (!EMAIL_RE.test(s)) throw bad('VALIDATION', `${field} is not valid`);
  return s;
}

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;
export function slug(v: unknown): string {
  const s = str(v, 40, { min: 2, field: 'Tenant ID' }).toLowerCase();
  if (!SLUG_RE.test(s)) throw bad('VALIDATION', 'Tenant ID may contain only a-z, 0-9 and hyphens');
  return s;
}

/* ───────────── in-memory rate limiter ─────────────
 * Best-effort: state lives per serverless instance. Durable account lockout is
 * handled in the database (failed_attempts / locked_until). */
const buckets = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    const retryAfter = Math.max(1, Math.ceil((windowMs - (now - hits[0])) / 1000));
    throw new HttpError(429, 'RATE_LIMITED', 'Too many requests, please try again later', { retryAfter });
  }
  hits.push(now);
  buckets.set(key, hits);
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (!v.length || now - v[v.length - 1] > windowMs) buckets.delete(k);
  }
}
