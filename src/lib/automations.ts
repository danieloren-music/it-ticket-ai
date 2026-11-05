import 'server-only';
import { decryptIdpSecret } from './idp-secrets';
import { db, must } from './db';
import { addEvent, type TicketRow } from './tickets';
import { postWebhook } from './webhooks';
import type { TenantSession } from './session';
import { TEAMS } from './constants';

interface AutomationRule {
  id: string;
  tenant_id: string;
  name: string;
  trigger_type: 'category_routing' | 'auto_assignment' | 'sla_escalation' | 'idle_close' | 'webhook';
  config: Record<string, unknown>;
  secret_ciphertext: string | null;
}

interface Run {
  id: string;
}

async function loadRules(tenantId: string): Promise<AutomationRule[]> {
  return (must(await db().from('tenant_automation_rules')
    .select('id, tenant_id, name, trigger_type, config, secret_ciphertext')
    .eq('tenant_id', tenantId).eq('enabled', true).order('created_at')) ?? []) as AutomationRule[];
}

async function claimRun(rule: AutomationRule, ticketId: string, runKey: string): Promise<Run | null> {
  const result = await db().from('automation_runs').upsert({
    tenant_id: rule.tenant_id,
    rule_id: rule.id,
    ticket_id: ticketId,
    run_key: runKey,
    status: 'skipped',
    detail: 'Processing',
  }, { onConflict: 'rule_id,ticket_id,run_key', ignoreDuplicates: true }).select('id').maybeSingle();
  if (result.error) throw new Error(`Could not claim automation run: ${result.error.message}`);
  return result.data;
}

async function finishRun(run: Run, status: 'succeeded' | 'failed' | 'skipped', detail: string): Promise<void> {
  const { error } = await db().from('automation_runs').update({ status, detail: detail.slice(0, 500) }).eq('id', run.id);
  if (error) console.error('[automation] could not finish run:', error.message);
}

function ruleConfig(rule: AutomationRule): Record<string, unknown> {
  return rule.config && typeof rule.config === 'object' && !Array.isArray(rule.config) ? rule.config : {};
}

async function teamExists(tenantId: string, name: string): Promise<boolean> {
  if ((TEAMS as readonly string[]).includes(name)) return true;
  const row = must(await db().from('tenant_groups').select('id').eq('tenant_id', tenantId).eq('kind', 'team').eq('name', name).maybeSingle());
  return Boolean(row);
}

async function assignLeastBusy(tenantId: string, team: string): Promise<string | null> {
  const group = must(await db().from('tenant_groups').select('id').eq('tenant_id', tenantId).eq('kind', 'team').eq('name', team).maybeSingle());
  let candidates: { email: string; full_name: string }[] = [];
  if (group) {
    const members = must(await db().from('tenant_group_members').select('user_email').eq('tenant_id', tenantId).eq('group_id', group.id));
    const emails = (members ?? []).map((member) => member.user_email);
    if (emails.length) {
      candidates = (must(await db().from('tenant_users').select('email, full_name')
        .eq('tenant_id', tenantId).eq('is_active', true).in('role', ['Admin', 'Manager']).in('email', emails)) ?? []) as typeof candidates;
    }
  } else {
    candidates = (must(await db().from('tenant_users').select('email, full_name')
      .eq('tenant_id', tenantId).eq('is_active', true).eq('role', 'Admin')) ?? []) as typeof candidates;
  }
  if (!candidates.length) return null;
  const names = candidates.map((candidate) => candidate.full_name);
  const activeTickets = must(await db().from('tickets').select('assigned_technician')
    .eq('tenant_id', tenantId).in('assigned_technician', names).not('status', 'in', '("Resolved","Closed")'));
  const load = new Map<string, number>();
  for (const candidate of candidates) load.set(candidate.full_name, 0);
  for (const row of activeTickets ?? []) {
    if (row.assigned_technician) load.set(row.assigned_technician, (load.get(row.assigned_technician) ?? 0) + 1);
  }
  return candidates.sort((a, b) => (load.get(a.full_name) ?? 0) - (load.get(b.full_name) ?? 0))[0].full_name;
}

