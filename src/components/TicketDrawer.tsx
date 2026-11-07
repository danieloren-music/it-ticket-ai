'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { MessageSquare, Save } from 'lucide-react';
import { api, errorText } from '@/lib/api';
import { fmtDateTime, fmtDuration, useLang } from '@/lib/i18n';
import {
  CATEGORY_LABELS, STATUSES, STATUS_LABELS, TEAMS, TEAM_LABELS, URGENCIES, URGENCY_LABELS, label,
} from '@/lib/constants';
import { slaOf, slaTone } from '@/lib/sla';
import type { TicketEvent, TicketRow } from '@/lib/tickets';
import { Badge, Field, Modal, Spinner, btnPrimary, btnSecondary, inputCls, statusTone, urgencyTone, useToast } from './ui';

export type { TicketRow };

/** Compact SLA status badge shared by ticket lists and the ticket drawer. */
export function SlaBadge({ ticket }: { ticket: Pick<TicketRow, 'status' | 'sla_due_at' | 'resolved_at' | 'created_at'> }) {
  const { t } = useLang();
  const sla = slaOf(ticket);
  const text = sla.state === 'none'
    ? t('ללא SLA', 'No SLA')
    : sla.state === 'done'
      ? t('עמד ב-SLA', 'SLA met')
      : sla.state === 'breached'
        ? t('חריגת SLA', 'SLA breached')
        : sla.state === 'risk'
          ? t('בסיכון', 'At risk')
          : t(`נותרו ${Math.max(0, sla.minutesLeft ?? 0)} דק׳`, `${Math.max(0, sla.minutesLeft ?? 0)} min left`);
  return <Badge tone={slaTone(sla.state)}>{text}</Badge>;
}

