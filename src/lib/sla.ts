export type SlaState = 'done' | 'breached' | 'risk' | 'ok' | 'none';

export interface SlaInfo { state: SlaState; minutesLeft: number | null }

interface T { status: string; sla_due_at: string | null; resolved_at: string | null; created_at: string }

export function slaOf(t: T, now = Date.now()): SlaInfo {
  if (!t.sla_due_at) return { state: 'none', minutesLeft: null };
  const due = new Date(t.sla_due_at).getTime();
  if (t.status === 'Resolved' || t.status === 'Closed') {
    const done = t.resolved_at ? new Date(t.resolved_at).getTime() : now;
    return { state: done <= due ? 'done' : 'breached', minutesLeft: null };
  }
  const left = Math.round((due - now) / 60000);
  if (left < 0) return { state: 'breached', minutesLeft: left };
  const total = (due - new Date(t.created_at).getTime()) / 60000;
  return { state: left < total * 0.25 ? 'risk' : 'ok', minutesLeft: left };
}

export const slaTone = (s: SlaState) =>
  s === 'breached' ? 'bg-rose-50 text-rose-700 ring-rose-200'
  : s === 'risk' ? 'bg-amber-50 text-amber-700 ring-amber-200'
  : s === 'done' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
  : 'bg-slate-100 text-slate-600 ring-slate-200';
