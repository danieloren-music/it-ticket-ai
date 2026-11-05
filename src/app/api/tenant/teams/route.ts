import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/auth';
import { TEAMS } from '@/lib/constants';
import { db, must } from '@/lib/db';
import { route } from '@/lib/http';

export const GET = route(async (req: NextRequest) => {
  const session = await requireTenant(req);
  const groups = must(await db().from('tenant_groups').select('name').eq('tenant_id', session.tenantId).eq('kind', 'team').order('name'));
  return NextResponse.json({ teams: [...TEAMS, ...(groups ?? []).map((group) => group.name)] });
});
