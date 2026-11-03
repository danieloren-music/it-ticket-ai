'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Check, Copy, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { api, errorText } from '@/lib/api';
import { fmtDateTime, fmtDuration, useLang } from '@/lib/i18n';
import { useSession } from '@/hooks/useSession';
import { AppShell } from '@/components/AppShell';
import { DailyBars, Distribution } from '@/components/Charts';
import { Badge, EmptyState, Field, Modal, Spinner, btnPrimary, btnSecondary, cardCls, inputCls, useToast } from '@/components/ui';
import { CATEGORY_LABELS, ROLES, ROLE_LABELS, TEAM_LABELS, URGENCY_LABELS, label, type DbRole } from '@/lib/constants';

type Tab = 'overview' | 'users' | 'roles' | 'sso' | 'audit';

interface DirUser {
  id: string; email: string; full_name: string; role: DbRole; job_title: string | null; department: string | null;
  site_location: string | null; phone_number: string | null; is_active: boolean; last_login_at: string | null; must_change_password: boolean;
}
interface Stats {
  totals: { today: number; open: number; critical_open: number; breached_open: number; resolved: number; total: number };
  avg_resolution_minutes: number | null; sla_compliance: number | null;
  by_category: Record<string, number>; by_urgency: Record<string, number>; by_team: Record<string, number>;
  daily: { date: string; count: number }[];
}
interface Sso {
  saml_enabled: boolean;
  saml_login_url: string;
  saml_idp_cert: string;
  oidc_enabled: boolean;
  oidc_issuer: string;
  oidc_client_id: string;
  oidc_client_secret: string;
  has_oidc_client_secret: boolean;
  platform_oidc_client_available: boolean;
}
interface AuditEntry { id: string; actor_email: string; actor_role: string | null; action: string; target: string | null; ip: string | null; created_at: string }

const roleTone = (r: string) => r === 'Manager' ? 'bg-violet-50 text-violet-700 ring-violet-200' : r === 'Admin' ? 'bg-blue-50 text-blue-700 ring-blue-200' : 'bg-slate-100 text-slate-700 ring-slate-200';

