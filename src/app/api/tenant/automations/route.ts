import { randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { db, must } from '@/lib/db';
import { audit } from '@/lib/audit';
import { CATEGORIES, TEAMS } from '@/lib/constants';
import { requireTenant } from '@/lib/auth';
import { bad, clientIp, HttpError, readJson, route, str } from '@/lib/http';
import { decryptIdpSecret, encryptIdpSecret } from '@/lib/idp-secrets';
import { validateWebhookUrl } from '@/lib/webhooks';

const ID_RE = /^[0-9a-f-]{36}$/i;
const TYPES = ['category_routing', 'auto_assignment', 'sla_escalation', 'idle_close', 'webhook'] as const;
const WEBHOOK_EVENTS = ['ticket.created', 'ticket.sla_escalated', 'ticket.auto_closed'] as const;

async function validateTeam(tenantId: string, value: unknown, required: boolean): Promise<string> {
  const team = str(value, 120, { min: required ? 2 : 0, field: 'IT team' });
  if (!team) return '';
  if ((TEAMS as readonly string[]).includes(team)) return team;
  const row = must(await db().from('tenant_groups').select('id').eq('tenant_id', tenantId).eq('kind', 'team').eq('name', team).maybeSingle());
  if (!row) throw bad('VALIDATION', 'Choose an existing IT team');
  return team;
}

async function normalizeRule(tenantId: string, type: string, value: unknown): Promise<Record<string, unknown>> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw bad('VALIDATION', 'Automation settings are required');
  const config = value as Record<string, unknown>;
  if (type === 'category_routing') {
    if (!(CATEGORIES as readonly unknown[]).includes(config.category)) throw bad('VALIDATION', 'Choose a supported request category');
    return { category: config.category, team: await validateTeam(tenantId, config.team, true) };
  }
  if (type === 'auto_assignment') {
    return { team: await validateTeam(tenantId, config.team, false) };
  }
  if (type === 'sla_escalation') {
    const minutesBeforeDue = Number(config.minutesBeforeDue);
    if (!Number.isInteger(minutesBeforeDue) || minutesBeforeDue < 0 || minutesBeforeDue > 10080) {
      throw bad('VALIDATION', 'Escalation window must be between 0 and 10080 minutes');
    }
    return { minutesBeforeDue, team: await validateTeam(tenantId, config.team, false) };
  }
  if (type === 'idle_close') {
    const idleHours = Number(config.idleHours);
    if (!Number.isInteger(idleHours) || idleHours < 1 || idleHours > 720) {
      throw bad('VALIDATION', 'Idle period must be between 1 and 720 hours');
    }
    return { idleHours };
  }
  if (type === 'webhook') {
    if (!(WEBHOOK_EVENTS as readonly unknown[]).includes(config.event)) throw bad('VALIDATION', 'Choose a supported webhook event');
    const url = str(config.url, 2000, { min: 1, field: 'Webhook URL' });
    try { validateWebhookUrl(url); } catch (error) {
      throw bad('VALIDATION', error instanceof Error ? error.message : 'Webhook URL is invalid');
    }
    return { event: config.event, url };
  }
  throw bad('VALIDATION', 'Unsupported automation type');
}

export const GET = route(async (req: NextRequest) => {
  const session = await requireTenant(req, { permission: 'automations:manage' });
  const rules = must(await db().from('tenant_automation_rules')
    .select('id, name, trigger_type, config, enabled, created_at, updated_at, secret_ciphertext')
    .eq('tenant_id', session.tenantId).order('created_at', { ascending: false }));
  const teamGroups = must(await db().from('tenant_groups').select('name').eq('tenant_id', session.tenantId).eq('kind', 'team').order('name'));
  const runs = rules?.length ? must(await db().from('automation_runs').select('rule_id, status, detail, created_at')
    .eq('tenant_id', session.tenantId).in('rule_id', rules.map((rule) => rule.id))
    .order('created_at', { ascending: false }).limit(200)) : [];
  const seen = new Set<string>();
  const latest = (runs ?? []).filter((run) => {
    if (seen.has(run.rule_id)) return false;
    seen.add(run.rule_id);
    return true;
  });
  return NextResponse.json({
    rules: (rules ?? []).map(({ secret_ciphertext, ...rule }) => ({
      ...rule,
      hasSecret: Boolean(secret_ciphertext),
      lastRun: latest.find((run) => run.rule_id === rule.id) ?? null,
    })),
    teams: [...TEAMS, ...(teamGroups ?? []).map((group) => group.name)],
  });
});