async function deliverWebhooks(
  rules: AutomationRule[],
  event: string,
  ticket: TicketRow,
  tenantId: string,
): Promise<string[]> {
  const warnings: string[] = [];
  const payload = {
    event,
    organization: tenantId,
    occurredAt: new Date().toISOString(),
    ticket: { id: ticket.id, number: ticket.ticket_number, status: ticket.status, category: ticket.category, urgency: ticket.urgency },
  };
  for (const rule of rules.filter((item) => item.trigger_type === 'webhook' && ruleConfig(item).event === event)) {
    const run = await claimRun(rule, ticket.id, event);
    if (!run) continue;
    try {
      if (!rule.secret_ciphertext) throw new Error('Webhook signing secret is missing');
      await postWebhook(String(ruleConfig(rule).url ?? ''), payload, decryptIdpSecret(rule.secret_ciphertext));
      await finishRun(run, 'succeeded', `Delivered ${event}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Webhook delivery failed';
      await finishRun(run, 'failed', message);
      warnings.push(`${rule.name}: ${message}`);
    }
  }
  return warnings;
}

export async function addTicketAutomations(
  session: TenantSession,
  ticket: TicketRow,
  category: string,
): Promise<{ applied: string[]; warnings: string[]; ticket: TicketRow }> {
  const rules = await loadRules(session.tenantId);
  const applied: string[] = [];
  const warnings: string[] = [];
  let current = ticket;

  for (const rule of rules.filter((item) => item.trigger_type === 'category_routing' && ruleConfig(item).category === category)) {
    const run = await claimRun(rule, ticket.id, 'ticket.created');
    if (!run) continue;
    try {
      const team = String(ruleConfig(rule).team ?? '');
      if (!await teamExists(session.tenantId, team)) throw new Error('Configured IT team no longer exists');
      if (current.assigned_team !== team) {
        current = (must(await db().from('tickets').update({ assigned_team: team, assigned_technician: null, updated_at: new Date().toISOString() })
          .eq('tenant_id', session.tenantId).eq('id', ticket.id).select('*').single())) as unknown as TicketRow;
        await addEvent(session.tenantId, ticket.id, 'SmartQ automation', 'team', { from: ticket.assigned_team, to: team });
      }
      applied.push(rule.name);
      await finishRun(run, 'succeeded', `Routed to ${team}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Category routing failed';
      await finishRun(run, 'failed', message);
      warnings.push(`${rule.name}: ${message}`);
    }
  }

  for (const rule of rules.filter((item) => item.trigger_type === 'auto_assignment')) {
    const run = await claimRun(rule, ticket.id, 'ticket.created');
    if (!run) continue;
    try {
      const configuredTeam = String(ruleConfig(rule).team ?? '');
      if (configuredTeam && configuredTeam !== current.assigned_team) {
        await finishRun(run, 'skipped', `Ticket belongs to ${current.assigned_team}`);
        continue;
      }
      const assignee = await assignLeastBusy(session.tenantId, current.assigned_team);
      if (!assignee) {
        await finishRun(run, 'skipped', 'No active IT technician is available');
        continue;
      }
      current = (must(await db().from('tickets').update({ assigned_technician: assignee, updated_at: new Date().toISOString() })
        .eq('tenant_id', session.tenantId).eq('id', ticket.id).select('*').single())) as unknown as TicketRow;
      await addEvent(session.tenantId, ticket.id, 'SmartQ automation', 'assignee', { to: assignee });
      applied.push(rule.name);
      await finishRun(run, 'succeeded', `Assigned to ${assignee}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Automatic assignment failed';
      await finishRun(run, 'failed', message);
      warnings.push(`${rule.name}: ${message}`);
    }
  }

  warnings.push(...await deliverWebhooks(rules, 'ticket.created', current, session.tenantId));
  return { applied, warnings, ticket: current };
}

export async function addTicketAutomationsSafely(
  session: TenantSession,
  ticket: TicketRow,
  category: string,
): Promise<{ applied: string[]; warnings: string[]; ticket: TicketRow }> {
  try {
    return await addTicketAutomations(session, ticket, category);
  } catch (error) {
    console.error('[automation] ticket processing failed after ticket creation:', error);
    return {
      applied: [],
      warnings: ['Ticket created, but some automations could not be completed. Contact your administrator.'],
      ticket,
    };
  }
}

export async function runScheduledAutomations(): Promise<{ processed: number; failed: number }> {
  const rules = (must(await db().from('tenant_automation_rules').select(
    'id, tenant_id, name, trigger_type, config, secret_ciphertext, tenants!inner(status)'
  ).eq('enabled', true).in('trigger_type', ['sla_escalation', 'idle_close'])
    .eq('tenants.status', 'Active').order('created_at').limit(2000)) ?? []) as unknown as AutomationRule[];
  let processed = 0;
  let failed = 0;

  for (const rule of rules) {
    const config = ruleConfig(rule);
    if (rule.trigger_type === 'sla_escalation') {
      const minutes = Number(config.minutesBeforeDue);
      const cutoff = new Date(Date.now() + minutes * 60_000).toISOString();
      const tickets = must(await db().from('tickets').select('*').eq('tenant_id', rule.tenant_id)
        .in('status', ['Open', 'In Progress', 'Pending User']).not('sla_due_at', 'is', null).lte('sla_due_at', cutoff).limit(1000));
      for (const ticket of tickets ?? []) {
        const run = await claimRun(rule, ticket.id, `sla:${ticket.sla_due_at}`);
        if (!run) continue;
        try {
          const targetTeam = String(config.team ?? '');
          if (targetTeam && await teamExists(rule.tenant_id, targetTeam) && targetTeam !== ticket.assigned_team) {
            must(await db().from('tickets').update({ assigned_team: targetTeam, assigned_technician: null, updated_at: new Date().toISOString() })
              .eq('tenant_id', rule.tenant_id).eq('id', ticket.id));
            await addEvent(rule.tenant_id, ticket.id, 'SmartQ automation', 'team', { from: ticket.assigned_team, to: targetTeam });
          }
          await addEvent(rule.tenant_id, ticket.id, 'SmartQ automation', 'note', {
            body: `SLA escalation: ${rule.name}`,
            internal: true,
          });
          await finishRun(run, 'succeeded', 'SLA escalation recorded');
          await deliverWebhooks(await loadRules(rule.tenant_id), 'ticket.sla_escalated', ticket as unknown as TicketRow, rule.tenant_id);
          processed++;
        } catch (error) {
          await finishRun(run, 'failed', error instanceof Error ? error.message : 'SLA escalation failed');
          failed++;
        }
      }
    } else {
      const hours = Number(config.idleHours);
      const cutoff = new Date(Date.now() - hours * 3600_000).toISOString();
      const tickets = must(await db().from('tickets').select('*').eq('tenant_id', rule.tenant_id)
        .eq('status', 'Resolved').lt('updated_at', cutoff).limit(1000));
      for (const ticket of tickets ?? []) {
        const run = await claimRun(rule, ticket.id, `idle:${ticket.updated_at}`);
        if (!run) continue;
        try {
          must(await db().from('tickets').update({ status: 'Closed', updated_at: new Date().toISOString() })
            .eq('tenant_id', rule.tenant_id).eq('id', ticket.id).eq('status', 'Resolved'));
          await addEvent(rule.tenant_id, ticket.id, 'SmartQ automation', 'status', { from: 'Resolved', to: 'Closed' });
          await finishRun(run, 'succeeded', 'Idle resolved ticket was closed');
          const closed = { ...ticket, status: 'Closed' } as unknown as TicketRow;
          await deliverWebhooks(await loadRules(rule.tenant_id), 'ticket.auto_closed', closed, rule.tenant_id);
          processed++;
        } catch (error) {
          await finishRun(run, 'failed', error instanceof Error ? error.message : 'Idle close failed');
          failed++;
        }
      }
    }
  }
  return { processed, failed };
}