export default function ManagePage() {
  const { t } = useLang();
  const tenantSlug = String(useParams().tenant ?? '').toLowerCase();
  const { session, tenant, logout, reload } = useSession(tenantSlug);
  const [tab, setTab] = useState<Tab>('overview');

  const tabs: [Tab, string][] = [['overview', t('סקירה', 'Overview')], ['users', t('משתמשים', 'Users')], ['roles', t('תפקידים והרשאות', 'Roles and permissions')], ['sso', t('כניסה אחידה (SSO)', 'Single sign-on')], ['audit', t('יומן ביקורת', 'Audit log')]];

  return (
    <AppShell tenant={tenantSlug} tenantName={tenant?.name ?? tenantSlug} session={session} active="manage" onLogout={logout} onReload={reload}>
      <div className="space-y-5">
        <div><h1 className="text-2xl font-bold">{t('ניהול הארגון', 'Organization administration')}</h1><p className="text-ink-soft">{tenant?.name} · {tenant?.domain}</p></div>
        <div role="tablist" className="flex flex-wrap gap-1 border-b border-line">
          {tabs.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} type="button" onClick={() => setTab(k)} className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold ${tab === k ? 'border-brand text-brand' : 'border-transparent text-ink-soft hover:text-ink'}`}>{l}</button>)}
        </div>
        {session && !session.mustChangePassword && (
          <>
            {tab === 'overview' && <Overview />}
            {tab === 'users' && <UsersTab domain={tenant?.domain ?? ''} selfEmail={session.email} demo={session.demo} />}
            {tab === 'roles' && <RolesTab />}
            {tab === 'sso' && <SsoTab demo={session.demo} />}
            {tab === 'audit' && <AuditTab />}
          </>
        )}
      </div>
    </AppShell>
  );
}

/* ───────────────────────── Overview ───────────────────────── */
function Overview() {
  const { t, lang } = useLang();
  const [s, setS] = useState<Stats | null>(null);
  useEffect(() => { api<Stats>('/api/tenant/stats').then(setS).catch(() => undefined); }, []);
  if (!s) return <div className="py-16 text-center text-brand"><Spinner className="h-6 w-6" /></div>;

  const kpis: [string, string][] = [
    [t('קריאות היום', 'Tickets today'), String(s.totals.today)],
    [t('פתוחות כעת', 'Open now'), String(s.totals.open)],
    [t('זמן פתרון ממוצע', 'Avg. resolution time'), fmtDuration(s.avg_resolution_minutes, lang)],
    [t('עמידה ב-SLA', 'SLA compliance'), s.sla_compliance === null ? '–' : `${s.sla_compliance}%`],
  ];
  const dist = (m: Record<string, number>, map: Record<string, { he: string; en: string }>) =>
    Object.entries(m).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name: label(map as never, name, lang), value }));

  return (
    <div className="space-y-5">
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">{kpis.map(([k, v]) => <div key={k} className={`${cardCls} p-4`}><dt className="text-sm text-ink-soft">{k}</dt><dd className="mt-1 text-3xl font-bold tnum">{v}</dd></div>)}</dl>
      <div className="grid gap-5 lg:grid-cols-3">
        <section className={`${cardCls} p-5 lg:col-span-2`}><h2 className="mb-4 font-bold">{t('קריאות ב-14 הימים האחרונים', 'Tickets in the last 14 days')}</h2><DailyBars data={s.daily} label={t('קריאות ליום', 'Tickets per day')} /></section>
        <section className={`${cardCls} p-5`}><h2 className="mb-4 font-bold">{t('לפי דחיפות', 'By urgency')}</h2><Distribution items={dist(s.by_urgency, URGENCY_LABELS)} /></section>
        <section className={`${cardCls} p-5`}><h2 className="mb-4 font-bold">{t('לפי קטגוריה', 'By category')}</h2><Distribution items={dist(s.by_category, CATEGORY_LABELS)} /></section>
        <section className={`${cardCls} p-5`}><h2 className="mb-4 font-bold">{t('לפי צוות', 'By team')}</h2><Distribution items={dist(s.by_team, TEAM_LABELS)} /></section>
        <section className={`${cardCls} p-5`}><h2 className="mb-4 font-bold">{t('דורש תשומת לב', 'Needs attention')}</h2>
          <ul className="space-y-2 text-sm"><li className="flex justify-between"><span>{t('חריגות SLA פתוחות', 'Open SLA breaches')}</span><b className="tnum">{s.totals.breached_open}</b></li><li className="flex justify-between"><span>{t('קריטיות פתוחות', 'Critical open')}</span><b className="tnum">{s.totals.critical_open}</b></li><li className="flex justify-between"><span>{t('נפתרו (90 ימים)', 'Resolved (90 days)')}</span><b className="tnum">{s.totals.resolved}</b></li></ul>
        </section>
      </div>
      <p className="text-xs text-ink-soft">{t('המדדים מחושבים מהקריאות ב-90 הימים האחרונים.', 'Metrics are computed from tickets of the last 90 days.')}</p>
    </div>
  );
}

/* ───────────────────────── Users ───────────────────────── */
const blankUser = { firstName: '', lastName: '', username: '', password: '', role: 'User' as DbRole, jobTitle: '', department: '', siteLocation: '', phoneNumber: '', isActive: true };

function UsersTab({ domain, selfEmail, demo }: { domain: string; selfEmail: string; demo: boolean }) {
  const { t, lang } = useLang();
  const { toast, confirm } = useToast();
  const [users, setUsers] = useState<DirUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [f, setF] = useState(blankUser);
  const [saving, setSaving] = useState(false);
  const [issued, setIssued] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try { setUsers((await api<{ users: DirUser[] }>('/api/directory')).users); } catch (e) { toast(errorText(e, lang), 'error'); } finally { setLoading(false); }
  }, [lang, toast]);
  useEffect(() => {
    let cancelled = false;
    api<{ users: DirUser[] }>('/api/directory')
      .then((data) => { if (!cancelled) setUsers(data.users); })
      .catch((error) => { if (!cancelled) toast(errorText(error, lang), 'error'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [lang, toast]);

  const openCreate = () => { setF(blankUser); setModal('create'); };
  const openEdit = (u: DirUser) => {
    const [first, ...rest] = u.full_name.split(' ');
    setF({ firstName: first, lastName: rest.join(' '), username: u.email.split('@')[0], password: '', role: u.role, jobTitle: u.job_title ?? '', department: u.department ?? '', siteLocation: u.site_location ?? '', phoneNumber: u.phone_number ?? '', isActive: u.is_active });
    setModal('edit');
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const email = `${f.username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '')}@${domain}`;
    try {
      const d = await api<{ tempPassword?: string }>('/api/directory', { method: 'POST', json: { email, fullName: `${f.firstName} ${f.lastName}`.trim(), password: f.password || undefined, role: f.role, jobTitle: f.jobTitle, department: f.department, siteLocation: f.siteLocation, phoneNumber: f.phoneNumber, isActive: f.isActive } });
      setModal(null);
      if (d.tempPassword) setIssued({ email, password: d.tempPassword });
      else toast(t('המשתמש עודכן', 'User updated'));
      load();
    } catch (ex) { toast(errorText(ex, lang), 'error'); } finally { setSaving(false); }
  };

  const remove = async (u: DirUser) => {
    if (!(await confirm({ title: t('מחיקת משתמש', 'Delete user'), message: t(`למחוק את ${u.full_name} (${u.email})? הפעולה אינה הפיכה.`, `Delete ${u.full_name} (${u.email})? This cannot be undone.`), confirmLabel: t('מחיקה', 'Delete'), danger: true }))) return;
    try { await api(`/api/directory?email=${encodeURIComponent(u.email)}`, { method: 'DELETE' }); toast(t('המשתמש נמחק', 'User deleted')); load(); }
    catch (ex) { toast(errorText(ex, lang), 'error'); }
  };

  const needle = q.trim().toLowerCase();
  const rows = users.filter((u) => !needle || [u.full_name, u.email, u.department, u.site_location].some((v) => v?.toLowerCase().includes(needle)));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-sm"><Search className="pointer-events-none absolute start-3 top-2.5 h-4 w-4 text-slate-400" /><input className={`${inputCls} ps-9`} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('חיפוש לפי שם, אימייל או מחלקה', 'Search by name, email or department')} aria-label={t('חיפוש', 'Search')} /></div>
        <button type="button" className={btnPrimary} onClick={openCreate} disabled={demo} title={demo ? t('מושבת בהדגמה', 'Disabled in demo') : undefined}><Plus className="h-4 w-4" />{t('הוספת משתמש', 'Add user')}</button>
      </div>
      <div className={`${cardCls} overflow-hidden`}>
        {loading ? <div className="py-12 text-center text-brand"><Spinner className="h-5 w-5" /></div> : rows.length === 0 ? <EmptyState title={t('לא נמצאו משתמשים', 'No users found')} /> : (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead className="border-b border-line bg-canvas text-xs text-ink-soft"><tr>{[t('שם', 'Name'), t('אימייל', 'Email'), t('תפקיד', 'Role'), t('מחלקה ומיקום', 'Department and site'), t('כניסה אחרונה', 'Last sign-in'), t('סטטוס', 'Status'), ''].map((h, i) => <th key={i} className="px-4 py-2.5 text-start font-semibold">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-line">
              {rows.map((u) => (
                <tr key={u.id} className="hover:bg-canvas">
                  <td className="px-4 py-3 font-medium">{u.full_name}</td>
                  <td className="px-4 py-3 text-ink-soft" dir="ltr">{u.email}</td>
                  <td className="px-4 py-3"><Badge tone={roleTone(u.role)}>{label(ROLE_LABELS, u.role, lang)}</Badge></td>
                  <td className="px-4 py-3 text-ink-soft">{u.department || '–'} · {u.site_location || '–'}</td>
                  <td className="px-4 py-3 text-xs text-ink-soft tnum">{fmtDateTime(u.last_login_at, lang)}</td>
                  <td className="px-4 py-3">{u.is_active ? <Badge tone="bg-emerald-50 text-emerald-700 ring-emerald-200">{t('פעיל', 'Active')}</Badge> : <Badge tone="bg-slate-100 text-slate-600 ring-slate-200">{t('מושבת', 'Disabled')}</Badge>}{u.must_change_password && <span className="ms-1.5 text-xs text-amber-600">{t('סיסמה זמנית', 'temp password')}</span>}</td>
                  <td className="px-4 py-3"><div className="flex justify-end gap-1.5">
                    <button type="button" aria-label={t('עריכה', 'Edit')} disabled={demo} onClick={() => openEdit(u)} className="rounded-lg border border-line p-1.5 hover:bg-slate-50 disabled:opacity-40"><Pencil className="h-4 w-4" /></button>
                    <button type="button" aria-label={t('מחיקה', 'Delete')} disabled={demo || u.email === selfEmail.toLowerCase()} onClick={() => remove(u)} className="rounded-lg border border-rose-200 p-1.5 text-rose-600 hover:bg-rose-50 disabled:opacity-40"><Trash2 className="h-4 w-4" /></button>
                  </div></td>
                </tr>
              ))}
            </tbody></table></div>
        )}
      </div>

      <Modal open={modal !== null} onClose={() => setModal(null)} wide title={modal === 'create' ? t('הוספת משתמש', 'Add user') : t('עריכת משתמש', 'Edit user')}>
        <form onSubmit={save} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t('שם פרטי', 'First name')}><input required className={inputCls} value={f.firstName} onChange={(e) => setF({ ...f, firstName: e.target.value })} /></Field>
            <Field label={t('שם משפחה', 'Last name')}><input required className={inputCls} value={f.lastName} onChange={(e) => setF({ ...f, lastName: e.target.value })} /></Field>
          </div>
          <Field label={t('שם משתמש', 'Username')}>
            <div className="flex items-center overflow-hidden rounded-lg border border-line focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20" dir="ltr">
              <input required disabled={modal === 'edit'} className="w-full bg-transparent px-3 py-2 text-sm outline-none disabled:text-slate-500" value={f.username} onChange={(e) => setF({ ...f, username: e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, '') })} />
              <span className="whitespace-nowrap bg-canvas px-3 py-2 text-sm text-ink-soft">@{domain}</span>
            </div>
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t('תפקיד', 'Role')}><select className={inputCls} value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as DbRole })}>{ROLES.map((r) => <option key={r} value={r}>{label(ROLE_LABELS, r, lang)}</option>)}</select></Field>
            <Field label={modal === 'edit' ? t('איפוס סיסמה (אופציונלי)', 'Reset password (optional)') : t('סיסמה (ריק = ייווצר קוד זמני)', 'Password (empty = generate temporary)')}><input type="text" autoComplete="off" minLength={f.password ? 10 : undefined} className={inputCls} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></Field>
            <Field label={t('מחלקה', 'Department')}><input className={inputCls} value={f.department} onChange={(e) => setF({ ...f, department: e.target.value })} /></Field>
            <Field label={t('מיקום', 'Site')}><input className={inputCls} value={f.siteLocation} onChange={(e) => setF({ ...f, siteLocation: e.target.value })} /></Field>
          </div>
          {modal === 'edit' && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.isActive} onChange={(e) => setF({ ...f, isActive: e.target.checked })} />{t('חשבון פעיל', 'Account active')}</label>}
          <div className="flex justify-end gap-2 pt-2"><button type="button" className={btnSecondary} onClick={() => setModal(null)}>{t('ביטול', 'Cancel')}</button><button type="submit" disabled={saving} className={btnPrimary}>{saving && <Spinner />}{t('שמירה', 'Save')}</button></div>
        </form>
      </Modal>

      <Modal open={!!issued} onClose={() => setIssued(null)} title={t('סיסמה זמנית', 'Temporary password')}>
        <p className="text-sm text-ink-soft">{t('הסיסמה מוצגת פעם אחת בלבד. העבירו אותה למשתמש; הוא יתבקש להחליף אותה בכניסה הראשונה.', 'This password is shown only once. Share it with the user; they will be asked to change it at first sign-in.')}</p>
        <div className="my-4 rounded-xl bg-canvas p-4 text-center"><p className="text-xs text-ink-soft" dir="ltr">{issued?.email}</p>
          <div className="mt-2 flex items-center justify-center gap-2"><code className="text-xl font-bold tracking-wider" dir="ltr">{issued?.password}</code>
            <button type="button" aria-label={t('העתקה', 'Copy')} className="rounded-lg border border-line bg-white p-2" onClick={() => { navigator.clipboard.writeText(issued?.password ?? ''); setCopied(true); setTimeout(() => setCopied(false), 1800); }}>{copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}</button></div></div>
        <button type="button" className={`${btnPrimary} w-full`} onClick={() => setIssued(null)}>{t('סיימתי', 'Done')}</button>
      </Modal>
    </div>
  );
}

/* ───────────────────────── Roles ───────────────────────── */
function RolesTab() {
  const { t } = useLang();
  const rows: [string, boolean, boolean, boolean][] = [
    [t('פתיחת קריאה וצפייה בקריאות שלי', 'Open tickets and view my own'), true, true, true],
    [t('צפייה בכל תור הקריאות', 'View the whole service queue'), false, true, true],
    [t('שינוי סטטוס, הקצאה והערות פנימיות', 'Change status, assign and add internal notes'), false, true, true],
    [t('מדדים ו-SLA', 'Metrics and SLA'), false, true, true],
    [t('ניהול משתמשים ותפקידים', 'Manage users and roles'), false, false, true],
    [t('הגדרות SSO ויומן ביקורת', 'SSO settings and audit log'), false, false, true],
  ];
  const Yes = () => <Check className="mx-auto h-4 w-4 text-emerald-600" aria-label="yes" />;
  return (
    <div className={`${cardCls} overflow-hidden`}><table className="w-full text-sm">
      <thead className="border-b border-line bg-canvas text-xs text-ink-soft"><tr><th className="px-4 py-2.5 text-start font-semibold">{t('יכולת', 'Capability')}</th>{[t('עובד', 'Employee'), t('טכנאי IT', 'IT technician'), t('מנהל', 'Administrator')].map((h) => <th key={h} className="px-4 py-2.5 text-center font-semibold">{h}</th>)}</tr></thead>
      <tbody className="divide-y divide-line">{rows.map(([cap, a, b, c]) => <tr key={cap}><td className="px-4 py-3">{cap}</td>{[a, b, c].map((v, i) => <td key={i} className="px-4 py-3 text-center">{v ? <Yes /> : <span className="text-slate-300">–</span>}</td>)}</tr>)}</tbody>
    </table><p className="border-t border-line px-4 py-3 text-xs text-ink-soft">{t('ההרשאות נאכפות בשרת בכל בקשה, לא רק בממשק.', 'Permissions are enforced on the server for every request, not only in the UI.')}</p></div>
  );
}

/* ───────────────────────── SSO ───────────────────────── */
function SsoTab({ demo }: { demo: boolean }) {
  const { t, lang } = useLang();
  const { toast } = useToast();
  const [s, setS] = useState<Sso | null>(null);
  const [sp, setSp] = useState<{ entityId: string; acsUrl: string; oidcCallbackUrl: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<{ settings: Omit<Sso, 'oidc_client_secret'>; sp: { entityId: string; acsUrl: string; oidcCallbackUrl: string } }>('/api/tenant/settings')
      .then((d) => { setS({ ...d.settings, oidc_client_secret: '' }); setSp(d.sp); })
      .catch((e) => toast(errorText(e, lang), 'error'));
  }, [lang, toast]);
  if (!s || !sp) return <div className="py-16 text-center text-brand"><Spinner className="h-6 w-6" /></div>;

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      await api('/api/tenant/settings', { method: 'PUT', json: s });
      setS({
        ...s,
        oidc_client_secret: '',
        has_oidc_client_secret: Boolean(s.oidc_client_id && (s.oidc_client_secret || s.has_oidc_client_secret)),
      });
      toast(t('הגדרות ה-SSO נשמרו', 'SSO settings saved'));
    }
    catch (ex) { toast(errorText(ex, lang), 'error'); } finally { setSaving(false); }
  };
  const ro = (v: string) => <input readOnly dir="ltr" className={`${inputCls} bg-canvas font-mono text-xs`} value={v} onFocus={(e) => e.currentTarget.select()} />;

  return (
    <form onSubmit={save} className="space-y-5">
      <p className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
        {t(
          'אפשר להפעיל SAML 2.0, OpenID Connect או את שניהם. משתמש חייב להיות מוגדר ופעיל ב-SmartQ; התפקיד שלו מנוהל כאן ואינו דורש הקצאת קבוצות ב-Entra.',
          'Enable SAML 2.0, OpenID Connect, or both. Users must be provisioned and active in SmartQ; their role is managed here and does not require Entra group assignment.'
        )}
      </p>
      <section className={`${cardCls} space-y-3 p-5`}>
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-bold">SAML 2.0</h2>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={s.saml_enabled} onChange={(e) => setS({ ...s, saml_enabled: e.target.checked })} />{t('פעיל', 'Enabled')}</label>
        </div>
        <Field label="Identifier (Entity ID)">{ro(sp.entityId)}</Field>
        <Field label="Reply URL (Assertion Consumer Service)">{ro(sp.acsUrl)}</Field>
        <Field label={t('כתובת כניסה של ספק הזהויות', 'Identity provider sign-in URL')}><input type="url" dir="ltr" className={inputCls} value={s.saml_login_url} onChange={(e) => setS({ ...s, saml_login_url: e.target.value })} placeholder="https://idp.example.com/saml2" /></Field>
        <Field label={t('תעודת החתימה (Base64 / PEM)', 'Signing certificate (Base64 / PEM)')} hint={t('נדרשת לאימות החתימה. בלעדיה הכניסה עם SSO חסומה.', 'Required to verify signatures. Without it SSO sign-in stays disabled.')}><textarea rows={4} dir="ltr" className={`${inputCls} font-mono text-xs`} value={s.saml_idp_cert} onChange={(e) => setS({ ...s, saml_idp_cert: e.target.value })} /></Field>
      </section>
      <section className={`${cardCls} space-y-3 p-5`}>
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-bold">OpenID Connect</h2>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={s.oidc_enabled} onChange={(e) => setS({ ...s, oidc_enabled: e.target.checked })} />{t('פעיל', 'Enabled')}</label>
        </div>
        <Field label="Issuer URL" hint={t('הערך המדויק שמופיע בשדה issuer במסמך discovery של ספק הזהויות.', 'The exact issuer value from the identity provider discovery document.')}>
          <input type="url" required={s.oidc_enabled} dir="ltr" className={inputCls} value={s.oidc_issuer} onChange={(e) => setS({ ...s, oidc_issuer: e.target.value })} placeholder="https://login.microsoftonline.com/{tenant-id}/v2.0" />
        </Field>
        <Field label={t('Client ID (אופציונלי)', 'Client ID (optional)')} hint={s.platform_oidc_client_available
          ? t('ריק משתמש ב-App Registration הרב-ארגוני של SmartQ. אפשר להזין רישום OIDC נפרד של הארגון.', 'Blank uses SmartQ’s multi-tenant App Registration. You may enter an organization-owned OIDC registration.')
          : t('הזינו Client ID וסוד של App Registration / OIDC client שהארגון יצר.', 'Enter the Client ID and secret of an App Registration / OIDC client created for this organization.')}>
          <input dir="ltr" className={`${inputCls} font-mono text-xs`} value={s.oidc_client_id} onChange={(e) => setS({ ...s, oidc_client_id: e.target.value })} />
        </Field>
        {s.oidc_client_id && <Field label="Client Secret" hint={s.has_oidc_client_secret
          ? t('סוד כבר שמור ומוצפן. השאירו ריק כדי לשמור אותו ללא שינוי, או הזינו סוד חדש לסבב.', 'A secret is already stored encrypted. Leave blank to keep it or enter a replacement to rotate it.')
          : t('הסוד נשמר מוצפן בשרת ולא מוחזר למסך לאחר השמירה.', 'The secret is encrypted on the server and never returned to the browser.')}>
          <input type="password" autoComplete="new-password" dir="ltr" className={`${inputCls} font-mono text-xs`} value={s.oidc_client_secret} onChange={(e) => setS({ ...s, oidc_client_secret: e.target.value })} />
        </Field>}
        <Field label="Redirect URI">{ro(sp.oidcCallbackUrl)}</Field>
        <p className="text-xs text-ink-soft">{t(
          'SmartQ משתמשת ב-Authorization Code + PKCE, מאמתת state/nonce וטוקנים, ואינה מבקשת הרשאות Graph. נדרשים משתמשים פעילים שהוקצו מראש ב-SmartQ.',
          'SmartQ uses Authorization Code + PKCE, validates state/nonce and tokens, and does not request Graph permissions. Users must be active and provisioned in SmartQ.'
        )}</p>
      </section>
      <div className="flex justify-end"><button type="submit" disabled={saving || demo} className={btnPrimary}>{saving && <Spinner />}{t('שמירת הגדרות', 'Save settings')}</button></div>
    </form>
  );
}

/* ───────────────────────── Audit ───────────────────────── */
function AuditTab() {
  const { t, lang } = useLang();
  const [rows, setRows] = useState<AuditEntry[] | null>(null);
  useEffect(() => { api<{ entries: AuditEntry[] }>('/api/tenant/audit').then((d) => setRows(d.entries)).catch(() => setRows([])); }, []);
  if (!rows) return <div className="py-16 text-center text-brand"><Spinner className="h-6 w-6" /></div>;
  return (
    <div className={`${cardCls} overflow-hidden`}>
      {rows.length === 0 ? <EmptyState title={t('אין פעילות מתועדת', 'No recorded activity')} /> : (
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead className="border-b border-line bg-canvas text-xs text-ink-soft"><tr>{[t('זמן', 'Time'), t('משתמש', 'Actor'), t('פעולה', 'Action'), t('יעד', 'Target'), 'IP'].map((h) => <th key={h} className="px-4 py-2.5 text-start font-semibold">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-line">{rows.map((r) => <tr key={r.id}><td className="px-4 py-2.5 text-xs text-ink-soft tnum">{fmtDateTime(r.created_at, lang)}</td><td className="px-4 py-2.5" dir="ltr">{r.actor_email}</td><td className="px-4 py-2.5 font-mono text-xs">{r.action}</td><td className="px-4 py-2.5 text-ink-soft" dir="ltr">{r.target || '–'}</td><td className="px-4 py-2.5 text-xs text-ink-soft" dir="ltr">{r.ip || '–'}</td></tr>)}</tbody>
        </table></div>
      )}
    </div>
  );
}
