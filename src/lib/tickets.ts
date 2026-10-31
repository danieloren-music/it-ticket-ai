import { randomInt } from 'node:crypto';
import { db, must } from './db';
import {
  CATEGORIES, STATUSES, TEAMS, URGENCIES, Urgency, TicketStatus, isOneOf, slaDueAt,
} from './constants';
import { TenantSession } from './session';
import { HttpError, bad, forbidden, notFoundErr, str, email as emailField } from './http';

const BASE_COLUMNS =
  'id, ticket_number, title, description, category, urgency, status, system_impacted, assigned_team, assigned_technician, ' +
  'reporter_name, reporter_email, user_city, user_phone, created_at, updated_at, resolved_at, first_response_at, sla_due_at, source';

/** Staff can additionally see the internal notes. */
export const columnsFor = (role: TenantSession['role']) =>
  role === 'user' ? BASE_COLUMNS : `${BASE_COLUMNS}, admin_internal_notes`;

export interface TicketRow {
  id: string;
  ticket_number: string;
  title: string;
  description: string;
  category: string;
  urgency: Urgency;
  status: TicketStatus;
  system_impacted: string | null;
  assigned_team: string;
  assigned_technician: string | null;
  admin_internal_notes?: string | null;
  reporter_name: string | null;
  reporter_email: string | null;
  user_city: string | null;
  user_phone: string | null;
  created_at: string;
  updated_at: string | null;
  resolved_at: string | null;
  first_response_at: string | null;
  sla_due_at: string | null;
  source: string | null;
}

export interface TicketEvent {
  id: string;
  ticket_id: string;
  actor: string;
  type: 'created' | 'status' | 'urgency' | 'team' | 'assignee' | 'comment' | 'note';
  from_value: string | null;
  to_value: string | null;
  body: string | null;
  internal: boolean;
  created_at: string;
}

export async function addEvent(
  tenantId: string,
  ticketId: string,
  actor: string,
  type: TicketEvent['type'],
  extra: { from?: string | null; to?: string | null; body?: string | null; internal?: boolean } = {}
) {
  const { error } = await db().from('ticket_events').insert({
    tenant_id: tenantId,
    ticket_id: ticketId,
    actor,
    type,
    from_value: extra.from ?? null,
    to_value: extra.to ?? null,
    body: extra.body ?? null,
    internal: extra.internal ?? false,
  });
  if (error) console.warn('[tickets] failed to write event:', error.message);
}

async function uniqueTicketNumber(tenantId: string): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const candidate = String(randomInt(100000, 1000000));
    const { data } = await db()
      .from('tickets')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('ticket_number', candidate)
      .maybeSingle();
    if (!data) return candidate;
  }
  throw new Error('Could not allocate a unique ticket number');
}

export interface CreateTicketInput {
  title: string;
  description: string;
  category: string;
  urgency: Urgency;
  assigned_team: string;
  system_impacted: string;
  user_city: string;
  user_phone: string;
  reporter_name: string;
  reporter_email: string;
  source: 'ai' | 'manual';
}

/** Validates untrusted form input. Reporter identity falls back to the session. */
export function parseTicketInput(body: Record<string, unknown>, session: TenantSession): CreateTicketInput {
  const category = isOneOf(CATEGORIES, body.category) ? body.category : 'General IT Request';
  const urgency = isOneOf(URGENCIES, body.urgency) ? body.urgency : 'Medium';
  const team = isOneOf(TEAMS, body.assigned_team) ? body.assigned_team : 'Helpdesk Tier 1';

  // Employees can only file tickets in their own name; staff may file on behalf of someone.
  const staff = session.role !== 'user';
  const reporterEmail = staff && typeof body.reporter_email === 'string' && body.reporter_email.trim()
    ? emailField(body.reporter_email, 'Reporter email')
    : session.sub;
  const reporterName = staff && typeof body.reporter_name === 'string' && body.reporter_name.trim()
    ? str(body.reporter_name, 120)
    : session.name;

  return {
    title: str(body.title, 160, { min: 3, field: 'Title' }),
    description: str(body.description, 4000, { min: 3, field: 'Description' }),
    category,
    urgency,
    assigned_team: team,
    system_impacted: str(body.system_impacted, 160),
    user_city: str(body.user_city, 120),
    user_phone: str(body.user_phone, 40),
    reporter_name: reporterName,
    reporter_email: reporterEmail,
    source: body.source === 'ai' ? 'ai' : 'manual',
  };
}

export async function createTicket(session: TenantSession, input: CreateTicketInput): Promise<TicketRow> {
  const ticketNumber = await uniqueTicketNumber(session.tenantId);
  const now = new Date();

  const row = must(
    await db()
      .from('tickets')
      .insert({
        tenant_id: session.tenantId,
        ticket_number: ticketNumber,
        title: input.title,
        description: input.description,
        category: input.category,
        urgency: input.urgency,
        status: 'Open',
        system_impacted: input.system_impacted,
        assigned_team: input.assigned_team,
        reporter_name: input.reporter_name,
        reporter_email: input.reporter_email,
        // legacy columns kept in sync for backwards compatibility
        user_name: input.reporter_name,
        user_email: input.reporter_email,
        user_city: input.user_city,
        user_phone: input.user_phone,
        sla_due_at: slaDueAt(now, input.urgency).toISOString(),
        source: input.source,
      })
      .select(columnsFor(session.role))
      .single()
  ) as unknown as TicketRow;

  await addEvent(session.tenantId, row.id, session.sub, 'created', { to: input.assigned_team });
  return row;
}

