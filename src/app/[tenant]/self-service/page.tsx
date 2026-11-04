'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowDown, Check, Copy, Inbox, RefreshCw, Send, Sparkles } from 'lucide-react';
import { api, errorText } from '@/lib/api';
import { fmtDateTime, useLang } from '@/lib/i18n';
import { useSession } from '@/hooks/useSession';
import { AppShell } from '@/components/AppShell';
import { SlaBadge, TicketDrawer, type TicketRow } from '@/components/TicketDrawer';
import { Badge, EmptyState, Field, Modal, Spinner, btnPrimary, btnSecondary, cardCls, inputCls, statusTone, urgencyTone, useToast } from '@/components/ui';
import { CATEGORIES, CATEGORY_LABELS, STATUS_LABELS, TEAMS, TEAM_LABELS, URGENCIES, URGENCY_LABELS, label } from '@/lib/constants';
import type { TicketPage } from '@/lib/tickets';

interface Msg { id: string; role: 'user' | 'assistant'; content: string }

const emptyForm = {
  title: '', description: '', category: 'General IT Request', urgency: 'Medium', system_impacted: '',
  assigned_team: 'Helpdesk Tier 1', user_city: '', user_phone: '',
};

export default function SelfServicePage() {
  const { t, lang, isHe } = useLang();
  const { toast } = useToast();
  const tenantSlug = String(useParams().tenant ?? '').toLowerCase();
  const { session, tenant, logout, reload } = useSession(tenantSlug);

  const welcome = t('היי, אני Tony מ-SmartQ. ספרו לי מה קרה ואמלא את הקריאה בשבילכם.', "Hi, I'm Tony from SmartQ. Tell me what happened and I'll fill in the ticket for you.");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [ready, setReady] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [aiUsed, setAiUsed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [loadingMoreTickets, setLoadingMoreTickets] = useState(false);
  const [hasMoreTickets, setHasMoreTickets] = useState(false);
  const [nextTicketCursor, setNextTicketCursor] = useState<TicketPage['nextCursor']>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  // The greeting follows the active language until the conversation starts.
  useEffect(() => { setMessages((m) => (m.some((x) => x.role === 'user') ? m : [{ id: 'welcome', role: 'assistant', content: welcome }])); }, [welcome]);
  useEffect(() => { if (session) setForm((f) => ({ ...f, user_city: f.user_city || session.city, user_phone: f.user_phone || session.phone })); }, [session]);
  useEffect(() => { chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' }); }, [messages, thinking]);

  const loadTickets = useCallback(async () => {
    setLoadingTickets(true);
    try {
      const page = await api<TicketPage>('/api/tickets');
      setTickets(page.tickets);
      setHasMoreTickets(page.hasMore);
      setNextTicketCursor(page.nextCursor);
    } catch { /* shown empty */ } finally { setLoadingTickets(false); }
  }, []);
  useEffect(() => { if (session && !session.mustChangePassword) loadTickets(); }, [session, loadTickets]);

  const loadMoreTickets = async () => {
    if (!nextTicketCursor || loadingMoreTickets) return;
    setLoadingMoreTickets(true);
    try {
      const params = new URLSearchParams({ before: nextTicketCursor.createdAt, beforeId: nextTicketCursor.id });
      const page = await api<TicketPage>(`/api/tickets?${params}`);
      setTickets((current) => {
        const byId = new Map(current.map((ticket) => [ticket.id, ticket] as const));
        for (const ticket of page.tickets) byId.set(ticket.id, ticket);
        return [...byId.values()].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at) || b.id.localeCompare(a.id));
      });
      setNextTicketCursor(page.nextCursor);
      setHasMoreTickets(page.hasMore);
    } catch (error) {
      toast(errorText(error, lang), 'error');
    } finally {
      setLoadingMoreTickets(false);
    }
  };

  const quick = isHe
    ? ['נשפך קפה על המקלדת של הלפטופ', 'לא מצליח להתחבר ל-VPN מהבית', 'צריך הרשאה לתיקייה משותפת', 'המסך החיצוני מרצד']
    : ['Spilled coffee on my laptop keyboard', "Can't connect to the VPN from home", 'Need access to a shared folder', 'External monitor is flickering'];

  const send = async (text = input) => {
    const content = text.trim();
    if (!content || thinking) return;
    const next: Msg[] = [...messages, { id: `u${Date.now()}`, role: 'user', content }];
    setMessages(next); setInput(''); setThinking(true);
    try {
      const d = await api<Record<string, string | null>>('/api/ai-parse', {
        method: 'POST',
        json: { messages: next.map(({ role, content }) => ({ role, content })), currentFormData: form, language: lang },
      });
      setAiUsed(d.source === 'ai');
      setForm((p) => ({
        ...p,
        title: d.title || p.title || content.slice(0, 60),
        description: d.description || p.description || content,
        category: d.category || p.category,
        urgency: d.urgency || p.urgency,
        system_impacted: d.system_impacted || p.system_impacted,
        assigned_team: d.assigned_team || p.assigned_team,
        user_city: d.user_city || p.user_city,
      }));
      if (d.follow_up_question) {
        setMessages((m) => [...m, { id: `a${Date.now()}`, role: 'assistant', content: d.follow_up_question as string }]);
      } else {
        setReady(true);
        setMessages((m) => [...m, { id: `a${Date.now()}`, role: 'assistant', content: t('מילאתי את פרטי הקריאה למטה. בדקו ואשרו.', 'I filled in the ticket details below. Please review and confirm.') }]);
        setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 500);
      }
    } catch (e) {
      toast(errorText(e, lang), 'error');
      // The form still works manually if the AI is unavailable.
      setForm((p) => ({ ...p, title: p.title || content.slice(0, 60), description: p.description || content }));
      setReady(true);
    } finally { setThinking(false); }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const d = await api<{ ticket: TicketRow }>('/api/tickets', { method: 'POST', json: { ...form, source: aiUsed ? 'ai' : 'manual' } });
      setCreated(d.ticket.ticket_number);
      setForm({ ...emptyForm, user_city: session?.city ?? '', user_phone: session?.phone ?? '' });
      setReady(false); setAiUsed(false);
      setMessages([{ id: `done${Date.now()}`, role: 'assistant', content: t(`קריאה #${d.ticket.ticket_number} נפתחה. אפשר לעזור במשהו נוסף?`, `Ticket #${d.ticket.ticket_number} was created. Anything else I can help with?`) }]);
      loadTickets();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (ex) { toast(errorText(ex, lang), 'error'); } finally { setSubmitting(false); }
  };

  const set = (k: keyof typeof emptyForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm({ ...form, [k]: e.target.value });

  return (
    <AppShell tenant={tenantSlug} tenantName={tenant?.name ?? tenantSlug} session={session} active="self-service" onLogout={logout} onReload={reload}>
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{t('פתיחת קריאה', 'New request')}</h1>
          <p className="text-ink-soft">{t('תארו את הבעיה ל-Tony. הוא יסווג אותה ויכין את הקריאה.', 'Describe the problem to Tony. He will classify it and prepare the ticket.')}</p>
        </div>

        <section className={`${cardCls} overflow-hidden`} aria-label="Tony">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <div className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-brand text-sm font-bold text-white">T</span>
              <div className="leading-tight"><p className="text-sm font-bold">Tony</p><p className="text-xs text-ink-soft">{t('עוזר תמיכה חכם', 'AI support assistant')}</p></div>
            </div>
            {ready && <button type="button" onClick={() => formRef.current?.scrollIntoView({ behavior: 'smooth' })} className="inline-flex items-center gap-1 text-xs font-semibold text-brand">{t('לטופס', 'Go to form')}<ArrowDown className="h-3 w-3" /></button>}
          </div>
          <div ref={chatRef} className="h-80 space-y-3 overflow-y-auto bg-canvas/60 p-4" aria-live="polite">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <p className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${m.role === 'user' ? 'bg-brand text-white' : 'border border-line bg-white'}`}>{m.content}</p>
              </div>
            ))}
            {thinking && <div className="flex items-center gap-2 text-sm text-ink-soft"><Spinner />{t('Tony מנתח…', 'Tony is analyzing…')}</div>}
          </div>
          <div className="space-y-2 border-t border-line p-3">
            <div className="flex flex-wrap gap-2">
              {quick.map((q) => <button key={q} type="button" onClick={() => send(q)} disabled={thinking} className="rounded-full border border-line px-3 py-1 text-xs text-ink-soft hover:border-brand hover:text-brand disabled:opacity-50">{q}</button>)}
            </div>
            <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2">
              <input className={inputCls} value={input} maxLength={1500} onChange={(e) => setInput(e.target.value)} placeholder={t('מה קרה?', 'What happened?')} aria-label={t('הודעה ל-Tony', 'Message to Tony')} />
              <button type="submit" disabled={thinking || !input.trim()} className={btnPrimary}><Send className={`h-4 w-4 ${isHe ? 'rotate-180' : ''}`} /><span className="hidden sm:inline">{t('שליחה', 'Send')}</span></button>
            </form>
          </div>
        </section>

        <section ref={formRef} className={`${cardCls} p-5 sm:p-6`}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold">{t('פרטי הקריאה', 'Ticket details')}</h2>
            {aiUsed && <Badge tone="bg-violet-50 text-violet-700 ring-violet-200"><Sparkles className="me-1 h-3 w-3" />{t('מולא ע״י Tony', 'Filled by Tony')}</Badge>}
          </div>
          <form onSubmit={submit} className="space-y-4">
            <Field label={t('נושא', 'Subject')}><input required minLength={3} maxLength={160} className={inputCls} value={form.title} onChange={set('title')} /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('קטגוריה', 'Category')}><select className={inputCls} value={form.category} onChange={set('category')}>{CATEGORIES.map((c) => <option key={c} value={c}>{label(CATEGORY_LABELS, c, lang)}</option>)}</select></Field>
              <Field label={t('דחיפות', 'Urgency')}><select className={inputCls} value={form.urgency} onChange={set('urgency')}>{URGENCIES.map((c) => <option key={c} value={c}>{label(URGENCY_LABELS, c, lang)}</option>)}</select></Field>
              <Field label={t('מערכת או רכיב מושפע', 'Impacted system')}><input className={inputCls} value={form.system_impacted} onChange={set('system_impacted')} maxLength={160} /></Field>
              <Field label={t('צוות מטפל', 'Team')}><select className={inputCls} value={form.assigned_team} onChange={set('assigned_team')}>{TEAMS.map((c) => <option key={c} value={c}>{label(TEAM_LABELS, c, lang)}</option>)}</select></Field>
              <Field label={t('מיקום', 'Location')}><input className={inputCls} value={form.user_city} onChange={set('user_city')} maxLength={120} /></Field>
              <Field label={t('טלפון לחזרה', 'Callback phone')}><input type="tel" dir="ltr" className={inputCls} value={form.user_phone} onChange={set('user_phone')} maxLength={40} /></Field>
            </div>
            <Field label={t('תיאור מלא', 'Full description')}><textarea required rows={4} maxLength={4000} className={inputCls} value={form.description} onChange={set('description')} /></Field>
            <button type="submit" disabled={submitting || form.title.trim().length < 3} className={`${btnPrimary} w-full py-3`}>{submitting ? <Spinner /> : <Check className="h-4 w-4" />}{t('שליחת הקריאה', 'Submit ticket')}</button>
          </form>
        </section>

        <section className={cardCls}>
          <div className="flex items-center justify-between border-b border-line px-5 py-3">
            <h2 className="font-bold">{t('הקריאות שלי', 'My tickets')} <span className="text-ink-soft tnum">({tickets.length})</span></h2>
            <button type="button" onClick={loadTickets} className={btnSecondary} aria-label={t('רענון', 'Refresh')}><RefreshCw className={`h-4 w-4 ${loadingTickets ? 'animate-spin' : ''}`} /></button>
          </div>
          {loadingTickets && tickets.length === 0 ? <div className="py-10 text-center text-brand"><Spinner className="h-5 w-5" /></div>
            : tickets.length === 0 ? <EmptyState title={t('עדיין אין קריאות', 'No tickets yet')} hint={t('הקריאה הראשונה שתפתחו תופיע כאן עם הסטטוס שלה.', 'The first ticket you open will show up here with its status.')} />
            : <ul className="divide-y divide-line">
                {tickets.map((k) => (
                  <li key={k.id}>
                    <button type="button" onClick={() => setOpenId(k.id)} className="flex w-full items-center gap-3 px-5 py-3 text-start hover:bg-canvas">
                      <Inbox className="h-4 w-4 shrink-0 text-ink-soft" aria-hidden />
                      <span className="min-w-0 flex-1"><span className="block truncate font-medium"><span className="tnum text-brand">#{k.ticket_number}</span> {k.title}</span><span className="text-xs text-ink-soft tnum">{fmtDateTime(k.created_at, lang)}</span></span>
                      <span className="hidden gap-1.5 sm:flex"><Badge tone={urgencyTone(k.urgency)}>{label(URGENCY_LABELS, k.urgency, lang)}</Badge><SlaBadge ticket={k} /></span>
                      <Badge tone={statusTone(k.status)}>{label(STATUS_LABELS, k.status, lang)}</Badge>
                    </button>
                  </li>
                ))}
              </ul>}
          {hasMoreTickets && <div className="border-t border-line p-3 text-center"><button type="button" onClick={loadMoreTickets} disabled={loadingMoreTickets} className={btnSecondary}>{loadingMoreTickets && <Spinner />}{t('טעינת קריאות קודמות', 'Load older tickets')}</button></div>}
        </section>
      </div>

      <TicketDrawer ticketId={openId} staff={false} onClose={() => setOpenId(null)} onChanged={loadTickets} />

      <Modal open={!!created} onClose={() => setCreated(null)} title={t('הקריאה נפתחה', 'Ticket created')}>
        <p className="text-sm text-ink-soft">{t('הקריאה נותבה לצוות המתאים. שמרו את המספר למעקב.', 'Your request was routed to the right team. Keep the number for reference.')}</p>
        <div className="my-4 flex items-center justify-center gap-2 rounded-xl bg-canvas py-4">
          <span className="text-3xl font-bold tracking-wider text-brand tnum">#{created}</span>
          <button type="button" aria-label={t('העתקה', 'Copy')} className="rounded-lg border border-line bg-white p-2" onClick={() => { navigator.clipboard.writeText(created ?? ''); setCopied(true); setTimeout(() => setCopied(false), 1800); }}>
            {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
        <button type="button" className={`${btnPrimary} w-full`} onClick={() => setCreated(null)}>{t('סגירה', 'Close')}</button>
      </Modal>
    </AppShell>
  );
}
