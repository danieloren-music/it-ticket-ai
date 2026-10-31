import { NextRequest, NextResponse } from 'next/server';
import { db, must } from '@/lib/db';
import { route } from '@/lib/http';
import { requirePlatform } from '@/lib/auth';

export const GET = route(async (req: NextRequest) => {
  await requirePlatform(req);
  const tenant = req.nextUrl.searchParams.get('tenant');
  let q = db()
    .from('audit_log')
    .select('id, tenant_id, actor_email, actor_role, action, target, meta, ip, created_at')
    .order('created_at', { ascending: false })
    .limit(200);
  if (tenant && /^[a-z0-9-]{2,40}$/.test(tenant)) q = q.eq('tenant_id', tenant);
  return NextResponse.json({ entries: must(await q) ?? [] });
});
