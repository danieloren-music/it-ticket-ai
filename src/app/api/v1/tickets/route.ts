import { NextRequest, NextResponse } from 'next/server';
import { db, must } from '@/lib/db';
import { requireApiKey } from '@/lib/api-keys';
import { audit } from '@/lib/audit';
import { CATEGORIES, URGENCIES, isOneOf } from '@/lib/constants';
import { bad, clientIp, rateLimit, readJson, route } from '@/lib/http';
import { columnsFor, createTicket, parseTicketInput, type TicketPage, type TicketRow } from '@/lib/tickets';
import { addTicketAutomationsSafely } from '@/lib/automations';

export const runtime = 'nodejs';
const PAGE_SIZE = 200;
const CURSOR_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
const CURSOR_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

export const GET = route(async (req: NextRequest) => {
  const session = await requireApiKey(req, 'tickets:read');
  const before = req.nextUrl.searchParams.get('before');
  const beforeId = req.nextUrl.searchParams.get('beforeId');
  if ((before || beforeId) && (
    !before || !beforeId || !CURSOR_DATE_RE.test(before) || Number.isNaN(Date.parse(before)) || !CURSOR_ID_RE.test(beforeId)
  )) throw bad('VALIDATION', 'Invalid ticket cursor');

  let query = db().from('tickets').select(columnsFor('user'))
    .eq('tenant_id', session.tenantId).order('created_at', { ascending: false }).order('id', { ascending: false });
  if (before && beforeId) query = query.or(`created_at.lt.${before},and(created_at.eq.${before},id.lt.${beforeId})`);
  const rows = (must(await query.limit(PAGE_SIZE + 1)) ?? []) as unknown as TicketRow[];
  const hasMore = rows.length > PAGE_SIZE;
  const tickets = rows.slice(0, PAGE_SIZE);
  const last = tickets[tickets.length - 1];
  const page: TicketPage = {
    tickets,
    hasMore,
    nextCursor: hasMore && last ? { createdAt: last.created_at, id: last.id } : null,
  };
  return NextResponse.json(page);
});

export const POST = route(async (req: NextRequest) => {
  const session = await requireApiKey(req, 'tickets:create');
  rateLimit(`api-ticket:create:${session.apiKeyId}`, 300, 60 * 60_000);
  const body = await readJson(req);
  const allowedFields = new Set([
    'title', 'description', 'category', 'urgency', 'assigned_team', 'system_impacted',
    'reporter_name', 'reporter_email', 'user_city', 'user_phone',
  ]);
  if (Object.keys(body).some((field) => !allowedFields.has(field))) {
    throw bad('VALIDATION', 'Ticket contains an unsupported field');
  }
  if (body.category !== undefined && !isOneOf(CATEGORIES, body.category)) throw bad('VALIDATION', 'Invalid ticket category');
  if (body.urgency !== undefined && !isOneOf(URGENCIES, body.urgency)) throw bad('VALIDATION', 'Invalid ticket urgency');
  if (typeof body.reporter_name !== 'string' || !body.reporter_name.trim() ||
    typeof body.reporter_email !== 'string' || !body.reporter_email.trim()) {
    throw bad('VALIDATION', 'Reporter name and email are required');
  }
  const input = await parseTicketInput({ ...body, source: 'manual' }, session);
  const ticket = await createTicket(session, input);
  const automation = await addTicketAutomationsSafely(session, ticket, input.category);
  await audit({
    tenantId: session.tenantId, actor: session.sub, role: 'API key', action: 'ticket.created',
    target: ticket.ticket_number, meta: { source: 'api', urgency: ticket.urgency, automation }, ip: clientIp(req),
  });
  return NextResponse.json({ success: true, ticket: automation.ticket, automation: { applied: automation.applied, warnings: automation.warnings } }, { status: 201 });
});
