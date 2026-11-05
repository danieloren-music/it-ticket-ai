'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Download, RefreshCw, Search } from 'lucide-react';
import { api, errorText } from '@/lib/api';
import { fmtDateTime, useLang } from '@/lib/i18n';
import { useSession } from '@/hooks/useSession';
import { AppShell } from '@/components/AppShell';
import { SlaBadge, TicketDrawer, type TicketRow } from '@/components/TicketDrawer';
import { Badge, EmptyState, Spinner, btnSecondary, cardCls, inputCls, statusTone, urgencyTone, useToast } from '@/components/ui';
import { STATUSES, STATUS_LABELS, TEAMS, TEAM_LABELS, URGENCIES, URGENCY_LABELS, label } from '@/lib/constants';
import { slaOf } from '@/lib/sla';
import type { TicketPage } from '@/lib/tickets';

type Quick = 'all' | 'open' | 'mine' | 'breached';

export default function QueuePage() {
  const { t, lang } = useLang();
  const { toast } = useToast();
  const tenantSlug = String(useParams().tenant ?? '').toLowerCase();
  const { session, tenant, logout, reload } = useSession(tenantSlug);

  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<TicketPage['nextCursor']>(null);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('ALL');
  const [urgency, setUrgency] = useState('ALL');
  const [team, setTeam] = useState('ALL');
  const [teams, setTeams] = useState<string[]>([...TEAMS]);
  const [quick, setQuick] = useState<Quick>('open');
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const page = await api<TicketPage>('/api/tickets');
      if (!silent || !page.hasMore) {
        setTickets(page.tickets);
        setNextCursor(page.nextCursor);
      } else {
        setTickets((current) => {
          const byId = new Map(current.map((ticket) => [ticket.id, ticket] as const));
          for (const ticket of page.tickets) byId.set(ticket.id, ticket);
          return [...byId.values()].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at) || b.id.localeCompare(a.id));
        });
        setNextCursor((cursor) => cursor ?? page.nextCursor);
      }
      setHasMore(page.hasMore);
    } catch { /* keep previous */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (session && !session.mustChangePassword) load(); }, [session, load]);
  useEffect(() => {
    api<{ teams: string[] }>('/api/tenant/teams').then((data) => setTeams(data.teams))
      .catch((error) => toast(errorText(error, lang), 'error'));
  }, [lang, toast]);
  // Live queue: refresh every 30s while the tab is visible.
  useEffect(() => {
    const id = setInterval(() => { if (document.visibilityState === 'visible') load(true); }, 30_000);
    return () => clearInterval(id);
  }, [load]);

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const params = new URLSearchParams({ before: nextCursor.createdAt, beforeId: nextCursor.id });
      const page = await api<TicketPage>(`/api/tickets?${params}`);
      setTickets((current) => {
        const byId = new Map(current.map((ticket) => [ticket.id, ticket] as const));
        for (const ticket of page.tickets) byId.set(ticket.id, ticket);
        return [...byId.values()].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at) || b.id.localeCompare(a.id));
      });
      setNextCursor(page.nextCursor);
      setHasMore(page.hasMore);
    } catch (error) {
      toast(errorText(error, lang), 'error');
    } finally {
      setLoadingMore(false);
    }
  };

  const done = (s: string) => s === 'Resolved' || s === 'Closed';

  const counts = useMemo(() => ({
    open: tickets.filter((k) => !done(k.status)).length,
    breached: tickets.filter((k) => !done(k.status) && slaOf(k).state === 'breached').length,
    critical: tickets.filter((k) => !done(k.status) && k.urgency === 'Critical').length,
    unassigned: tickets.filter((k) => !done(k.status) && !k.assigned_technician).length,
  }), [tickets]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return tickets.filter((k) => {
      if (quick === 'open' && done(k.status)) return false;
      if (quick === 'mine' && (done(k.status) || k.assigned_technician?.toLowerCase() !== session?.name.toLowerCase())) return false;
      if (quick === 'breached' && (done(k.status) || slaOf(k).state !== 'breached')) return false;
      if (status !== 'ALL' && k.status !== status) return false;
      if (urgency !== 'ALL' && k.urgency !== urgency) return false;
      if (team !== 'ALL' && k.assigned_team !== team) return false;
      if (!needle) return true;
      return [k.ticket_number, k.title, k.reporter_name, k.user_city, k.assigned_technician].some((v) => v?.toLowerCase().includes(needle));
    });
  }, [tickets, q, status, urgency, team, quick, session?.name]);

  const exportCsv = () => {
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""').replace(/^([=+\-@])/, "'$1")}"`;
    const head = ['ticket', 'title', 'status', 'urgency', 'category', 'team', 'technician', 'reporter', 'location', 'created_at', 'sla_due_at', 'resolved_at'];
    const lines = rows.map((k) => [k.ticket_number, k.title, k.status, k.urgency, k.category, k.assigned_team, k.assigned_technician, k.reporter_name, k.user_city, k.created_at, k.sla_due_at, k.resolved_at].map(esc).join(','));
    const blob = new Blob(['\uFEFF' + [head.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `tickets-${tenantSlug}-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(a.href);
  };

  const kpis: [string, number, string][] = [
    [t('קריאות פתוחות', 'Open tickets'), counts.open, 'text-ink'],
    [t('חריגות SLA', 'SLA breached'), counts.breached, counts.breached ? 'text-rose-600' : 'text-ink'],
    [t('קריטיות פתוחות', 'Critical open'), counts.critical, counts.critical ? 'text-rose-600' : 'text-ink'],
    [t('ללא טכנאי', 'Unassigned'), counts.unassigned, 'text-ink'],
  ];

  const quickTabs: [Quick, string][] = [['open', t('פתוחות', 'Open')], ['mine', t('שלי', 'Mine')], ['breached', t('חריגות SLA', 'Breached')], ['all', t('הכל', 'All')]];

  return (
    <AppShell tenant={tenantSlug} tenantName={tenant?.name ?? tenantSlug} session={session} active="admins" onLogout={logout} onReload={reload}>
      <div className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><h1 className="text-2xl font-bold">{t('תור קריאות', 'Service queue')}</h1><p className="text-ink-soft">{hasMore ? t(`${tickets.length} קריאות נטענו · טענו עוד לצפייה בישנות`, `${tickets.length} tickets loaded · load more to see older ones`) : t('כל הקריאות נטענו · מתעדכן כל 30 שניות', 'All tickets loaded · refreshes every 30 seconds')}</p></div>
          <div className="flex gap-2">
            <button type="button" className={btnSecondary} onClick={exportCsv} disabled={!rows.length || hasMore} title={hasMore ? t('טענו את כל הקריאות לפני הייצוא', 'Load all tickets before exporting') : undefined}><Download className="h-4 w-4" />{t('ייצוא CSV', 'Export CSV')}</button>
            <button type="button" className={btnSecondary} onClick={() => load()} aria-label={t('רענון', 'Refresh')}><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {kpis.map(([k, v, c]) => <div key={k} className={`${cardCls} p-4`}><dt className="text-sm text-ink-soft">{k}</dt><dd className={`mt-1 text-3xl font-bold tnum ${c}`}>{v}</dd></div>)}
        </dl>

        <div className={`${cardCls} space-y-3 p-4`}>
          <div className="flex flex-wrap items-center gap-3">
            <div role="tablist" className="flex rounded-lg bg-canvas p-0.5 text-sm font-medium">
              {quickTabs.map(([k, l]) => <button key={k} role="tab" aria-selected={quick === k} type="button" onClick={() => setQuick(k)} className={`rounded-md px-3 py-1.5 ${quick === k ? 'bg-white text-ink shadow-sm' : 'text-ink-soft'}`}>{l}</button>)}
            </div>
            <div className="relative min-w-56 flex-1">
              <Search className="pointer-events-none absolute start-3 top-2.5 h-4 w-4 text-slate-400" />
              <input className={`${inputCls} ps-9`} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('חיפוש לפי מספר, נושא, פונה או מיקום', 'Search by number, subject, requester or location')} aria-label={t('חיפוש', 'Search')} />
            </div>
            <select className={`${inputCls} w-auto`} value={status} onChange={(e) => setStatus(e.target.value)} aria-label={t('סטטוס', 'Status')}>
              <option value="ALL">{t('כל הסטטוסים', 'All statuses')}</option>{STATUSES.map((s) => <option key={s} value={s}>{label(STATUS_LABELS, s, lang)}</option>)}
            </select>
            <select className={`${inputCls} w-auto`} value={urgency} onChange={(e) => setUrgency(e.target.value)} aria-label={t('דחיפות', 'Urgency')}>
              <option value="ALL">{t('כל הדחיפויות', 'All urgencies')}</option>{URGENCIES.map((s) => <option key={s} value={s}>{label(URGENCY_LABELS, s, lang)}</option>)}
            </select>
            <select className={`${inputCls} w-auto`} value={team} onChange={(e) => setTeam(e.target.value)} aria-label={t('צוות', 'Team')}>
              <option value="ALL">{t('כל הצוותים', 'All teams')}</option>{teams.map((s) => <option key={s} value={s}>{label(TEAM_LABELS, s, lang)}</option>)}
            </select>
          </div>
        </div>

        <div className={`${cardCls} overflow-hidden`}>
          {loading && tickets.length === 0 ? <div className="py-16 text-center text-brand"><Spinner className="h-6 w-6" /></div>
          : rows.length === 0 ? <EmptyState title={t('אין קריאות להצגה', 'No tickets to show')} hint={t('שנו את הסינון, או המתינו לקריאה חדשה.', 'Change the filters or wait for a new ticket.')} />
          : (
            <div className="overflow-x-auto">
              <table className="w-full text-start text-sm">
                <thead className="border-b border-line bg-canvas text-xs text-ink-soft">
                  <tr>{[t('מספר', 'No.'), t('נושא', 'Subject'), t('פונה', 'Requester'), t('דחיפות', 'Urgency'), 'SLA', t('צוות / טכנאי', 'Team / technician'), t('סטטוס', 'Status'), t('נפתחה', 'Opened')].map((h) => <th key={h} className="px-4 py-2.5 text-start font-semibold">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.map((k) => (
                    <tr key={k.id} onClick={() => setOpenId(k.id)} className="cursor-pointer hover:bg-canvas">
                      <td className="px-4 py-3 font-semibold text-brand tnum"><button type="button" onClick={(e) => { e.stopPropagation(); setOpenId(k.id); }} className="underline-offset-2 hover:underline">#{k.ticket_number}</button></td>
                      <td className="max-w-xs truncate px-4 py-3 font-medium">{k.title}</td>
                      <td className="px-4 py-3 text-ink-soft">{k.reporter_name || '–'}<span className="block text-xs">{k.user_city}</span></td>
                      <td className="px-4 py-3"><Badge tone={urgencyTone(k.urgency)}>{label(URGENCY_LABELS, k.urgency, lang)}</Badge></td>
                      <td className="px-4 py-3"><SlaBadge ticket={k} /></td>
                      <td className="px-4 py-3 text-ink-soft">{label(TEAM_LABELS, k.assigned_team, lang)}<span className="block text-xs">{k.assigned_technician || t('לא הוקצה', 'Unassigned')}</span></td>
                      <td className="px-4 py-3"><Badge tone={statusTone(k.status)}>{label(STATUS_LABELS, k.status, lang)}</Badge></td>
                      <td className="px-4 py-3 text-xs text-ink-soft tnum">{fmtDateTime(k.created_at, lang)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {hasMore && <div className="border-t border-line p-3 text-center"><button type="button" className={btnSecondary} onClick={loadMore} disabled={loadingMore}>{loadingMore && <Spinner />}{t('טעינת קריאות קודמות', 'Load older tickets')}</button></div>}
        </div>
      </div>
      <TicketDrawer ticketId={openId} staff onClose={() => setOpenId(null)} onChanged={() => load(true)} />
    </AppShell>
  );
}
