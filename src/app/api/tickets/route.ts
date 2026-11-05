import { NextRequest, NextResponse } from 'next/server';
import { db, must } from '@/lib/db';
import { route, readJson, rateLimit, clientIp, bad } from '@/lib/http';
import { requireTenant } from '@/lib/auth';
import { columnsFor, createTicket, parseTicketInput, type TicketPage, type TicketRow } from '@/lib/tickets';
import { audit } from '@/lib/audit';
import { addTicketAutomationsSafely } from '@/lib/automations';

const PAGE_SIZE = 500;
const CURSOR_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
const CURSOR_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

/** Employees get their own tickets; IT staff get the whole tenant queue. */
export const GET = route(async (req: NextRequest) => {
  const session = await requireTenant(req);
  const before = req.nextUrl.searchParams.get('before');
  const beforeId = req.nextUrl.searchParams.get('beforeId');
  const hasCursor = before !== null || beforeId !== null;
  if (hasCursor && (
    !before ||
    !beforeId ||
    !CURSOR_DATE_RE.test(before) ||
    Number.isNaN(Date.parse(before)) ||
    !CURSOR_ID_RE.test(beforeId)
  )) {
    throw bad('VALIDATION', 'Invalid ticket cursor');
  }

  let q = db()
    .from('tickets')
    .select(columnsFor(session.role))
    .eq('tenant_id', session.tenantId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false });
  if (session.role === 'user' && !session.permissions?.some((permission) => permission === 'tickets:read_all' || permission === 'tickets:update')) {
    q = q.eq('reporter_email', session.sub);
  }
  if (before && beforeId) {
    q = q.or(`created_at.lt.${before},and(created_at.eq.${before},id.lt.${beforeId})`);
  }

  const rows = (must(await q.limit(PAGE_SIZE + 1)) ?? []) as unknown as TicketRow[];
  const hasMore = rows.length > PAGE_SIZE;
  const tickets = rows.slice(0, PAGE_SIZE);
  const lastTicket = tickets[tickets.length - 1];
  const page: TicketPage = {
    tickets,
    hasMore,
    nextCursor: hasMore && lastTicket ? { createdAt: lastTicket.created_at, id: lastTicket.id } : null,
  };
  return NextResponse.json(page);
});

export const POST = route(async (req: NextRequest) => {
  const session = await requireTenant(req);
  rateLimit(`ticket:create:${session.tenantId}:${session.sub}`, session.demo ? 5 : 30, 60 * 60_000);
  if (session.demo) rateLimit(`ticket:create:demo-ip:${clientIp(req)}`, 8, 60 * 60_000);

  const input = await parseTicketInput(await readJson(req), session);
  const ticket = await createTicket(session, input);
  const automation = await addTicketAutomationsSafely(session, ticket, input.category);
  await audit({
    tenantId: session.tenantId, actor: session.sub, role: session.role, action: 'ticket.created',
    target: ticket.ticket_number, meta: { urgency: ticket.urgency, team: automation.ticket.assigned_team, source: input.source, automation: automation.applied }, ip: clientIp(req),
  });
  return NextResponse.json({
    success: true,
    ticket: automation.ticket,
    automation: { applied: automation.applied, warnings: automation.warnings },
  }, { status: 201 });
});