export const POST = route(async (req: NextRequest) => {
  const session = await requireTenant(req, { permission: 'automations:manage', blockDemo: true });
  const body = await readJson(req);
  const id = typeof body.id === 'string' && body.id ? body.id : undefined;
  if (id && !ID_RE.test(id)) throw bad('VALIDATION', 'Invalid automation ID');
  if (!(TYPES as readonly unknown[]).includes(body.triggerType)) throw bad('VALIDATION', 'Unsupported automation type');
  const triggerType = body.triggerType as (typeof TYPES)[number];
  const name = str(body.name, 120, { min: 2, field: 'Automation name' });
  const config = await normalizeRule(session.tenantId, triggerType, body.config);
  const enabled = body.enabled !== false;
  const suppliedSecret = str(body.webhookSecret, 4000, { trim: false });
  if (triggerType !== 'webhook' && suppliedSecret) throw bad('VALIDATION', 'Only webhook rules accept a signing secret');

  let secretCiphertext: string | null = null;
  let issuedSecret: string | undefined;
  if (triggerType === 'webhook') {
    if (suppliedSecret) secretCiphertext = encryptIdpSecret(suppliedSecret);
    else if (id) {
      const current = must(await db().from('tenant_automation_rules').select('secret_ciphertext')
        .eq('tenant_id', session.tenantId).eq('id', id).maybeSingle());
      if (!current) throw new HttpError(404, 'NOT_FOUND', 'Automation not found');
      secretCiphertext = current.secret_ciphertext;
    } else {
      issuedSecret = randomBytes(32).toString('base64url');
      secretCiphertext = encryptIdpSecret(issuedSecret);
    }
    if (secretCiphertext) decryptIdpSecret(secretCiphertext);
  }

  const values = {
    tenant_id: session.tenantId,
    name,
    trigger_type: triggerType,
    config,
    secret_ciphertext: secretCiphertext,
    enabled,
    updated_at: new Date().toISOString(),
  };
  const rule = id
    ? must(await db().from('tenant_automation_rules').update(values).eq('tenant_id', session.tenantId).eq('id', id).select('id').maybeSingle())
    : must(await db().from('tenant_automation_rules').insert({ ...values, created_by: session.sub }).select('id').single());
  if (!rule) throw new HttpError(404, 'NOT_FOUND', 'Automation not found');
  await audit({
    tenantId: session.tenantId, actor: session.sub, role: session.role,
    action: id ? 'automation.updated' : 'automation.created', target: name,
    meta: { triggerType, enabled }, ip: clientIp(req),
  });
  return NextResponse.json({ success: true, id: rule.id, issuedSecret }, { status: id ? 200 : 201 });
});

export const DELETE = route(async (req: NextRequest) => {
  const session = await requireTenant(req, { permission: 'automations:manage', blockDemo: true });
  const id = req.nextUrl.searchParams.get('id') ?? '';
  if (!ID_RE.test(id)) throw bad('VALIDATION', 'Invalid automation ID');
  const rule = must(await db().from('tenant_automation_rules').select('name')
    .eq('tenant_id', session.tenantId).eq('id', id).maybeSingle());
  if (!rule) throw new HttpError(404, 'NOT_FOUND', 'Automation not found');
  must(await db().from('tenant_automation_rules').delete().eq('tenant_id', session.tenantId).eq('id', id).select('id'));
  await audit({ tenantId: session.tenantId, actor: session.sub, role: session.role, action: 'automation.deleted', target: rule.name, ip: clientIp(req) });
  return NextResponse.json({ success: true });
});
