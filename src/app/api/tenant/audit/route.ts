import { NextRequest, NextResponse } from 'next/server';
import { db, must } from '@/lib/db';
import { route } from '@/lib/http';
import { requireTenant } from '@/lib/auth';

export const GET = route(async (req: NextRequest) => {
  const session = await requireTenant(req, { roles: ['manager'] });
  const entries = must(
    await db()
      .from('audit_log')
      .select('id, actor_email, actor_role, action, target, meta, ip, created_at')
      .eq('tenant_id', session.tenantId)
      .order('created_at', { ascending: false })
      .limit(200)
  );
  return NextResponse.json({ entries: entries ?? [] });
});
