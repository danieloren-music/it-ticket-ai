import { NextRequest, NextResponse } from 'next/server';
import { route, readJson, clientIp, rateLimit, notFoundErr } from '@/lib/http';
import { requireTenant } from '@/lib/auth';
import { addComment, assertStaff, getTicketForSession, listEvents, updateTicket } from '@/lib/tickets';
import { audit } from '@/lib/audit';

type Ctx = { params: Promise<{ id: string }> };

const UUID_RE = /^[A-Za-z0-9_-]{1,64}$/;
async function idOf(ctx: Ctx) {
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) throw notFoundErr('Ticket');
  return id;
}

/** Ticket + timeline (internal notes only visible to staff). */
export const GET = route<Ctx>(async (req, ctx) => {
  const session = await requireTenant(req);
  const id = await idOf(ctx);
  const [ticket, events] = await Promise.all([getTicketForSession(session, id), listEvents(session, id)]);
  return NextResponse.json({ ticket, events });
});

/** Staff-only field updates (status, urgency, team, assignee, notes). */
export const PATCH = route<Ctx>(async (req: NextRequest, ctx) => {
  const session = await requireTenant(req, { permission: 'tickets:update' });
  const id = await idOf(ctx);
  const ticket = await updateTicket(session, id, await readJson(req));
  await audit({
    tenantId: session.tenantId, actor: session.sub, role: session.role, action: 'ticket.updated',
    target: ticket.ticket_number, ip: clientIp(req),
  });
  return NextResponse.json({ success: true, ticket });
});

/** Add a public reply or (staff only) an internal note. */
export const POST = route<Ctx>(async (req: NextRequest, ctx) => {
  const session = await requireTenant(req);
  rateLimit(`ticket:comment:${session.tenantId}:${session.sub}`, session.demo ? 10 : 60, 60 * 60_000);
  const id = await idOf(ctx);
  const body = await readJson(req);
  if (body.internal === true) assertStaff(session);
  await addComment(session, id, body);
  return NextResponse.json({ success: true }, { status: 201 });
});
