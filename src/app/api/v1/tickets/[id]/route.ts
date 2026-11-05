import { NextRequest, NextResponse } from 'next/server';
import { requireApiKey } from '@/lib/api-keys';
import { audit } from '@/lib/audit';
import { bad, clientIp, notFoundErr, rateLimit, readJson, route } from '@/lib/http';
import { getTicketForSession, updateTicket } from '@/lib/tickets';

type Context = { params: Promise<{ id: string }> };
const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

export const GET = route<Context>(async (req: NextRequest, context) => {
  const session = await requireApiKey(req, 'tickets:read');
  rateLimit(`api-ticket:read:${session.apiKeyId}`, 600, 60_000);
  const { id } = await context.params;
  if (!ID_RE.test(id)) throw notFoundErr('Ticket');
  const ticket = await getTicketForSession(session, id);
  const publicTicket = { ...ticket };
  delete publicTicket.admin_internal_notes;
  return NextResponse.json({ ticket: publicTicket });
});

export const PATCH = route<Context>(async (req: NextRequest, context) => {
  const session = await requireApiKey(req, 'tickets:update');
  rateLimit(`api-ticket:update:${session.apiKeyId}`, 300, 60_000);
  const { id } = await context.params;
  if (!ID_RE.test(id)) throw notFoundErr('Ticket');
  const body = await readJson(req);
  const allowedFields = new Set(['status', 'urgency', 'assigned_team', 'assigned_technician']);
  if (Object.keys(body).some((field) => !allowedFields.has(field))) {
    throw bad('VALIDATION', 'Only status, urgency, assigned team, and technician can be updated through the public API');
  }
  const ticket = await updateTicket(session, id, body);
  await audit({
    tenantId: session.tenantId, actor: session.sub, role: 'API key', action: 'ticket.updated',
    target: ticket.ticket_number, ip: clientIp(req),
  });
  const publicTicket = { ...ticket };
  delete publicTicket.admin_internal_notes;
  return NextResponse.json({ success: true, ticket: publicTicket });
});
