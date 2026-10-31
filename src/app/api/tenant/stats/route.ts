import { NextRequest, NextResponse } from 'next/server';
import { db, must } from '@/lib/db';
import { route } from '@/lib/http';
import { requireTenant } from '@/lib/auth';

interface Row {
  category: string; urgency: string; status: string; assigned_team: string;
  created_at: string; resolved_at: string | null; sla_due_at: string | null; first_response_at: string | null;
}

/** Live KPIs computed from real tickets of the last 90 days. */
export const GET = route(async (req: NextRequest) => {
  const session = await requireTenant(req, { roles: ['admin', 'manager'] });
  const since = new Date(Date.now() - 90 * 86400_000).toISOString();
  const rows = (must(
    await db()
      .from('tickets')
      .select('category, urgency, status, assigned_team, created_at, resolved_at, sla_due_at, first_response_at')
      .eq('tenant_id', session.tenantId)
      .gte('created_at', since)
      .limit(5000)
  ) ?? []) as Row[];

  const now = Date.now();
  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
  const isDone = (s: string) => s === 'Resolved' || s === 'Closed';

  const open = rows.filter((r) => !isDone(r.status));
  const resolved = rows.filter((r) => isDone(r.status) && r.resolved_at);
  const resolutionMinutes = resolved.map((r) => (new Date(r.resolved_at!).getTime() - new Date(r.created_at).getTime()) / 60000);
  const avgResolutionMinutes = resolutionMinutes.length ? Math.round(resolutionMinutes.reduce((a, b) => a + b, 0) / resolutionMinutes.length) : null;

  const withSla = rows.filter((r) => r.sla_due_at);
  const met = withSla.filter((r) => {
    const due = new Date(r.sla_due_at!).getTime();
    return isDone(r.status) && r.resolved_at ? new Date(r.resolved_at).getTime() <= due : due >= now;
  });
  const breachedOpen = open.filter((r) => r.sla_due_at && new Date(r.sla_due_at).getTime() < now).length;

  const count = (key: 'category' | 'urgency' | 'status' | 'assigned_team') => {
    const m: Record<string, number> = {};
    for (const r of rows) m[r[key]] = (m[r[key]] ?? 0) + 1;
    return m;
  };

  const days: { date: string; count: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
    days.push({ date: d.toISOString().slice(0, 10), count: 0 });
  }
  for (const r of rows) {
    const key = new Date(r.created_at).toISOString().slice(0, 10);
    const slot = days.find((d) => d.date === key);
    if (slot) slot.count++;
  }

  return NextResponse.json({
    totals: {
      today: rows.filter((r) => new Date(r.created_at) >= startOfToday).length,
      open: open.length,
      critical_open: open.filter((r) => r.urgency === 'Critical').length,
      breached_open: breachedOpen,
      resolved: resolved.length,
      total: rows.length,
    },
    avg_resolution_minutes: avgResolutionMinutes,
    sla_compliance: withSla.length ? Math.round((met.length / withSla.length) * 100) : null,
    by_category: count('category'),
    by_urgency: count('urgency'),
    by_status: count('status'),
    by_team: count('assigned_team'),
    daily: days,
  });
});