export async function getTicketForSession(session: TenantSession, id: string): Promise<TicketRow> {
  const { data, error } = await db()
    .from('tickets')
    .select(columnsFor(session.role))
    .eq('tenant_id', session.tenantId)
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const row = data as unknown as TicketRow | null;
  if (!row) throw notFoundErr('Ticket');
  if (session.role === 'user' && row.reporter_email?.toLowerCase() !== session.sub.toLowerCase()) {
    throw notFoundErr('Ticket'); // do not leak existence
  }
  return row;
}

/** Staff-only field updates. Returns the updated row. */
export async function updateTicket(
  session: TenantSession,
  id: string,
  body: Record<string, unknown>
): Promise<TicketRow> {
  const current = await getTicketForSession(session, id);
  const patch: Record<string, unknown> = {};
  const events: Parameters<typeof addEvent>[3][] = [];
  const eventArgs: Parameters<typeof addEvent>[4][] = [];

  if (body.status !== undefined) {
    if (!isOneOf(STATUSES, body.status)) throw bad('VALIDATION', 'Invalid status');
    if (body.status !== current.status) {
      patch.status = body.status;
      const closing = body.status === 'Resolved' || body.status === 'Closed';
      patch.resolved_at = closing ? current.resolved_at ?? new Date().toISOString() : null;
      if (!current.first_response_at && body.status !== 'Open') patch.first_response_at = new Date().toISOString();
      events.push('status');
      eventArgs.push({ from: current.status, to: body.status });
    }
  }
  if (body.urgency !== undefined) {
    if (!isOneOf(URGENCIES, body.urgency)) throw bad('VALIDATION', 'Invalid urgency');
    if (body.urgency !== current.urgency) {
      patch.urgency = body.urgency;
      patch.sla_due_at = slaDueAt(new Date(current.created_at), body.urgency).toISOString();
      events.push('urgency');
      eventArgs.push({ from: current.urgency, to: body.urgency });
    }
  }
  if (body.assigned_team !== undefined) {
    if (!isOneOf(TEAMS, body.assigned_team)) throw bad('VALIDATION', 'Invalid team');
    if (body.assigned_team !== current.assigned_team) {
      patch.assigned_team = body.assigned_team;
      events.push('team');
      eventArgs.push({ from: current.assigned_team, to: body.assigned_team });
    }
  }
  if (body.assigned_technician !== undefined) {
    const tech = str(body.assigned_technician, 120);
    if (tech !== (current.assigned_technician ?? '')) {
      patch.assigned_technician = tech;
      events.push('assignee');
      eventArgs.push({ from: current.assigned_technician ?? '', to: tech });
    }
  }
  if (body.admin_internal_notes !== undefined) {
    patch.admin_internal_notes = str(body.admin_internal_notes, 4000);
  }
  if (body.user_city !== undefined) patch.user_city = str(body.user_city, 120);

  if (Object.keys(patch).length === 0) return current;
  patch.updated_at = new Date().toISOString();

  const updated = must(
    await db()
      .from('tickets')
      .update(patch)
      .eq('tenant_id', session.tenantId)
      .eq('id', id)
      .select(columnsFor(session.role))
      .single()
  ) as unknown as TicketRow;

  await Promise.all(events.map((type, i) => addEvent(session.tenantId, id, session.sub, type, eventArgs[i])));
  return updated;
}

export async function addComment(
  session: TenantSession,
  id: string,
  body: Record<string, unknown>
): Promise<void> {
  const ticket = await getTicketForSession(session, id);
  const text = str(body.body, 2000, { min: 1, field: 'Comment' });
  const staff = session.role !== 'user';
  const internal = staff && body.internal === true;

  if (ticket.status === 'Closed') throw new HttpError(409, 'TICKET_CLOSED', 'This ticket is closed');

  await addEvent(session.tenantId, id, session.sub, internal ? 'note' : 'comment', { body: text, internal });

  if (staff && !internal && !ticket.first_response_at) {
    await db()
      .from('tickets')
      .update({ first_response_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('tenant_id', session.tenantId)
      .eq('id', id);
  }
}

export async function listEvents(session: TenantSession, ticketId: string): Promise<TicketEvent[]> {
  await getTicketForSession(session, ticketId); // authorization
  let q = db()
    .from('ticket_events')
    .select('id, ticket_id, actor, type, from_value, to_value, body, internal, created_at')
    .eq('tenant_id', session.tenantId)
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true })
    .limit(300);
  if (session.role === 'user') q = q.eq('internal', false);
  return (must(await q) ?? []) as unknown as TicketEvent[];
}

export function assertStaff(session: TenantSession) {
  if (session.role === 'user') throw forbidden();
}
