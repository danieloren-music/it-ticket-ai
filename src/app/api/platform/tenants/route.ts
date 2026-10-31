import { NextRequest, NextResponse } from 'next/server';
import { db, must } from '@/lib/db';
import { route, readJson, str, email, slug, bad, HttpError, clientIp } from '@/lib/http';
import { requirePlatform } from '@/lib/auth';
import { generateTempPassword, hashPassword } from '@/lib/password';
import { audit } from '@/lib/audit';
import { DEMO_TENANT, RESERVED_SLUGS } from '@/lib/constants';

const STATUSES = ['Active', 'Suspended', 'Trial'];

export const GET = route(async (req: NextRequest) => {
  await requirePlatform(req);
  const tenants = must(await db().from('tenants').select('*').order('created_at', { ascending: false })) ?? [];

  const [users, tickets] = await Promise.all([
    db().from('tenant_users').select('tenant_id').limit(50000),
    db().from('tickets').select('tenant_id, status').limit(100000),
  ]);
  const userCount: Record<string, number> = {};
  const ticketCount: Record<string, number> = {};
  const openCount: Record<string, number> = {};
  for (const u of (users.data ?? []) as { tenant_id: string }[]) userCount[u.tenant_id] = (userCount[u.tenant_id] ?? 0) + 1;
  for (const t of (tickets.data ?? []) as { tenant_id: string; status: string }[]) {
    ticketCount[t.tenant_id] = (ticketCount[t.tenant_id] ?? 0) + 1;
    if (t.status !== 'Resolved' && t.status !== 'Closed') openCount[t.tenant_id] = (openCount[t.tenant_id] ?? 0) + 1;
  }

  return NextResponse.json({
    tenants: (tenants as { id: string }[]).map((t) => ({
      ...t,
      user_count: userCount[t.id] ?? 0,
      ticket_count: ticketCount[t.id] ?? 0,
      open_tickets: openCount[t.id] ?? 0,
    })),
  });
});

/** Create or update an organization. A new org gets a manager account with a one-time password. */
export const POST = route(async (req: NextRequest) => {
  const session = await requirePlatform(req, { write: true });
  const body = await readJson(req);

  const id = slug(body.id);
  if (RESERVED_SLUGS.has(id) || id === DEMO_TENANT) throw bad('RESERVED_SLUG', 'This tenant ID is reserved');
  const name = str(body.name, 160, { min: 2, field: 'Name' });
  const domain = str(body.domain, 200).toLowerCase() || `${id}.com`;
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) throw bad('VALIDATION', 'Domain is not valid');
  const adminEmail = body.adminEmail ? email(body.adminEmail, 'Admin email') : `admin@${domain}`;
  const status = STATUSES.includes(String(body.status)) ? String(body.status) : 'Active';

  const { data: existing } = await db().from('tenants').select('id').eq('id', id).maybeSingle();

  must(
    await db()
      .from('tenants')
      .upsert({ id, name, domain, primary_domain: domain, admin_email: adminEmail, status, updated_at: new Date().toISOString() }, { onConflict: 'id' })
      .select('id')
  );

  let tempPassword: string | undefined;
  const wantReset = body.resetManagerPassword === true;

  const { data: manager } = await db().from('tenant_users').select('id').eq('tenant_id', id).eq('email', adminEmail).maybeSingle();

  if (!manager) {
    tempPassword = generateTempPassword();
    must(
      await db().from('tenant_users').insert({
        tenant_id: id, email: adminEmail, password_hash: await hashPassword(tempPassword), must_change_password: true,
        full_name: `Administrator (${name})`, role: 'Manager', department: 'IT', site_location: 'Headquarters', is_active: true,
      }).select('id')
    );
  } else if (wantReset) {
    tempPassword = generateTempPassword();
    await db().from('tenant_users').update({
      password_hash: await hashPassword(tempPassword), must_change_password: true, failed_attempts: 0, locked_until: null, is_active: true,
    }).eq('id', manager.id);
  }

  await audit({
    tenantId: id, actor: session.sub, role: session.role,
    action: existing ? (wantReset ? 'tenant.manager_password_reset' : 'tenant.updated') : 'tenant.created',
    target: id, meta: { status }, ip: clientIp(req),
  });
  return NextResponse.json({ success: true, created: !existing, tempPassword, managerEmail: adminEmail }, { status: existing ? 200 : 201 });
});

export const DELETE = route(async (req: NextRequest) => {
  const session = await requirePlatform(req, { write: true });
  if (session.role !== 'Super Admin') throw new HttpError(403, 'FORBIDDEN', 'Only a Super Admin can delete an organization');
  const id = slug(req.nextUrl.searchParams.get('id'));
  if (req.nextUrl.searchParams.get('confirm') !== id) throw bad('CONFIRMATION_REQUIRED', 'Type the tenant ID to confirm deletion');

  // Children first - no dependency on ON DELETE CASCADE being configured.
  for (const table of ['ticket_events', 'tickets', 'tenant_users', 'tenant_settings', 'audit_log']) {
    const { error } = await db().from(table).delete().eq('tenant_id', id);
    if (error) throw new Error(`${table}: ${error.message}`);
  }
  must(await db().from('tenants').delete().eq('id', id).select('id'));
  await audit({ actor: session.sub, role: session.role, action: 'tenant.deleted', target: id, ip: clientIp(req) });
  return NextResponse.json({ success: true });
});
