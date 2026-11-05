import { NextRequest, NextResponse } from 'next/server';
import { db, must } from '@/lib/db';
import { bad, clientIp, email, HttpError, readJson, route, str } from '@/lib/http';
import { requireTenant } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { TENANT_PERMISSIONS, TEAMS, type TenantPermission } from '@/lib/constants';

const ID_RE = /^[0-9a-f-]{36}$/i;
const KINDS = ['access', 'team'] as const;

export const GET = route(async (req: NextRequest) => {
  const session = await requireTenant(req, { permission: 'groups:manage' });
  const groups = must(await db().from('tenant_groups').select('*').eq('tenant_id', session.tenantId).order('name'));
  const ids = (groups ?? []).map((group) => group.id);
  const [members, users] = await Promise.all([
    ids.length
      ? db().from('tenant_group_members').select('group_id, user_email').eq('tenant_id', session.tenantId).in('group_id', ids)
      : Promise.resolve({ data: [], error: null }),
    db().from('tenant_users').select('email, full_name, role, is_active').eq('tenant_id', session.tenantId).order('full_name'),
  ]);
  if (members.error) throw new Error(`Could not load group members: ${members.error.message}`);
  const userRows = must(users) ?? [];
  const eligibleByEmail = new Map(
    userRows
      .filter((user) => user.is_active !== false)
      .map((user) => [user.email.toLowerCase(), user.role] as const),
  );
  return NextResponse.json({
    groups: (groups ?? []).map((group) => ({
      ...group,
      members: (members.data ?? [])
        .filter((member) => {
          if (member.group_id !== group.id) return false;
          const role = eligibleByEmail.get(member.user_email.toLowerCase());
          return role !== undefined && (group.kind !== 'team' || role !== 'User');
        })
        .map((member) => member.user_email),
    })),
    users: userRows,
  });
});

export const POST = route(async (req: NextRequest) => {
  const session = await requireTenant(req, { permission: 'groups:manage', blockDemo: true });
  const body = await readJson(req);
  const id = typeof body.id === 'string' && body.id ? body.id : undefined;
  if (id && !ID_RE.test(id)) throw bad('VALIDATION', 'Invalid group ID');
  if (!(KINDS as readonly unknown[]).includes(body.kind)) throw bad('VALIDATION', 'Invalid group type');
  const name = str(body.name, 120, { min: 2, field: 'Group name' });
  const kind = body.kind as (typeof KINDS)[number];
  if (kind === 'team' && (TEAMS as readonly string[]).some((team) => team.toLowerCase() === name.toLowerCase())) {
    throw bad('VALIDATION', 'Choose a name that is different from the built-in IT teams');
  }
  if (id) {
    const existing = must(await db().from('tenant_groups').select('kind')
      .eq('tenant_id', session.tenantId).eq('id', id).maybeSingle());
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Group not found');
    if (existing.kind !== kind) throw bad('VALIDATION', 'A group cannot change its type after creation');
    if (existing.kind === 'access' && session.role !== 'manager') {
      throw new HttpError(403, 'FORBIDDEN', 'Only an organization administrator can change access groups');
    }
  }
  const description = str(body.description, 500);
  const permissions = Array.isArray(body.permissions) ? body.permissions : [];
  if (permissions.some((permission) => !TENANT_PERMISSIONS.includes(permission as TenantPermission))) {
    throw bad('VALIDATION', 'Group contains an unsupported permission');
  }
  if (kind === 'team' && permissions.length) throw bad('VALIDATION', 'IT teams cannot define access permissions');
  if (session.role !== 'manager' && (kind === 'access' || permissions.length)) {
    throw new HttpError(403, 'FORBIDDEN', 'Only an organization administrator can change access groups or permissions');
  }
  const members = Array.isArray(body.members)
    ? [...new Set(body.members.map((member) => email(member, 'Member email')))]
    : [];

  if (members.length) {
    const users = must(await db().from('tenant_users').select('email, role, is_active')
      .eq('tenant_id', session.tenantId).in('email', members));
    const active = new Map((users ?? []).filter((user) => user.is_active !== false).map((user) => [user.email.toLowerCase(), user]));
    if (members.some((member) => !active.has(member))) throw bad('VALIDATION', 'Every group member must be an active user in this organization');
    if (kind === 'team' && members.some((member) => active.get(member)?.role === 'User')) {
      throw bad('VALIDATION', 'IT teams can only include IT technicians or administrators');
    }
  }

  const values = {
    tenant_id: session.tenantId,
    name,
    kind,
    description,
    permissions: kind === 'access' ? permissions as TenantPermission[] : [],
    updated_at: new Date().toISOString(),
  };
  const group = id
    ? must(await db().from('tenant_groups').update(values).eq('tenant_id', session.tenantId).eq('id', id).select('id').maybeSingle())
    : must(await db().from('tenant_groups').insert({ ...values, created_at: new Date().toISOString() }).select('id').single());
  if (!group) throw new HttpError(404, 'NOT_FOUND', 'Group not found');

  must(await db().from('tenant_group_members').delete().eq('tenant_id', session.tenantId).eq('group_id', group.id));
  if (members.length) {
    must(await db().from('tenant_group_members').insert(members.map((user_email) => ({
      tenant_id: session.tenantId, group_id: group.id, user_email,
    }))));
  }
  await audit({
    tenantId: session.tenantId, actor: session.sub, role: session.role,
    action: id ? 'group.updated' : 'group.created', target: String(group.id),
    meta: { name, kind, memberCount: members.length, permissions }, ip: clientIp(req),
  });
  return NextResponse.json({ success: true, id: group.id }, { status: id ? 200 : 201 });
});

export const DELETE = route(async (req: NextRequest) => {
  const session = await requireTenant(req, { permission: 'groups:manage', blockDemo: true });
  const id = req.nextUrl.searchParams.get('id') ?? '';
  if (!ID_RE.test(id)) throw bad('VALIDATION', 'Invalid group ID');
  const group = must(await db().from('tenant_groups').select('id, name, kind')
    .eq('tenant_id', session.tenantId).eq('id', id).maybeSingle());
  if (!group) throw new HttpError(404, 'NOT_FOUND', 'Group not found');
  if (group.kind === 'access' && session.role !== 'manager') {
    throw new HttpError(403, 'FORBIDDEN', 'Only an organization administrator can delete access groups');
  }
  if (group.kind === 'team') {
    const openResult = await db().from('tickets').select('id', { count: 'exact', head: true })
      .eq('tenant_id', session.tenantId).eq('assigned_team', group.name)
      .not('status', 'in', '("Resolved","Closed")');
    must(openResult);
    if ((openResult.count ?? 0) > 0) throw new HttpError(409, 'TEAM_HAS_OPEN_TICKETS', 'Reassign open tickets before deleting this IT team');
  }
  must(await db().from('tenant_groups').delete().eq('tenant_id', session.tenantId).eq('id', id).select('id'));
  await audit({ tenantId: session.tenantId, actor: session.sub, role: session.role, action: 'group.deleted', target: group.name, ip: clientIp(req) });
  return NextResponse.json({ success: true });
});
