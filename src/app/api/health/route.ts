import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

/** Liveness + database reachability for uptime monitors. Reveals nothing sensitive. */
export async function GET() {
  const started = Date.now();
  let database = 'ok';
  try {
    const { error } = await db().from('tenants').select('id', { head: true, count: 'exact' }).limit(1);
    if (error) database = 'error';
  } catch {
    database = 'error';
  }
  return NextResponse.json(
    { status: database === 'ok' ? 'ok' : 'degraded', database, latency_ms: Date.now() - started },
    { status: database === 'ok' ? 200 : 503, headers: { 'Cache-Control': 'no-store' } }
  );
}
