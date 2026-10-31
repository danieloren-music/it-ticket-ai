'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Copy, ExternalLink, KeyRound, LogOut, Pencil, Plus, Trash2 } from 'lucide-react';
import { api, errorText } from '@/lib/api';
import { fmtDate, fmtDateTime, useLang } from '@/lib/i18n';
import { Badge, Brand, EmptyState, Field, LangSwitch, Modal, Spinner, btnDanger, btnPrimary, btnSecondary, cardCls, inputCls, useToast } from '@/components/ui';
import { A11yWidget } from '@/components/A11yWidget';
import { DailyBars } from '@/components/Charts';
import { PLATFORM_READONLY_ROLES, PLATFORM_ROLES } from '@/lib/constants';

type Tab = 'overview' | 'tenants' | 'users' | 'leads' | 'audit';
interface Tenant { id: string; name: string; domain: string; admin_email: string; status: string; created_at: string; user_count: number; ticket_count: number; open_tickets: number }
interface Admin { id: string; email: string; full_name: string; role: string; department: string; last_login_at: string | null }
interface Stats { tenants: { total: number; active: number }; users: number; tickets: { total: number; open: number; ai_created: number }; daily: { date: string; count: number }[]; leads: Lead[] }
interface Lead { id: string; name: string; email: string; company: string; phone: string | null; message: string | null; created_at: string }
interface AuditRow { id: string; tenant_id: string | null; actor_email: string; action: string; target: string | null; ip: string | null; created_at: string }
interface Me { email: string; name: string; role: string; department: string }

const statusTone = (s: string) => s.toLowerCase() === 'active' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : s.toLowerCase() === 'trial' ? 'bg-blue-50 text-blue-700 ring-blue-200' : 'bg-amber-50 text-amber-700 ring-amber-200';

