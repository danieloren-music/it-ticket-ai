'use client';

import { useCallback, useEffect, useState } from 'react';
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

export function SlaBadge({ ticket }: { ticket: TicketRow }) {
  const { t, lang } = useLang();
  const s = slaOf(ticket);
  if (s.state === 'none') return null;
  const text =
    s.state === 'done' ? t('עמד ביעד', 'Met SLA')
    : s.state === 'breached' ? (s.minutesLeft !== null ? t(`חריגה ${fmtDuration(-s.minutesLeft, lang)}`, `Overdue ${fmtDuration(-s.minutesLeft, lang)}`) : t('חרג מהיעד', 'Missed SLA'))
    : t(`נותרו ${fmtDuration(s.minutesLeft, lang)}`, `${fmtDuration(s.minutesLeft, lang)} left`);
  return <Badge tone={slaTone(s.state)}>{text}</Badge>;
}

export function TicketDrawer({ ticketId, staff, onClose, onChanged }: { ticketId: string | null; staff: boolean; onClose: () => void; onChanged: () => void }) {
  const { t, lang } = useLang();
  const { toast } = useToast();
  const [ticket, setTicket] = useState<TicketRow | null>(null);
  const [events, setEvents] = useState<TicketEvent[]>([]);
  const [draft, setDraft] = useState<Partial<TicketRow>>({});
  const [comment, setComment] = useState('');
  const [internal, setInternal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [teams, setTeams] = useState<string[]>([...TEAMS]);

  const load = useCallback(async () => {
    if (!ticketId) return;
    setLoading(true);
    try {
      const [d, teamData] = await Promise.all([
        api<{ ticket: TicketRow; events: TicketEvent[] }>(`/api/tickets/${ticketId}`),
        api<{ teams: string[] }>('/api/tenant/teams'),
      ]);
      setTeams(teamData.teams);
      setTicket(d.ticket); setEvents(d.events); setDraft({});
    } catch (e) { toast(errorText(e, lang), 'error'); onClose(); } finally { setLoading(false); }
  }, [ticketId, lang, toast, onClose]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- Synchronize drawer data with the selected ticket.
  useEffect(() => { setTicket(null); setEvents([]); if (ticketId) load(); }, [ticketId, load]);

  const val = <K extends keyof TicketRow>(k: K) => (draft[k] !== undefined ? draft[k] : ticket?.[k]) as TicketRow[K];
  const dirty = Object.keys(draft).length > 0;

  const save = async () => {
    if (!ticket || !dirty) return;
    setSaving(true);
    try { await api(`/api/tickets/${ticket.id}`, { method: 'PATCH', json: draft }); toast(t('הקריאה עודכנה', 'Ticket updated')); await load(); onChanged(); }
    catch (e) { toast(errorText(e, lang), 'error'); } finally { setSaving(false); }
  };

  const send = async () => {
    if (!ticket || !comment.trim()) return;
    try { await api(`/api/tickets/${ticket.id}`, { method: 'POST', json: { body: comment, internal } }); setComment(''); await load(); onChanged(); }
    catch (e) { toast(errorText(e, lang), 'error'); }
  };

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
                  <select className={inputCls} value={val('status')} onChange={(e) => setDraft({ ...draft, status: e.target.value as TicketRow['status'] })}>
                    {STATUSES.map((s) => <option key={s} value={s}>{label(STATUS_LABELS, s, lang)}</option>)}
                  </select>
                </Field>
                <Field label={t('דחיפות', 'Urgency')}>
                  <select className={inputCls} value={val('urgency')} onChange={(e) => setDraft({ ...draft, urgency: e.target.value as TicketRow['urgency'] })}>
                    {URGENCIES.map((s) => <option key={s} value={s}>{label(URGENCY_LABELS, s, lang)}</option>)}
                  </select>
                </Field>
                <Field label={t('צוות מטפל', 'Team')}>
                  <select className={inputCls} value={val('assigned_team')} onChange={(e) => setDraft({ ...draft, assigned_team: e.target.value })}>
                    {[...new Set([...teams, ticket.assigned_team])].map((s) => <option key={s} value={s}>{label(TEAM_LABELS, s, lang)}</option>)}
                  </select>
                </Field>
                <Field label={t('טכנאי מטפל', 'Technician')}>
                  <input className={inputCls} value={val('assigned_technician') ?? ''} onChange={(e) => setDraft({ ...draft, assigned_technician: e.target.value })} />
                </Field>
              </div>
              <div className="mt-3">
                <Field label={t('הערות פנימיות (לא גלויות לפונה)', 'Internal notes (hidden from the requester)')}>
                  <textarea rows={2} className={inputCls} value={val('admin_internal_notes') ?? ''} onChange={(e) => setDraft({ ...draft, admin_internal_notes: e.target.value })} />
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
                  {staff ? <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} />{t('הערה פנימית', 'Internal note')}</label> : <span />}
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
