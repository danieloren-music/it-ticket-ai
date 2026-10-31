import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { route } from '@/lib/http';
import { requirePlatform } from '@/lib/auth';

/** Real vendor-level numbers (no placeholders): tenants, users, ticket volume and inbound leads. */
export const GET = route(async (req: NextRequest) => {
  await requirePlatform(req);
  const since = new Date(Date.now() - 14 * 86400_000).toISOString();

  const [tenants, users, tickets, recent, leads, aiTickets] = await Promise.all([
    db().from('tenants').select('id, status'),
    db().from('tenant_users').select('id', { count: 'exact', head: true }),
    db().from('tickets').select('id, status', { count: 'exact' }).limit(100000),
    db().from('tickets').select('created_at, tenant_id, urgency').gte('created_at', since).limit(20000),
    db().from('contact_requests').select('id, name, email, company, phone, message, created_at').order('created_at', { ascending: false }).limit(25),
    db().from('tickets').select('id', { count: 'exact', head: true }).eq('source', 'ai'),
  ]);

  const tenantRows = (tenants.data ?? []) as { id: string; status: string }[];
  const ticketRows = (tickets.data ?? []) as { status: string }[];
  const days: { date: string; count: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
    days.push({ date: d.toISOString().slice(0, 10), count: 0 });
  }
  for (const r of (recent.data ?? []) as { created_at: string }[]) {
    const slot = days.find((d) => d.date === new Date(r.created_at).toISOString().slice(0, 10));
    if (slot) slot.count++;
  }

  return NextResponse.json({
    tenants: { total: tenantRows.length, active: tenantRows.filter((t) => String(t.status).toLowerCase() === 'active').length },
    users: users.count ?? 0,
    tickets: {
      total: tickets.count ?? ticketRows.length,
      open: ticketRows.filter((t) => t.status !== 'Resolved' && t.status !== 'Closed').length,
      ai_created: aiTickets.count ?? 0,
    },
    daily: days,
    leads: leads.data ?? [],
  });
});