export default function PlatformConsole() {
  const { t, lang } = useLang();
  const { toast } = useToast();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('overview');
  const [me, setMe] = useState<Me | null>(null);
  const [issued, setIssued] = useState<{ title: string; email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => { api<{ admin: Me }>('/api/platform/auth').then((d) => setMe(d.admin)).catch(() => router.replace('/platform/login')); }, [router]);

  const logout = async () => { await api('/api/platform/auth', { method: 'DELETE' }).catch(() => undefined); router.replace('/platform/login'); };
  const readOnly = me ? PLATFORM_READONLY_ROLES.has(me.role) : true;
  const tabs: [Tab, string][] = [['overview', t('סקירה', 'Overview')], ['tenants', t('ארגונים', 'Organizations')], ['users', t('צוות הפלטפורמה', 'Platform team')], ['leads', t('פניות מהאתר', 'Website leads')], ['audit', t('יומן ביקורת', 'Audit log')]];

  if (!me) return <div className="grid min-h-screen place-items-center text-brand"><Spinner className="h-6 w-6" /></div>;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Brand size={28} suffix={<span className="rounded-md bg-ink px-2 py-0.5 text-xs font-medium text-white">{t('קונסולת ספק', 'Vendor console')}</span>} />
          <div className="flex items-center gap-3">
            <LangSwitch />
            <button type="button" onClick={() => setProfileOpen(true)} className="hidden text-start leading-tight hover:opacity-80 sm:block"><span className="block text-sm font-semibold">{me.name}</span><span className="block text-xs text-ink-soft">{me.role}</span></button>
            <button type="button" onClick={logout} className={btnSecondary}><LogOut className="h-4 w-4" /><span className="hidden sm:inline">{t('התנתקות', 'Sign out')}</span></button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6">
        {readOnly && <p className="rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-800">{t('התפקיד שלכם הוא לקריאה בלבד.', 'Your role is read-only.')}</p>}
        <div role="tablist" className="flex flex-wrap gap-1 border-b border-line">
          {tabs.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} type="button" onClick={() => setTab(k)} className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold ${tab === k ? 'border-brand text-brand' : 'border-transparent text-ink-soft hover:text-ink'}`}>{l}</button>)}
        </div>
        {tab === 'overview' && <OverviewTab />}
        {tab === 'tenants' && <TenantsTab me={me} readOnly={readOnly} onIssued={setIssued} />}
        {tab === 'users' && <UsersTab me={me} readOnly={readOnly} onIssued={setIssued} />}
        {tab === 'leads' && <LeadsTab />}
        {tab === 'audit' && <AuditTab />}
      </main>

      <Modal open={!!issued} onClose={() => setIssued(null)} title={issued?.title ?? ''}>
        <p className="text-sm text-ink-soft">{t('הסיסמה מוצגת פעם אחת בלבד ואינה נשמרת בטקסט גלוי. המשתמש יחויב להחליף אותה בכניסה הראשונה.', 'Shown once and never stored in clear text. The user must change it at first sign-in.')}</p>
        <div className="my-4 rounded-xl bg-canvas p-4 text-center"><p className="text-xs text-ink-soft" dir="ltr">{issued?.email}</p>
          <div className="mt-2 flex items-center justify-center gap-2"><code className="text-xl font-bold tracking-wider" dir="ltr">{issued?.password}</code>
            <button type="button" aria-label={t('העתקה', 'Copy')} className="rounded-lg border border-line bg-white p-2" onClick={() => { navigator.clipboard.writeText(issued?.password ?? ''); setCopied(true); setTimeout(() => setCopied(false), 1800); }}>{copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}</button></div></div>
        <button type="button" className={`${btnPrimary} w-full`} onClick={() => setIssued(null)}>{t('סיימתי', 'Done')}</button>
      </Modal>
      <ProfileModal open={profileOpen} me={me} onClose={() => setProfileOpen(false)} onSaved={(m) => { setMe(m); toast(t('הפרופיל עודכן', 'Profile updated')); }} />
      <A11yWidget />
    </div>
  );
}

/* ───────── Overview ───────── */
function OverviewTab() {
  const { t } = useLang();
  const [s, setS] = useState<Stats | null>(null);
  useEffect(() => { api<Stats>('/api/platform/stats').then(setS).catch(() => undefined); }, []);
  if (!s) return <div className="py-16 text-center text-brand"><Spinner className="h-6 w-6" /></div>;
  const kpis: [string, string][] = [
    [t('ארגונים פעילים', 'Active organizations'), `${s.tenants.active} / ${s.tenants.total}`],
    [t('משתמשים', 'Users'), String(s.users)],
    [t('קריאות בסך הכל', 'Total tickets'), String(s.tickets.total)],
    [t('נפתחו דרך Tony', 'Created via Tony'), String(s.tickets.ai_created)],
  ];
  return (
    <div className="space-y-5">
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">{kpis.map(([k, v]) => <div key={k} className={`${cardCls} p-4`}><dt className="text-sm text-ink-soft">{k}</dt><dd className="mt-1 text-3xl font-bold tnum">{v}</dd></div>)}</dl>
      <section className={`${cardCls} p-5`}><h2 className="mb-4 font-bold">{t('קריאות בכל הארגונים, 14 ימים', 'Tickets across all organizations, 14 days')}</h2><DailyBars data={s.daily} label={t('קריאות ליום', 'Tickets per day')} /></section>
    </div>
  );
}

/* ───────── Tenants ───────── */
const blankTenant = { id: '', name: '', domain: '', adminEmail: '', status: 'Active' };

function TenantsTab({ readOnly, me, onIssued }: { me: Me; readOnly: boolean; onIssued: (v: { title: string; email: string; password: string }) => void }) {
  const { t, lang } = useLang();
  const { toast } = useToast();
  const [rows, setRows] = useState<Tenant[] | null>(null);
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [f, setF] = useState(blankTenant);
  const [saving, setSaving] = useState(false);
  const [del, setDel] = useState<Tenant | null>(null);
  const [confirmText, setConfirmText] = useState('');

  const load = useCallback(async () => { try { setRows((await api<{ tenants: Tenant[] }>('/api/platform/tenants')).tenants); } catch (e) { toast(errorText(e, lang), 'error'); setRows([]); } }, [lang, toast]);
  useEffect(() => { load(); }, [load]);

  const save = async (e: React.FormEvent, reset = false) => {
    e.preventDefault(); setSaving(true);
    try {
      const d = await api<{ tempPassword?: string; managerEmail: string }>('/api/platform/tenants', { method: 'POST', json: { ...f, resetManagerPassword: reset } });
      setModal(null);
      if (d.tempPassword) onIssued({ title: t('סיסמה זמנית למנהל הארגון', 'Temporary password for the organization manager'), email: d.managerEmail, password: d.tempPassword });
      else toast(t('הארגון עודכן', 'Organization updated'));
      load();
    } catch (ex) { toast(errorText(ex, lang), 'error'); } finally { setSaving(false); }
  };

  const remove = async () => {
    if (!del) return;
    try { await api(`/api/platform/tenants?id=${del.id}&confirm=${encodeURIComponent(confirmText)}`, { method: 'DELETE' }); toast(t('הארגון נמחק', 'Organization deleted')); setDel(null); setConfirmText(''); load(); }
    catch (ex) { toast(errorText(ex, lang), 'error'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><button type="button" disabled={readOnly} className={btnPrimary} onClick={() => { setF(blankTenant); setModal('create'); }}><Plus className="h-4 w-4" />{t('ארגון חדש', 'New organization')}</button></div>
      <div className={`${cardCls} overflow-hidden`}>
        {!rows ? <div className="py-12 text-center text-brand"><Spinner className="h-5 w-5" /></div> : rows.length === 0 ? <EmptyState title={t('עדיין אין ארגונים', 'No organizations yet')} hint={t('צרו את הארגון הראשון כדי לקבל כתובת וחשבון מנהל.', 'Create the first organization to get a URL and a manager account.')} /> : (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead className="border-b border-line bg-canvas text-xs text-ink-soft"><tr>{[t('ארגון', 'Organization'), t('כתובת', 'URL'), t('מנהל', 'Manager'), t('משתמשים', 'Users'), t('קריאות (פתוחות)', 'Tickets (open)'), t('סטטוס', 'Status'), ''].map((h, i) => <th key={i} className="px-4 py-2.5 text-start font-semibold">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-canvas">
                  <td className="px-4 py-3"><span className="font-semibold">{r.name}</span><span className="block text-xs text-ink-soft" dir="ltr">{r.domain}</span><span className="block text-xs text-ink-soft">{fmtDate(r.created_at, lang)}</span></td>
                  <td className="px-4 py-3"><a href={`/${r.id}/login`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-mono text-xs text-brand hover:underline" dir="ltr">/{r.id}<ExternalLink className="h-3 w-3" /></a></td>
                  <td className="px-4 py-3 text-ink-soft" dir="ltr">{r.admin_email}</td>
                  <td className="px-4 py-3 tnum">{r.user_count}</td>
                  <td className="px-4 py-3 tnum">{r.ticket_count} ({r.open_tickets})</td>
                  <td className="px-4 py-3"><Badge tone={statusTone(r.status)}>{r.status}</Badge></td>
                  <td className="px-4 py-3"><div className="flex justify-end gap-1.5">
                    <button type="button" disabled={readOnly} aria-label={t('עריכה', 'Edit')} onClick={() => { setF({ id: r.id, name: r.name, domain: r.domain, adminEmail: r.admin_email, status: r.status }); setModal('edit'); }} className="rounded-lg border border-line p-1.5 hover:bg-slate-50 disabled:opacity-40"><Pencil className="h-4 w-4" /></button>
                    {me.role === 'Super Admin' && <button type="button" aria-label={t('מחיקה', 'Delete')} onClick={() => { setDel(r); setConfirmText(''); }} className="rounded-lg border border-rose-200 p-1.5 text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>}
                  </div></td>
                </tr>
              ))}
            </tbody></table></div>
        )}
      </div>

      <Modal open={modal !== null} onClose={() => setModal(null)} title={modal === 'create' ? t('ארגון חדש', 'New organization') : t('עריכת ארגון', 'Edit organization')}>
        <form onSubmit={(e) => save(e)} className="space-y-3">
          <Field label={t('מזהה (כתובת)', 'ID (URL slug)')} hint={t('אותיות קטנות באנגלית, ספרות ומקף', 'Lowercase letters, digits and hyphens')}><input required disabled={modal === 'edit'} dir="ltr" className={inputCls} value={f.id} onChange={(e) => setF({ ...f, id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })} /></Field>
          <Field label={t('שם הארגון', 'Organization name')}><input required className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label={t('דומיין', 'Primary domain')}><input dir="ltr" placeholder="company.co.il" className={inputCls} value={f.domain} onChange={(e) => setF({ ...f, domain: e.target.value })} /></Field>
          <Field label={t('אימייל מנהל ראשי', 'Primary manager email')}><input type="email" dir="ltr" className={inputCls} value={f.adminEmail} onChange={(e) => setF({ ...f, adminEmail: e.target.value })} /></Field>
          <Field label={t('סטטוס', 'Status')}><select className={inputCls} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>{['Active', 'Trial', 'Suspended'].map((s) => <option key={s}>{s}</option>)}</select></Field>
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
            {modal === 'edit' ? <button type="button" className={btnSecondary} onClick={(e) => save(e as unknown as React.FormEvent, true)}><KeyRound className="h-4 w-4" />{t('איפוס סיסמת מנהל', 'Reset manager password')}</button> : <span />}
            <div className="flex gap-2"><button type="button" className={btnSecondary} onClick={() => setModal(null)}>{t('ביטול', 'Cancel')}</button><button type="submit" disabled={saving} className={btnPrimary}>{saving && <Spinner />}{t('שמירה', 'Save')}</button></div>
          </div>
        </form>
      </Modal>

      <Modal open={!!del} onClose={() => setDel(null)} title={t('מחיקת ארגון', 'Delete organization')}>
        <p className="text-sm text-ink-soft">{t(`הפעולה תמחק לצמיתות את הארגון "${del?.name}", את כל המשתמשים והקריאות שלו. להקלדת אישור, כתבו את המזהה:`, `This permanently deletes "${del?.name}" with all its users and tickets. Type the ID to confirm:`)} <b className="font-mono" dir="ltr">{del?.id}</b></p>
        <input dir="ltr" className={`${inputCls} mt-3`} value={confirmText} onChange={(e) => setConfirmText(e.target.value)} aria-label="Confirm" />
        <div className="mt-4 flex justify-end gap-2"><button type="button" className={btnSecondary} onClick={() => setDel(null)}>{t('ביטול', 'Cancel')}</button><button type="button" className={btnDanger} disabled={confirmText !== del?.id} onClick={remove}>{t('מחיקה לצמיתות', 'Delete permanently')}</button></div>
      </Modal>
    </div>
  );
}

/* ───────── Platform users ───────── */
function UsersTab({ me, readOnly, onIssued }: { me: Me; readOnly: boolean; onIssued: (v: { title: string; email: string; password: string }) => void }) {
  const { t, lang } = useLang();
  const { toast, confirm } = useToast();
  const [rows, setRows] = useState<Admin[] | null>(null);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ username: '', fullName: '', role: 'Lead Support Engineer', department: 'Cloud Operations' });
  const [saving, setSaving] = useState(false);
  const isSuper = me.role === 'Super Admin';

  const load = useCallback(async () => { try { setRows((await api<{ admins: Admin[] }>('/api/platform/admins')).admins); } catch { setRows([]); } }, []);
  useEffect(() => { load(); }, [load]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const email = `${f.username.replace(/[^a-z0-9._-]/g, '')}@smartq.ai`;
    try {
      const d = await api<{ tempPassword?: string }>('/api/platform/admins', { method: 'POST', json: { email, fullName: f.fullName, role: f.role, department: f.department } });
      setOpen(false);
      if (d.tempPassword) onIssued({ title: t('סיסמה זמנית למשתמש פלטפורמה', 'Temporary password for the platform user'), email, password: d.tempPassword });
      load();
    } catch (ex) { toast(errorText(ex, lang), 'error'); } finally { setSaving(false); }
  };
  const remove = async (a: Admin) => {
    if (!(await confirm({ title: t('מחיקת משתמש', 'Delete user'), message: `${a.full_name} (${a.email})`, confirmLabel: t('מחיקה', 'Delete'), danger: true }))) return;
    try { await api(`/api/platform/admins?email=${encodeURIComponent(a.email)}`, { method: 'DELETE' }); load(); } catch (ex) { toast(errorText(ex, lang), 'error'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><button type="button" disabled={!isSuper} className={btnPrimary} onClick={() => setOpen(true)}><Plus className="h-4 w-4" />{t('משתמש פלטפורמה חדש', 'New platform user')}</button></div>
      <div className={`${cardCls} overflow-hidden`}>
        {!rows ? <div className="py-12 text-center text-brand"><Spinner className="h-5 w-5" /></div> : rows.length === 0 ? <EmptyState title={t('אין משתמשים במסד הנתונים', 'No users in the database')} hint={t('כרגע נכנסים עם משתמש ה-Bootstrap ממשתני הסביבה. צרו משתמש קבוע.', 'You are signed in with the bootstrap user from environment variables. Create a permanent user.')} /> : (
          <table className="w-full text-sm"><thead className="border-b border-line bg-canvas text-xs text-ink-soft"><tr>{[t('שם', 'Name'), t('אימייל', 'Email'), t('תפקיד', 'Role'), t('כניסה אחרונה', 'Last sign-in'), ''].map((h, i) => <th key={i} className="px-4 py-2.5 text-start font-semibold">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-line">{rows.map((a) => <tr key={a.id}><td className="px-4 py-3 font-medium">{a.full_name}</td><td className="px-4 py-3 text-ink-soft" dir="ltr">{a.email}</td><td className="px-4 py-3"><Badge tone="bg-slate-100 text-slate-700 ring-slate-200">{a.role}</Badge></td><td className="px-4 py-3 text-xs text-ink-soft tnum">{fmtDateTime(a.last_login_at, lang)}</td><td className="px-4 py-3 text-end">{isSuper && a.email !== me.email && !readOnly && <button type="button" aria-label={t('מחיקה', 'Delete')} onClick={() => remove(a)} className="rounded-lg border border-rose-200 p-1.5 text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>}</td></tr>)}</tbody></table>
        )}
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title={t('משתמש פלטפורמה חדש', 'New platform user')}>
        <form onSubmit={save} className="space-y-3">
          <Field label={t('שם מלא', 'Full name')}><input required className={inputCls} value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} /></Field>
          <Field label={t('שם משתמש', 'Username')}><div className="flex items-center overflow-hidden rounded-lg border border-line" dir="ltr"><input required className="w-full bg-transparent px-3 py-2 text-sm outline-none" value={f.username} onChange={(e) => setF({ ...f, username: e.target.value.toLowerCase() })} /><span className="bg-canvas px-3 py-2 text-sm text-ink-soft">@smartq.ai</span></div></Field>
          <Field label={t('תפקיד', 'Role')}><select className={inputCls} value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>{PLATFORM_ROLES.map((r) => <option key={r}>{r}</option>)}</select></Field>
          <div className="flex justify-end gap-2 pt-2"><button type="button" className={btnSecondary} onClick={() => setOpen(false)}>{t('ביטול', 'Cancel')}</button><button type="submit" disabled={saving} className={btnPrimary}>{saving && <Spinner />}{t('יצירה', 'Create')}</button></div>
        </form>
      </Modal>
    </div>
  );
}

/* ───────── Leads / Audit ───────── */
function LeadsTab() {
  const { t, lang } = useLang();
  const [rows, setRows] = useState<Lead[] | null>(null);
  useEffect(() => { api<Stats>('/api/platform/stats').then((s) => setRows(s.leads)).catch(() => setRows([])); }, []);
  if (!rows) return <div className="py-16 text-center text-brand"><Spinner className="h-6 w-6" /></div>;
  return rows.length === 0 ? <div className={cardCls}><EmptyState title={t('אין פניות עדיין', 'No leads yet')} hint={t('פניות מטופס יצירת הקשר באתר יופיעו כאן.', 'Submissions from the website contact form appear here.')} /></div> : (
    <ul className="space-y-3">{rows.map((l) => <li key={l.id} className={`${cardCls} p-4`}><div className="flex flex-wrap justify-between gap-2"><p className="font-semibold">{l.name} · {l.company}</p><span className="text-xs text-ink-soft tnum">{fmtDateTime(l.created_at, lang)}</span></div><p className="text-sm text-ink-soft" dir="ltr">{l.email}{l.phone ? ` · ${l.phone}` : ''}</p>{l.message && <p className="mt-2 text-sm">{l.message}</p>}</li>)}</ul>
  );
}

function AuditTab() {
  const { t, lang } = useLang();
  const [rows, setRows] = useState<AuditRow[] | null>(null);
  useEffect(() => { api<{ entries: AuditRow[] }>('/api/platform/audit').then((d) => setRows(d.entries)).catch(() => setRows([])); }, []);
  if (!rows) return <div className="py-16 text-center text-brand"><Spinner className="h-6 w-6" /></div>;
  return (
    <div className={`${cardCls} overflow-hidden`}>{rows.length === 0 ? <EmptyState title={t('אין פעילות מתועדת', 'No recorded activity')} /> : (
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="border-b border-line bg-canvas text-xs text-ink-soft"><tr>{[t('זמן', 'Time'), t('ארגון', 'Org'), t('משתמש', 'Actor'), t('פעולה', 'Action'), t('יעד', 'Target'), 'IP'].map((h) => <th key={h} className="px-4 py-2.5 text-start font-semibold">{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-line">{rows.map((r) => <tr key={r.id}><td className="px-4 py-2.5 text-xs text-ink-soft tnum">{fmtDateTime(r.created_at, lang)}</td><td className="px-4 py-2.5 font-mono text-xs">{r.tenant_id || '–'}</td><td className="px-4 py-2.5" dir="ltr">{r.actor_email}</td><td className="px-4 py-2.5 font-mono text-xs">{r.action}</td><td className="px-4 py-2.5 text-ink-soft" dir="ltr">{r.target || '–'}</td><td className="px-4 py-2.5 text-xs text-ink-soft" dir="ltr">{r.ip || '–'}</td></tr>)}</tbody></table></div>)}</div>
  );
}

/* ───────── Own profile ───────── */
function ProfileModal({ open, me, onClose, onSaved }: { open: boolean; me: Me; onClose: () => void; onSaved: (m: Me) => void }) {
  const { t, lang } = useLang();
  const { toast } = useToast();
  const [name, setName] = useState(me.name);
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try {
      await api('/api/platform/admins', { method: 'POST', json: { email: me.email, fullName: name, role: me.role, department: me.department || 'Cloud Operations', password: next || undefined, currentPassword: next ? cur : undefined } });
      setCur(''); setNext(''); onSaved({ ...me, name }); onClose();
    } catch (ex) { toast(errorText(ex, lang), 'error'); } finally { setBusy(false); }
  };
  return (
    <Modal open={open} onClose={onClose} title={t('הפרופיל שלי', 'My profile')}>
      <form onSubmit={submit} className="space-y-3">
        <p className="text-sm text-ink-soft" dir="ltr">{me.email}</p>
        <Field label={t('שם מלא', 'Full name')}><input required className={inputCls} value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label={t('סיסמה נוכחית (לשינוי סיסמה)', 'Current password (to change it)')}><input type="password" autoComplete="current-password" className={inputCls} value={cur} onChange={(e) => setCur(e.target.value)} /></Field>
        <Field label={t('סיסמה חדשה', 'New password')} hint={t('לפחות 10 תווים, אותיות וספרות', 'At least 10 characters, letters and digits')}><input type="password" autoComplete="new-password" minLength={next ? 10 : undefined} className={inputCls} value={next} onChange={(e) => setNext(e.target.value)} /></Field>
        <div className="flex justify-end gap-2 pt-2"><button type="button" className={btnSecondary} onClick={onClose}>{t('ביטול', 'Cancel')}</button><button type="submit" disabled={busy} className={btnPrimary}>{busy && <Spinner />}{t('שמירה', 'Save')}</button></div>
      </form>
    </Modal>
  );
}
