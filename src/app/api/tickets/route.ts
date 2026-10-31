import { NextRequest, NextResponse } from 'next/server';
import { db, must } from '@/lib/db';
import { route, readJson, rateLimit, clientIp } from '@/lib/http';
import { requireTenant } from '@/lib/auth';
import { columnsFor, createTicket, parseTicketInput, TicketRow } from '@/lib/tickets';
import { audit } from '@/lib/audit';

/** Employees get their own tickets; IT staff get the whole tenant queue. */
export const GET = route(async (req: NextRequest) => {
  const session = await requireTenant(req);
  let q = db()
    .from('tickets')
    .select(columnsFor(session.role))
    .eq('tenant_id', session.tenantId)
    .order('created_at', { ascending: false })
    .limit(500);
  if (session.role === 'user') q = q.eq('reporter_email', session.sub);
  const tickets = (must(await q) ?? []) as unknown as TicketRow[];
  return NextResponse.json({ tickets });
});

export const POST = route(async (req: NextRequest) => {
  const session = await requireTenant(req);
  rateLimit(`ticket:create:${session.tenantId}:${session.sub}`, session.demo ? 5 : 30, 60 * 60_000);
  if (session.demo) rateLimit(`ticket:create:demo-ip:${clientIp(req)}`, 8, 60 * 60_000);

  const input = parseTicketInput(await readJson(req), session);
  const ticket = await createTicket(session, input);
  await audit({
    tenantId: session.tenantId, actor: session.sub, role: session.role, action: 'ticket.created',
    target: ticket.ticket_number, meta: { urgency: ticket.urgency, team: ticket.assigned_team, source: input.source }, ip: clientIp(req),
  });
  return NextResponse.json({ success: true, ticket }, { status: 201 });
});