/** Open the drawer for a specific ticket. */
export function TicketDrawer({ ticketId, staff, onClose, onChanged }: { ticketId: string | null; staff: boolean; onClose: () => void; onChanged: () => void }) {
  const { t, lang } = useLang();
  const { toast } = useToast();
  // ---- State -------------------------------------------------------------
  // Structural separation between server snapshot (`ticket`) and user edits
  // (`draft`). Background refreshes only touch `ticket`; they never clobber
  // draft, so in-progress edits survive external reloads.
  const [ticket, setTicket] = useState<TicketRow | null>(null);
  const [events, setEvents] = useState<TicketEvent[]>([]);
  const [draft, setDraft] = useState<Partial<TicketRow>>({});
  const [comment, setComment] = useState('');
  const [internal, setInternal] = useState(false);
  // Stable flags so the effect chain doesn't restart when lang toggles.
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [teams, setTeams] = useState<string[]>([...TEAMS]);
  // Per-field dirty flags kept in refs so they don't trigger re-renders.
  const dirtyFields = useRef<Record<string, boolean>>({});
  const dirtyCount = useRef(0);

  // ---- In-flight guard ---------------------------------------------------
  // Prevents `save`/`send` racing an external reload. While true, a queued
  // background refresh becomes a no-op so we don't clobber pending writes.
  const inFlight = useRef(false);

  // ---- Data loading ----------------------------------------------------
  // `loadData` fetches the ticket + timeline payload. It never touches
  // `draft`, so user edits are preserved across re-renders. Called only by
  // the open-ticket effect, `save`, `send`, and externally via `onChanged`.
  const loadData = useCallback(async () => {
    if (!ticketId) return;
    setLoading(true);
    try {
      const [d, teamData] = await Promise.all([
        api<{ ticket: TicketRow; events: TicketEvent[] }>(`/api/tickets/${ticketId}`),
        api<{ teams: string[] }>('/api/tenant/teams'),
      ]);
      setTeams(teamData.teams);
      setTicket(d.ticket);
      setEvents(d.events);
    } catch (e) {
      toast(errorText(e, lang), 'error'); onClose();
    } finally {
      setLoading(false);
    }
  }, [ticketId, lang, toast, onClose]);

  // One paint per ticket transition only — not every render.
  useEffect(() => { setTicket(null); setEvents([]); if (ticketId) loadData(); }, [ticketId, loadData]);

  // ---- Form value helpers ----------------------------------------------
  // Effective value of a field, falls back to the server snapshot when the
  // user hasn't edited that field yet.
  const val = <K extends keyof TicketRow>(k: K) => (draft[k] !== undefined ? draft[k] : ticket?.[k]) as TicketRow[K];

  // Track dirty state locally per field without triggering re-renders.
  const markDirty = (k: keyof TicketRow) => {
    const key = k as string;
    if (!dirtyFields.current[key]) {
      dirtyFields.current[key] = true;
      dirtyCount.current += 1;
    }
  };
  const unmarkDirty = (k: keyof TicketRow) => {
    const key = k as string;
    if (dirtyFields.current[key]) {
      dirtyFields.current[key] = false;
      dirtyCount.current = Math.max(0, dirtyCount.current - 1);
    }
  };
  const countDirty = () => dirtyCount.current;
  const dirty = countDirty() > 0;

  // Apply a form change, updating draft + marking dirty only when the new
  // value actually differs from what was already loaded — so unrelated renders
  // (language switch, unrelated state change) don't churn dirty state.
  const applyField = <K extends keyof TicketRow>(k: K, v: TicketRow[K]) => {
    const before = draft[k] !== undefined ? draft[k] : ticket?.[k];
    if (before === v) return;
    unmarkDirty(k); // never re-dirty already-dirty fields unnecessarily
    markDirty(k);
    setDraft((prev) => ({ ...prev, [k]: v }));
  };

  // ---- Save / send ------------------------------------------------------
  const save = async () => {
    if (!ticket || !dirty || inFlight.current) return;
    inFlight.current = true;
    setSaving(true);
    try {
      // Build a tight JSON body from only the form fields the user changed.
      // Status transitions drive the audit logic in updateTicket; everything
      // else (urgency, team, assignee, notes) is written atomically together.
      const body: Record<string, unknown> = {};
      if (draft.status !== undefined && draft.status !== (ticket.status as string)) body.status = draft.status;
      if (draft.urgency !== undefined && draft.urgency !== (ticket.urgency as string)) body.urgency = draft.urgency;
      if (draft.assigned_team !== undefined && draft.assigned_team !== (ticket.assigned_team as string)) body.assigned_team = draft.assigned_team;
      if (draft.assigned_technician !== undefined && draft.assigned_technician !== (ticket.assigned_technician ?? '')) body.assigned_technician = draft.assigned_technician;
      if (draft.admin_internal_notes !== undefined) body.admin_internal_notes = draft.admin_internal_notes;

      // Atomic PATCH — updateTicket writes every changed column in one UPDATE,
      // keeping status + resolved_at consistent on the same transaction.
      await api(`/api/tickets/${ticket.id}`, { method: 'PATCH', json: body });
      toast(t('הקריאה עודכנה', 'Ticket updated'));
      // Single authoritative refetch replaces the stale snapshot we may hold.
      await loadData();
      // Let the parent refresh its list if needed.
      await onChanged();
    } catch (e) {
      toast(errorText(e, lang), 'error');
      // Drop pending dirty state so the user can retry after a failed save.
      dirtyFields.current = {};
      dirtyCount.current = 0;
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  };

  const send = async () => {
    if (!ticket || !comment.trim() || inFlight.current) return;
    inFlight.current = true;
    try {
      // POST the comment — addComment enforces Closed tickets cannot be replied
      // to (HTTP 409 at the route handler level).
      await api(`/api/tickets/${ticket.id}`, { method: 'POST', json: { body: comment, internal } });
      toast(t('הקריאה עודכנה', 'Ticket updated'));
      // Add the reply locally first so the timeline renders instantly while the
      // server-authoritative refetch rounds through the network.
      const localReply: TicketEvent = {
        id: `local-${Date.now()}`, ticket_id: ticket.id, actor: '',
        type: internal ? 'note' : 'comment', from_value: null, to_value: null,
        body: comment, internal, created_at: new Date().toISOString(),
      };
      setEvents((p) => [localReply, ...p].slice(0, 300));
      setComment('');
      await loadData();
      await onChanged();
    } catch (e) {
      toast(errorText(e, lang), 'error');
    } finally {
      inFlight.current = false;
    }
  };

  // ---- Timeline text ----------------------------------------------------
  const eventText = (e: TicketEvent) => {
    const L = (m: Record<string, { he: string; en: string }>, v: string | null) => (v ? label(m as never, v, lang) : '–');
    if (e.type === 'created') return t('הקריאה נפתחה', 'Ticket created');
    if (e.type === 'status') return t(`סטטוס: ${L(STATUS_LABELS, e.from_value)} ← ${L(STATUS_LABELS, e.to_value)}`, `Status: ${L(STATUS_LABELS, e.from_value)} → ${L(STATUS_LABELS, e.to_value)}`);
    if (e.type === 'urgency') return t(`דחיפות: ${L(URGENCY_LABELS, e.from_value)} ← ${L(URGENCY_LABELS, e.to_value)}`, `Urgency: ${L(URGENCY_LABELS, e.from_value)} → ${L(URGENCY_LABELS, e.to_value)}`);
    if (e.type === 'team') return t(`הועבר לצוות ${L(TEAM_LABELS, e.to_value)}`, `Reassigned to ${L(TEAM_LABELS, e.to_value)}`);
    if (e.type === 'assignee') return t(`הוקצה ל-${e.to_value || '–'}`, `Assigned to ${e.to_value || '–'}`);
    return e.body ?? '';
  };

  return (
    <Modal open={!!ticketId} onClose={onClose} wide title={ticket ? `#${ticket.ticket_number} · ${ticket.title}` : t('טוען…', 'Loading…')}>
      {loading && !ticket && <div className="py-10 text-center text-brand"><Spinner className="h-6 w-6" /></div>}
      {ticket && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={statusTone(ticket.status)}>{label(STATUS_LABELS, ticket.status, lang)}</Badge>
            <Badge tone={urgencyTone(ticket.urgency)}>{label(URGENCY_LABELS, ticket.urgency, lang)}</Badge>
            <SlaBadge ticket={ticket} />
            <span className="text-xs text-ink-soft">{label(CATEGORY_LABELS, ticket.category, lang)} · {label(TEAM_LABELS, ticket.assigned_team, lang)}</span>
          </div>
          <p className="whitespace-pre-wrap rounded-lg bg-canvas p-3 text-sm">{ticket.description}</p>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-xs text-ink-soft">{t('פונה', 'Reporter')}</dt><dd className="font-medium">{ticket.reporter_name || '–'}</dd></div>
            <div><dt className="text-xs text-ink-soft">{t('נפתחה', 'Opened')}</dt><dd className="font-medium tnum">{fmtDateTime(ticket.created_at, lang)}</dd></div>
            <div><dt className="text-xs text-ink-soft">{t('מיקום', 'Location')}</dt><dd className="font-medium">{ticket.user_city || '–'}</dd></div>
            <div><dt className="text-xs text-ink-soft">{t('מערכת מושפעת', 'Impacted system')}</dt><dd className="font-medium">{ticket.system_impacted || '–'}</dd></div>
          </dl>

          {staff && (
            <div className="rounded-xl border border-line p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={t('סטטוס', 'Status')}>
                  <select className={inputCls} value={val('status')} onChange={(e) => applyField('status', e.target.value as TicketRow['status'])}>
                    {STATUSES.map((s) => <option key={s} value={s}>{label(STATUS_LABELS, s, lang)}</option>)}
                  </select>
                </Field>
                <Field label={t('דחיפות', 'Urgency')}>
                  <select className={inputCls} value={val('urgency')} onChange={(e) => applyField('urgency', e.target.value as TicketRow['urgency'])}>
                    {URGENCIES.map((s) => <option key={s} value={s}>{label(URGENCY_LABELS, s, lang)}</option>)}
                  </select>
                </Field>
                <Field label={t('צוות מטפל', 'Team')}>
                  <select className={inputCls} value={val('assigned_team')} onChange={(e) => applyField('assigned_team', e.target.value)}>
                    {[...new Set([...teams, ticket.assigned_team])].map((s) => <option key={s} value={s}>{label(TEAM_LABELS, s, lang)}</option>)}
                  </select>
                </Field>
                <Field label={t('טכנאי מטפל', 'Technician')}>
                  <input className={inputCls} value={val('assigned_technician') ?? ''} onChange={(e) => applyField('assigned_technician', e.target.value)} />
                </Field>
              </div>
              <div className="mt-3">
                <Field label={t('הערות פנימיות (לא גלויות לפונה)', 'Internal notes (hidden from the requester)')}>
                  <textarea rows={2} className={inputCls} value={val('admin_internal_notes') ?? ''} onChange={(e) => applyField('admin_internal_notes', e.target.value)} />
                </Field>
              </div>
              <div className="mt-3 flex justify-end">
                <button type="button" disabled={!dirty || saving} onClick={save} className={btnPrimary}>{saving ? <Spinner /> : <Save className="h-4 w-4" />}{t('שמירת שינויים', 'Save changes')}</button>
              </div>
            </div>
          )}

          <div>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-bold"><MessageSquare className="h-4 w-4" />{t('היסטוריה ותגובות', 'Timeline and replies')}</h3>
            <ul className="space-y-2">
              {events.map((e) => (
                <li key={e.id} className={`rounded-lg px-3 py-2 text-sm ${e.type === 'comment' ? 'bg-brand-soft' : e.type === 'note' ? 'bg-amber-50' : 'bg-canvas text-ink-soft'}`}>
                  <div className="flex justify-between gap-3 text-xs text-ink-soft">
                    <span>{e.actor}{e.type === 'note' && ` · ${t('הערה פנימית', 'internal note')}`}</span>
                    <span className="tnum">{fmtDateTime(e.created_at, lang)}</span>
                  </div>
                  <p className="mt-0.5 whitespace-pre-wrap">{eventText(e)}</p>
                </li>
              ))}
            </ul>
            {ticket.status !== 'Closed' && (
              <div className="mt-3 space-y-2">
                <textarea rows={2} className={inputCls} value={comment} maxLength={2000} onChange={(e) => setComment(e.target.value)} placeholder={t('כתבו תגובה…', 'Write a reply…')} aria-label={t('תגובה', 'Reply')} />
                <div className="flex items-center justify-between">
                  {staff ? <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={internal} onChange={(e) => { const v = e.target.checked; setInternal(v); if (v !== internal) unmarkDirty('_internal_flag'); markDirty('_internal_flag'); }} />{t('הערה פנימית', 'Internal note')}</label> : <span />}
                  <button type="button" onClick={send} disabled={!comment.trim()} className={btnSecondary}>{t('שליחה', 'Send')}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
