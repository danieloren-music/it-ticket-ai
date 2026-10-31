import { db } from './db';

export interface AuditInput {
  tenantId?: string | null;
  actor: string;
  role?: string;
  action: string;
  target?: string;
  meta?: Record<string, unknown>;
  ip?: string;
}

/** Fire-and-forget audit trail. Never blocks or fails the request. */
export async function audit(entry: AuditInput): Promise<void> {
  try {
    await db().from('audit_log').insert({
      tenant_id: entry.tenantId ?? null,
      actor_email: entry.actor,
      actor_role: entry.role ?? null,
      action: entry.action,
      target: entry.target ?? null,
      meta: entry.meta ?? {},
      ip: entry.ip ?? null,
    });
  } catch (err) {
    console.warn('[audit] failed to write entry:', err);
  }
}
