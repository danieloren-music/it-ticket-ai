'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, ArrowUpLeft, ArrowUpRight, Building2, Check, Copy, ExternalLink, KeyRound, LayoutGrid, List, MessageCircle, Pencil, Plus, RefreshCw, Search, ShieldCheck, Sparkles, TicketCheck, Trash2, UsersRound } from 'lucide-react';
import { api, errorText } from '@/lib/api';
import { fmtDate, fmtDateTime, useLang } from '@/lib/i18n';
import { Badge, EmptyState, Field, Modal, Spinner, SuccessDialog, btnDanger, btnPrimary, btnSecondary, cardCls, inputCls, useToast } from '@/components/ui';
import { A11yWidget } from '@/components/A11yWidget';
import { DailyBars } from '@/components/Charts';
import { ConsoleSidebar, type ConsoleNavGroup } from '@/components/ConsoleSidebar';
import { PLATFORM_READONLY_ROLES, PLATFORM_ROLES } from '@/lib/constants';
import { PlatformTenantApiKeysDialog } from './PlatformTenantApiKeysDialog';

type Tab = 'overview' | 'tenants' | 'users' | 'leads' | 'audit' | 'sso';
interface Tenant { id: string; name: string; domain: string; admin_email: string; status: string; created_at: string; user_count: number; ticket_count: number; open_tickets: number }
interface Admin { id: string; email: string; full_name: string; role: string; department: string; sso_only: boolean; last_login_at: string | null }
interface Stats { tenants: { total: number; active: number; trial: number; suspended: number }; users: number; tickets: { total: number; open: number; ai_created: number }; daily: { date: string; count: number }[]; leads: Lead[] }
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
  const [issued, setIssued] = useState<{ title: string; email: string; password: string; workspaceUrl?: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => { api<{ admin: Me }>('/api/platform/auth').then((d) => setMe(d.admin)).catch(() => router.replace('/platform/login')); }, [router]);

  const logout = async () => { await api('/api/platform/auth', { method: 'DELETE' }).catch(() => undefined); router.replace('/platform/login'); };
  const readOnly = me ? PLATFORM_READONLY_ROLES.has(me.role) : true;
  const navGroups: ConsoleNavGroup[] = [
    {
      key: 'overview',
      label: t('סקירה', 'Overview'),
      icon: Activity,
      items: [{ key: 'overview', label: t('סקירה', 'Overview'), icon: Activity, active: tab === 'overview', onClick: () => setTab('overview') }],
    },
    {
      key: 'workspaces',
      label: t('סביבות ומשתמשים', 'Workspaces & users'),
      icon: Building2,
      items: [
        { key: 'tenants', label: t('ארגונים', 'Organizations'), icon: Building2, active: tab === 'tenants', onClick: () => setTab('tenants') },
        { key: 'users', label: t('צוות הפלטפורמה', 'Platform team'), icon: UsersRound, active: tab === 'users', onClick: () => setTab('users') },
        ...(me?.role === 'Super Admin' ? [{ key: 'sso', label: t('כניסה אחידה (SSO)', 'Single sign-on'), icon: ShieldCheck, active: tab === 'sso', onClick: () => setTab('sso') }] : []),
      ],
    },
    {
      key: 'activity',
      label: t('פעילות', 'Activity'),
      icon: TicketCheck,
      items: [
        { key: 'leads', label: t('פניות מהאתר', 'Website leads'), icon: MessageCircle, active: tab === 'leads', onClick: () => setTab('leads') },
        { key: 'audit', label: t('יומן ביקורת', 'Audit log'), icon: TicketCheck, active: tab === 'audit', onClick: () => setTab('audit') },
      ],
    },
    {
      key: 'website',
      label: t('SmartQ', 'SmartQ'),
      icon: ExternalLink,
      items: [{ key: 'website', label: t('לאתר SmartQ', 'SmartQ Website'), icon: ExternalLink, href: '/home' }],
    },
  ];

  if (!me) return <div className="grid min-h-screen place-items-center text-brand"><Spinner className="h-6 w-6" /></div>;

  return (
    <div className="platform-console min-h-screen bg-[radial-gradient(ellipse_at_top,_#eef1ff_0,_#f5f7fa_38rem)]">
      <ConsoleSidebar
        workspace="SmartQ Platform"
        identity={me.name}
        secondaryIdentity={me.role}
        groups={navGroups}
        onProfile={() => setProfileOpen(true)}
        onLogout={logout}
        suffix={<span className="rounded-md bg-ink px-1.5 py-0.5 text-[10px] font-medium text-white">PLATFORM</span>}
      />
      <main className={`min-h-screen pt-14 lg:pt-0 ${lang === 'he' ? 'lg:mr-14' : 'lg:ml-14'}`}>
        <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
          {readOnly && <p className="rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-800">{t('התפקיד שלכם הוא לקריאה בלבד.', 'Your role is read-only.')}</p>}
          {tab === 'overview' && <OverviewTab me={me} onNavigate={setTab} />}
          {tab === 'tenants' && <TenantsTab me={me} readOnly={readOnly} onIssued={setIssued} />}
          {tab === 'users' && <UsersTab me={me} readOnly={readOnly} onIssued={setIssued} />}
          {tab === 'leads' && <LeadsTab />}
          {tab === 'audit' && <AuditTab />}
          {tab === 'sso' && me.role === 'Super Admin' && <PlatformSsoTab />}
        </div>
      </main>

      <Modal open={!!issued} onClose={() => setIssued(null)} title={issued?.title ?? ''}>
        <p className="text-sm text-ink-soft">{t('הסיסמה מוצגת פעם אחת בלבד ואינה נשמרת בטקסט גלוי. המשתמש יחויב להחליף אותה בכניסה הראשונה.', 'Shown once and never stored in clear text. The user must change it at first sign-in.')}</p>
        <div className="my-4 rounded-xl bg-canvas p-4 text-center"><p className="text-xs text-ink-soft" dir="ltr">{issued?.email}</p>
          <div className="mt-2 flex items-center justify-center gap-2"><code className="text-xl font-bold tracking-wider" dir="ltr">{issued?.password}</code>
            <button type="button" aria-label={t('העתקה', 'Copy')} className="rounded-lg border border-line bg-white p-2" onClick={() => { navigator.clipboard.writeText(issued?.password ?? ''); setCopied(true); setTimeout(() => setCopied(false), 1800); }}>{copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}</button></div></div>
        <div className="flex flex-wrap gap-2">
          {issued?.workspaceUrl && <a href={issued.workspaceUrl} target="_blank" rel="noreferrer" className={`${btnSecondary} flex-1`}><ExternalLink className="h-4 w-4" />{t('פתיחת סביבת הארגון', 'Open organization')}</a>}
          <button type="button" className={`${btnPrimary} flex-1`} onClick={() => setIssued(null)}>{t('סיימתי', 'Done')}</button>
        </div>
      </Modal>
      {profileOpen && <ProfileModal open me={me} onClose={() => setProfileOpen(false)} onSaved={(m) => { setMe(m); toast(t('הפרופיל עודכן', 'Profile updated')); }} />}
      <A11yWidget />
    </div>
  );
}

interface PlatformSamlSettings {
  saml_enabled: boolean;
  saml_login_url: string;
  saml_idp_cert: string;
}

function PlatformSsoTab() {
  const { t, lang } = useLang();
  const { toast } = useToast();
  const [settings, setSettings] = useState<PlatformSamlSettings | null>(null);
  const [sp, setSp] = useState<{ entityId: string; acsUrl: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<{ settings: PlatformSamlSettings; sp: { entityId: string; acsUrl: string } }>('/api/platform/sso')
      .then((data) => { setSettings(data.settings); setSp(data.sp); })
      .catch((error) => toast(errorText(error, lang), 'error'));
  }, [lang, toast]);

  if (!settings || !sp) return <div className="py-16 text-center text-brand"><Spinner className="h-6 w-6" /></div>;

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await api('/api/platform/sso', { method: 'PUT', json: settings });
      toast(t('הגדרות SAML נשמרו', 'SAML settings saved'));
    } catch (error) {
      toast(errorText(error, lang), 'error');
    } finally {
      setSaving(false);
    }
  };

  const readOnly = (value: string) => (
    <input readOnly dir="ltr" className={`${inputCls} bg-canvas font-mono text-xs`} value={value} onFocus={(event) => event.currentTarget.select()} />
  );

  return (
    <form onSubmit={save} className="space-y-5">
      <section className={`${cardCls} space-y-4 p-5`}>
        <div>
          <h2 className="font-bold">SAML 2.0 · Microsoft Entra ID</h2>
          <p className="mt-1 text-sm text-ink-soft">{t('התחברות לצוות הפלטפורמה דרך ספק הזהויות של הארגון.', 'Sign the platform team in through your organization’s identity provider.')}</p>
        </div>
        <ol className="list-inside list-decimal space-y-1 text-sm text-ink-soft">
          <li>{t('ב-Entra צרו Enterprise Application ובחרו SAML.', 'In Entra, create an Enterprise Application and choose SAML.')}</li>
          <li>{t('העתיקו אליו את ה-Identifier ואת Reply URL שמופיעים כאן.', 'Copy the Identifier and Reply URL below into Entra.')}</li>
          <li>{t('הגדירו את Name ID ככתובת UPN או email של המשתמש, והקצו את המשתמשים לאפליקציה ב-Entra.', 'Set Name ID to the user’s UPN or email, and assign users to the Entra application.')}</li>
          <li>{t('הזינו כאן את Login URL ואת תעודת החתימה של Entra ושמרו.', 'Enter Entra’s Login URL and signing certificate here, then save.')}</li>
          <li>{t('ב״צוות הפלטפורמה״ הוסיפו מראש כל משתמש והקצו לו תפקיד. הכניסה עצמה תתבצע מול Entra.', 'In “Platform team,” pre-create each user and assign a role. Authentication itself is handled by Entra.')}</li>
        </ol>
        <Field label="Identifier (Entity ID)">{readOnly(sp.entityId)}</Field>
        <Field label="Reply URL (Assertion Consumer Service)">{readOnly(sp.acsUrl)}</Field>
        <Field label={t('כתובת כניסה (Login URL) של Entra', 'Entra sign-in URL (Login URL)')}>
          <input type="url" dir="ltr" className={inputCls} value={settings.saml_login_url} onChange={(event) => setSettings({ ...settings, saml_login_url: event.target.value })} placeholder="https://login.microsoftonline.com/..." />
        </Field>
        <Field label={t('תעודת החתימה של Entra (PEM / Base64)', 'Entra signing certificate (PEM / Base64)')}>
          <textarea rows={5} dir="ltr" className={`${inputCls} font-mono text-xs`} value={settings.saml_idp_cert} onChange={(event) => setSettings({ ...settings, saml_idp_cert: event.target.value })} />
        </Field>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={settings.saml_enabled} onChange={(event) => setSettings({ ...settings, saml_enabled: event.target.checked })} />
          {t('הפעלת כניסה עם SAML', 'Enable SAML sign-in')}
        </label>
        <p className="text-xs text-ink-soft">{t(
          'רשומת המשתמש ב-SmartQ Platform משמשת רק למיפוי תפקיד והרשאות; סיסמת SmartQ אינה משמשת בכניסת SAML. משתמש שלא הוגדר לו תפקיד Platform ייחסם.',
          'The SmartQ Platform user record maps the Entra identity to a role and permissions only; its SmartQ password is not used for SAML sign-in. Users without a provisioned Platform role are denied.'
        )}</p>
      </section>
      <div className="flex justify-end">
        <button type="submit" disabled={saving} className={btnPrimary}>{saving && <Spinner />}{t('שמירת הגדרות', 'Save settings')}</button>
      </div>
    </form>
  );
}

/* ───────── Overview ───────── */
function OverviewTab({ me, onNavigate }: { me: Me; onNavigate: (tab: Tab) => void }) {
  const { t, lang } = useLang();
  const [s, setS] = useState<Stats | null>(null);
  const [updated, setUpdated] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => {
    setRefreshing(true);
    try { setS(await api<Stats>('/api/platform/stats')); setUpdated(new Date().toISOString()); setError(''); }
    catch (ex) { setError(errorText(ex, lang)); }
    finally { setRefreshing(false); }
  }, [lang]);
  useEffect(() => {
    // Load the dashboard immediately, then refresh it while the page is visible.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void load(); }, 30_000);
    return () => window.clearInterval(timer);
  }, [load]);
  if (!s && !error) return <div className="py-16 text-center text-brand"><Spinner className="h-6 w-6" /></div>;
  if (!s) return <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div>;
  const recentTickets = s.daily.reduce((sum, day) => sum + day.count, 0);
  const kpis = [
    { label: t('ארגונים', 'Organizations'), value: s.tenants.total, note: t(`${s.tenants.active} פעילים`, `${s.tenants.active} active`), icon: Building2, tone: 'bg-indigo-100 text-indigo-700' },
    { label: t('משתמשים', 'Users'), value: s.users, note: t('בכל הארגונים', 'Across all organizations'), icon: UsersRound, tone: 'bg-sky-100 text-sky-700' },
    { label: t('קריאות פתוחות', 'Open requests'), value: s.tickets.open, note: t(`${s.tickets.total} קריאות בסך הכול`, `${s.tickets.total} requests total`), icon: TicketCheck, tone: 'bg-amber-100 text-amber-700' },
    { label: t('קריאות בסיוע AI', 'AI-assisted requests'), value: s.tickets.ai_created, note: t('קריאות שסווגו בעזרת AI', 'Requests classified with AI'), icon: Sparkles, tone: 'bg-violet-100 text-violet-700' },
  ];
  return (
    <div className="space-y-6">
      {error && <p role="status" className="rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-800">{t('הנתונים מוצגים מהעדכון האחרון. ', 'Showing the last successful snapshot. ')}{error}</p>}
      <section className="relative isolate overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-[#111b40] via-[#172b62] to-[#3449ce] px-6 py-7 text-white shadow-xl shadow-indigo-950/10 sm:px-8 sm:py-9">
        <div className="pointer-events-none absolute -end-16 -top-32 -z-10 h-80 w-80 rounded-full bg-violet-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-36 start-1/3 -z-10 h-72 w-72 rounded-full bg-sky-300/10 blur-3xl" />
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-2xl">
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide text-indigo-100">
              <Activity className="h-3.5 w-3.5" />SMARTQ PLATFORM
            </p>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t(`שלום ${me.name.split(' ')[0]}, הנה תמונת המצב`, `Welcome back, ${me.name.split(' ')[0]}`)}</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-indigo-100/80 sm:text-base">
              {t('כל הארגונים, המשתמשים והקריאות שלך במקום אחד. בחר ארגון כדי לפתוח את סביבת העבודה ולנהל את השירות.', 'Your organizations, users, and requests in one place. Choose an organization to open its workspace and manage its service desk.')}
            </p>
          </div>
          <button type="button" onClick={() => onNavigate('tenants')} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-[#182758] shadow-lg transition hover:-translate-y-0.5 hover:bg-indigo-50">
            <Building2 className="h-4 w-4" />{t('לארגונים', 'View organizations')}<ArrowUpLeft className="h-4 w-4" />
          </button>
        </div>
        <dl className="mt-8 grid grid-cols-2 gap-3 xl:grid-cols-4">
          {kpis.map(({ label, value, note, icon: Icon, tone }) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.08] p-4 backdrop-blur-sm">
              <div className="flex items-start justify-between gap-3">
                <dt className="text-sm font-medium text-indigo-100/90">{label}</dt>
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${tone}`}><Icon className="h-4 w-4" /></span>
              </div>
              <dd className="mt-3 text-3xl font-bold tracking-tight tabular-nums">{value.toLocaleString()}</dd>
              <p className="mt-1 text-xs text-indigo-100/70">{note}</p>
            </div>
          ))}
        </dl>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <section className={`${cardCls} p-5 sm:p-6`}>
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-brand">{t('פעילות', 'ACTIVITY')}</p>
              <h2 className="mt-1 text-lg font-bold">{t('קצב פתיחת הקריאות', 'Request volume')}</h2>
              <p className="mt-1 text-sm text-ink-soft">{t('ב־14 הימים האחרונים', 'Across the last 14 days')}</p>
            </div>
          <div className="flex items-center gap-3 text-xs text-ink-soft">
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />{t('מתעדכן כל 30 שניות', 'Live · refreshes every 30 seconds')}</span>
            {updated && <span>{t('עודכן', 'Updated')} {fmtDateTime(updated, lang)}</span>}
            <button type="button" className="rounded-md border border-line p-1.5 hover:bg-canvas" onClick={() => void load()} aria-label={t('רענון', 'Refresh')}><RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} /></button>
          </div>
          </div>
          <div className="mb-4 flex items-end gap-2">
            <span className="text-3xl font-bold tabular-nums">{recentTickets.toLocaleString()}</span>
            <span className="pb-1 text-sm text-ink-soft">{t('קריאות חדשות בתקופה', 'new requests in this period')}</span>
          </div>
          <DailyBars data={s.daily} label={t('קריאות ליום', 'Tickets per day')} />
        </section>

        <section className={`${cardCls} flex flex-col p-5 sm:p-6`}>
          <p className="text-xs font-semibold uppercase tracking-wider text-violet">{t('הצעד הבא', 'GET STARTED')}</p>
          <h2 className="mt-1 text-lg font-bold">{t('מוכנים להיכנס לארגון?', 'Ready to open an organization?')}</h2>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">
            {t('פתחו סביבת ארגון, היכנסו עם פרטי מנהל הארגון, ונהלו את פניות השירות.', 'Open an organization workspace, sign in with its manager account, and manage its service requests.')}
          </p>
          <div className="mt-5 grid grid-cols-3 gap-2">
            {[
              [t('ארגונים', 'Organizations'), s.tenants.total],
              [t('בניסיון', 'On trial'), s.tenants.trial],
              [t('מושהים', 'Suspended'), s.tenants.suspended],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-xl bg-canvas p-3 text-center">
                <p className="text-xl font-bold tabular-nums">{Number(value).toLocaleString()}</p>
                <p className="mt-0.5 text-xs text-ink-soft">{label}</p>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => onNavigate('tenants')} className={`${btnPrimary} mt-5 w-full`}>
            {t('בחירת ארגון והתחלה', 'Choose an organization')}<ArrowUpLeft className="h-4 w-4" />
          </button>
        </section>
      </div>

      <section className={`${cardCls} overflow-hidden`}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-brand">{t('מה חדש', 'WHAT’S NEW')}</p>
            <h2 className="mt-1 text-lg font-bold">{t('פניות אחרונות מהאתר', 'Recent website inquiries')}</h2>
          </div>
          <button type="button" onClick={() => onNavigate('leads')} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
            {t('כל הפניות', 'All inquiries')}<ArrowUpRight className="h-4 w-4" />
          </button>
        </div>
        {s.leads.length === 0 ? (
          <p className="px-5 py-7 text-sm text-ink-soft sm:px-6">{t('אין פניות חדשות כרגע. פניות מהטופס יופיעו כאן.', 'No recent inquiries. Website contact submissions will appear here.')}</p>
        ) : (
          <ul className="divide-y divide-line sm:grid sm:grid-cols-2 sm:divide-y-0 sm:divide-x sm:divide-x-reverse">
            {s.leads.slice(0, 4).map((lead) => (
              <li key={lead.id} className="flex min-w-0 items-center gap-3 px-5 py-4 sm:px-6">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand"><MessageCircle className="h-4 w-4" /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{lead.name} <span className="font-normal text-ink-soft">· {lead.company}</span></p>
                  <p className="truncate text-xs text-ink-soft" dir="ltr">{lead.email}</p>
                </div>
                <time className="shrink-0 text-xs text-ink-soft">{fmtDate(lead.created_at, lang)}</time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/* ───────── Tenants ───────── */
const blankTenant = { id: '', name: '', domain: '', adminEmail: '', status: 'Active' };

function TenantsTab({ readOnly, me, onIssued }: { me: Me; readOnly: boolean; onIssued: (v: { title: string; email: string; password: string; workspaceUrl?: string }) => void }) {
  const { t, lang } = useLang();
  const { toast } = useToast();
  const [rows, setRows] = useState<Tenant[] | null>(null);
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [f, setF] = useState(blankTenant);
  const [saving, setSaving] = useState(false);
  const [del, setDel] = useState<Tenant | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [query, setQuery] = useState('');
  const [apiKeysTenant, setApiKeysTenant] = useState<Tenant | null>(null);
  // View mode for the organisations list: cards (default) or rows (table).
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const load = useCallback(async () => { try { setRows((await api<{ tenants: Tenant[] }>('/api/platform/tenants')).tenants); } catch (e) { toast(errorText(e, lang), 'error'); setRows([]); } }, [lang, toast]);
  useEffect(() => {
    // Populate the table when this tab first mounts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);
  const visibleRows = rows?.filter((tenant) =>
    [tenant.name, tenant.id, tenant.domain, tenant.admin_email, tenant.status]
      .some((value) => value.toLowerCase().includes(query.trim().toLowerCase()))
  ) ?? [];

  const save = async (e: React.SyntheticEvent, reset = false) => {
    e.preventDefault(); setSaving(true);
    try {
      const d = await api<{ tempPassword?: string; managerEmail: string }>('/api/platform/tenants', { method: 'POST', json: { ...f, resetManagerPassword: reset } });
      setModal(null);
      if (d.tempPassword) onIssued({ title: t('סיסמה זמנית למנהל הארגון', 'Temporary password for the organization manager'), email: d.managerEmail, password: d.tempPassword, workspaceUrl: `/${f.id}/login` });
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
    <div className="space-y-5">
      <section className="rounded-[1.75rem] border border-indigo-100 bg-gradient-to-br from-white via-indigo-50/60 to-violet-50/60 p-5 shadow-sm sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-brand"><Building2 className="h-4 w-4" />{t('ניהול סביבות', 'WORKSPACES')}</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{t('הארגונים שלך', 'Your organizations')}</h1>
            <p className="mt-1 max-w-2xl text-sm text-ink-soft">{t('כל סביבת עבודה, מנהל ומדדי השירות — עם גישה מהירה לניהול הארגון.', 'Every workspace, manager, and service metric—with quick access to organization management.')}</p>
          </div>
          <button type="button" disabled={readOnly} className={`${btnPrimary} shadow-lg shadow-brand/15`} onClick={() => { setF(blankTenant); setModal('create'); }}>
            <Plus className="h-4 w-4" />{t('יצירת ארגון', 'Create organization')}
          </button>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            { label: t('סך הארגונים', 'Total workspaces'), value: rows?.length ?? '—' },
            { label: t('ארגונים פעילים', 'Active workspaces'), value: rows?.filter((row) => row.status.toLowerCase() === 'active').length ?? '—' },
            { label: t('משתמשים בכל הארגונים', 'Users across workspaces'), value: rows?.reduce((sum, row) => sum + row.user_count, 0).toLocaleString() ?? '—' },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-white/80 bg-white/80 px-4 py-3">
              <p className="text-xs font-medium text-ink-soft">{item.label}</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">{item.value}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">{t('כל סביבות העבודה', 'All workspaces')}</h2>
          <p className="text-sm text-ink-soft">{rows ? t(`${visibleRows.length} מתוך ${rows.length} ארגונים`, `${visibleRows.length} of ${rows.length} organizations`) : t('טוען ארגונים…', 'Loading organizations…')}</p>
        </div>
        <label className="relative block w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute start-3 top-2.5 h-4 w-4 text-slate-400" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('חיפוש לפי שם, כתובת או מנהל', 'Search name, URL, or manager')} className={`${inputCls} ps-9`} />
        </label>
      </div>

      {!rows ? (
        <div className={`${cardCls} py-14 text-center text-brand`}><Spinner className="h-6 w-6" /></div>
      ) : rows.length === 0 ? (
        <div className={`${cardCls} overflow-hidden`}><EmptyState title={t('עדיין אין ארגונים', 'No organizations yet')} hint={t('צרו את הארגון הראשון כדי לקבל סביבת עבודה וחשבון מנהל.', 'Create the first organization to set up a workspace and manager account.')} /></div>
      ) : visibleRows.length === 0 ? (
        <div className={`${cardCls} overflow-hidden`}><EmptyState title={t('לא נמצאו ארגונים', 'No organizations found')} hint={t('נסו מונח חיפוש אחר.', 'Try another search term.')} /></div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {visibleRows.map((r) => (
            <article key={r.id} className={`${cardCls} group relative overflow-hidden p-5 transition duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-950/5 sm:p-6`}>
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand via-violet to-sky-400" />
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 text-lg font-bold text-brand">{r.name.trim().charAt(0).toUpperCase()}</span>
                  <div className="min-w-0">
                    <h3 className="truncate text-lg font-bold">{r.name}</h3>
                    <p className="truncate text-sm text-ink-soft" dir="ltr">{r.domain}</p>
                    <p className="mt-0.5 font-mono text-xs text-slate-400" dir="ltr">/{r.id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={statusTone(r.status)}>{r.status}</Badge>
                  <button type="button" disabled={readOnly} aria-label={t('עריכת ארגון', 'Edit organization')} title={t('עריכת ארגון', 'Edit organization')} onClick={() => { setF({ id: r.id, name: r.name, domain: r.domain, adminEmail: r.admin_email, status: r.status }); setModal('edit'); }} className="rounded-lg border border-line p-2 text-ink-soft transition hover:bg-canvas disabled:opacity-40"><Pencil className="h-4 w-4" /></button>
                  {me.role === 'Super Admin' && <button type="button" aria-label={t('מחיקת ארגון', 'Delete organization')} title={t('מחיקת ארגון', 'Delete organization')} onClick={() => { setDel(r); setConfirmText(''); }} className="rounded-lg border border-rose-200 p-2 text-rose-600 transition hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>}
                </div>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2">
                {[
                  { label: t('משתמשים', 'Users'), value: r.user_count, icon: UsersRound },
                  { label: t('קריאות', 'Requests'), value: r.ticket_count, icon: TicketCheck },
                  { label: t('פתוחות', 'Open'), value: r.open_tickets, icon: Activity },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="rounded-xl bg-canvas/80 px-3 py-3">
                    <div className="flex items-center gap-1.5 text-xs text-ink-soft"><Icon className="h-3.5 w-3.5" />{label}</div>
                    <p className="mt-1 text-xl font-bold tabular-nums">{value.toLocaleString()}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex min-w-0 items-center gap-2 text-sm text-ink-soft">
                <UsersRound className="h-4 w-4 shrink-0 text-slate-400" />
                <span className="shrink-0">{t('מנהל ראשי', 'Primary manager')}</span>
                <span className="truncate font-medium text-ink" dir="ltr">{r.admin_email}</span>
                <span className="ms-auto shrink-0 text-xs">{fmtDate(r.created_at, lang)}</span>
              </div>

              <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
              <button type="button" disabled={readOnly} onClick={() => setApiKeysTenant(r)} className={`${btnSecondary} flex-1 disabled:opacity-40`}>
                <KeyRound className="h-4 w-4" />{t('מפתחות API', 'API keys')}
              </button>
              <a href={`/${r.id}/self-service`} target="_blank" rel="noreferrer" className={`${btnPrimary} flex-1`}>
                <MessageCircle className="h-4 w-4" />{t('פתיחת סביבת השירות', 'Open service desk')}<ExternalLink className="h-3.5 w-3.5" />
              </a>
                <a href={`/${r.id}/login`} target="_blank" rel="noreferrer" className={`${btnSecondary} flex-1`}>
                  {t('כניסה לארגון', 'Organization sign in')}<ArrowUpRight className="h-4 w-4" />
                </a>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal open={modal !== null} onClose={() => setModal(null)} title={modal === 'create' ? t('ארגון חדש', 'New organization') : t('עריכת ארגון', 'Edit organization')}>
        <form onSubmit={(e) => save(e)} className="space-y-3">
          <Field label={t('מזהה (כתובת)', 'ID (URL slug)')} hint={t('אותיות קטנות באנגלית, ספרות ומקף', 'Lowercase letters, digits and hyphens')}><input required disabled={modal === 'edit'} dir="ltr" className={inputCls} value={f.id} onChange={(e) => setF({ ...f, id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })} /></Field>
          <Field label={t('שם הארגון', 'Organization name')}><input required className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label={t('דומיין', 'Primary domain')}><input dir="ltr" placeholder="company.co.il" className={inputCls} value={f.domain} onChange={(e) => setF({ ...f, domain: e.target.value })} /></Field>
          <Field label={t('אימייל מנהל ראשי', 'Primary manager email')}><input type="email" dir="ltr" className={inputCls} value={f.adminEmail} onChange={(e) => setF({ ...f, adminEmail: e.target.value })} /></Field>
          <Field label={t('סטטוס', 'Status')}><select className={inputCls} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>{['Active', 'Trial', 'Suspended'].map((s) => <option key={s}>{s}</option>)}</select></Field>
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
            {modal === 'edit' ? <button type="button" className={btnSecondary} onClick={(e) => save(e, true)}><KeyRound className="h-4 w-4" />{t('איפוס סיסמת מנהל', 'Reset manager password')}</button> : <span />}
            <div className="flex gap-2"><button type="button" className={btnSecondary} onClick={() => setModal(null)}>{t('ביטול', 'Cancel')}</button><button type="submit" disabled={saving} className={btnPrimary}>{saving && <Spinner />}{t('שמירה', 'Save')}</button></div>
          </div>
        </form>
      </Modal>

      <Modal open={!!del} onClose={() => setDel(null)} title={t('מחיקת ארגון', 'Delete organization')}>
        <p className="text-sm text-ink-soft">{t(`הפעולה תמחק לצמיתות את הארגון "${del?.name}", את כל המשתמשים והקריאות שלו. להקלדת אישור, כתבו את המזהה:`, `This permanently deletes "${del?.name}" with all its users and tickets. Type the ID to confirm:`)} <b className="font-mono" dir="ltr">{del?.id}</b></p>
        <input dir="ltr" className={`${inputCls} mt-3`} value={confirmText} onChange={(e) => setConfirmText(e.target.value)} aria-label="Confirm" />
        <div className="mt-4 flex justify-end gap-2"><button type="button" className={btnSecondary} onClick={() => setDel(null)}>{t('ביטול', 'Cancel')}</button><button type="button" className={btnDanger} disabled={confirmText !== del?.id} onClick={remove}>{t('מחיקה לצמיתות', 'Delete permanently')}</button></div>
      </Modal>
      {apiKeysTenant && <PlatformTenantApiKeysDialog tenantId={apiKeysTenant.id} tenantName={apiKeysTenant.name} onClose={() => setApiKeysTenant(null)} />}
    </div>
  );
}

/* ───────── Platform users ───────── */
function UsersTab({ me, readOnly, onIssued }: { me: Me; readOnly: boolean; onIssued: (v: { title: string; email: string; password: string }) => void }) {
  const { t, lang } = useLang();
  const { toast, confirm } = useToast();
  const [rows, setRows] = useState<Admin[] | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Admin | null>(null);
  const [f, setF] = useState({ email: '', fullName: '', role: 'Lead Support Engineer', department: 'Cloud Operations', ssoOnly: false });
  const [saving, setSaving] = useState(false);
  const isSuper = me.role === 'Super Admin';

  const load = useCallback(async () => { try { setRows((await api<{ admins: Admin[] }>('/api/platform/admins')).admins); } catch { setRows([]); } }, []);
  useEffect(() => {
    // Populate the user list when this tab first mounts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const email = editing?.email ?? f.email.trim().toLowerCase();
    try {
      const d = await api<{ tempPassword?: string }>('/api/platform/admins', { method: 'POST', json: { email, fullName: f.fullName, role: f.role, department: f.department, ssoOnly: f.ssoOnly } });
      setOpen(false);
      setEditing(null);
      if (d.tempPassword) onIssued({ title: t('סיסמה זמנית למשתמש פלטפורמה', 'Temporary password for the platform user'), email, password: d.tempPassword });
      else if (!editing) toast(t('משתמש SSO נוסף לצוות הפלטפורמה', 'SSO user added to the platform team'));
      load();
    } catch (ex) { toast(errorText(ex, lang), 'error'); } finally { setSaving(false); }
  };
  const remove = async (a: Admin) => {
    if (!(await confirm({ title: t('מחיקת משתמש', 'Delete user'), message: `${a.full_name} (${a.email})`, confirmLabel: t('מחיקה', 'Delete'), danger: true }))) return;
    try { await api(`/api/platform/admins?email=${encodeURIComponent(a.email)}`, { method: 'DELETE' }); load(); } catch (ex) { toast(errorText(ex, lang), 'error'); }
  };
  const edit = (a: Admin) => {
    setEditing(a);
    setF({ email: a.email, fullName: a.full_name, role: a.role, department: a.department, ssoOnly: false });
    setOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><button type="button" disabled={!isSuper} className={btnPrimary} onClick={() => { setEditing(null); setF({ email: '', fullName: '', role: 'Lead Support Engineer', department: 'Cloud Operations', ssoOnly: false }); setOpen(true); }}><Plus className="h-4 w-4" />{t('משתמש פלטפורמה חדש', 'New platform user')}</button></div>
      <div className={`${cardCls} overflow-hidden`}>
        {!rows ? <div className="py-12 text-center text-brand"><Spinner className="h-5 w-5" /></div> : rows.length === 0 ? <EmptyState title={t('אין משתמשים במסד הנתונים', 'No users in the database')} hint={t('כרגע נכנסים עם משתמש ה-Bootstrap ממשתני הסביבה. צרו משתמש קבוע.', 'You are signed in with the bootstrap user from environment variables. Create a permanent user.')} /> : (
          <table className="w-full text-sm"><thead className="border-b border-line bg-canvas text-xs text-ink-soft"><tr>{[t('שם', 'Name'), t('אימייל', 'Email'), t('תפקיד', 'Role'), t('כניסה אחרונה', 'Last sign-in'), ''].map((h, i) => <th key={i} className="px-4 py-2.5 text-start font-semibold">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-line">{rows.map((a) => <tr key={a.id}><td className="px-4 py-3 font-medium">{a.full_name}</td><td className="px-4 py-3 text-ink-soft" dir="ltr">{a.email}</td><td className="px-4 py-3"><div className="flex flex-wrap items-center gap-1.5"><Badge tone="bg-slate-100 text-slate-700 ring-slate-200">{a.role}</Badge>{a.sso_only && <Badge tone="bg-blue-50 text-blue-700 ring-blue-200">SSO</Badge>}</div></td><td className="px-4 py-3 text-xs text-ink-soft tnum">{fmtDateTime(a.last_login_at, lang)}</td><td className="px-4 py-3 text-end"><div className="flex justify-end gap-1">{isSuper && a.email !== me.email && !readOnly && <><button type="button" aria-label={t('עריכה', 'Edit')} onClick={() => edit(a)} className="rounded-lg border border-line p-1.5 hover:bg-slate-50"><Pencil className="h-4 w-4" /></button><button type="button" aria-label={t('מחיקה', 'Delete')} onClick={() => remove(a)} className="rounded-lg border border-rose-200 p-1.5 text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button></>}</div></td></tr>)}</tbody></table>
        )}
      </div>
      <Modal open={open} onClose={() => { setOpen(false); setEditing(null); }} title={editing ? t('עריכת משתמש פלטפורמה', 'Edit platform user') : t('משתמש פלטפורמה חדש', 'New platform user')}>
        <form onSubmit={save} className="space-y-3">
          <Field label={t('שם מלא', 'Full name')}><input required className={inputCls} value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} /></Field>
          <Field label={t('כתובת Entra / אימייל', 'Entra email address')} hint={t('הכתובת חייבת להיות זהה לכתובת שמתקבלת מ-Entra ב-SAML.', 'Must match the email address received from Entra in the SAML assertion.')}>
            <input required disabled={Boolean(editing)} type="email" dir="ltr" className={inputCls} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value.toLowerCase() })} />
          </Field>
          <Field label={t('תפקיד', 'Role')}><select className={inputCls} value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>{PLATFORM_ROLES.map((r) => <option key={r}>{r}</option>)}</select></Field>
          <Field label={t('מחלקה', 'Department')}><input className={inputCls} value={f.department} onChange={(e) => setF({ ...f, department: e.target.value })} /></Field>
          {!editing && <label className="flex items-start gap-2 text-sm text-ink-soft">
            <input type="checkbox" checked={f.ssoOnly} onChange={(e) => setF({ ...f, ssoOnly: e.target.checked })} />
            <span>{t('כניסה דרך SSO בלבד (לא להציג סיסמה מקומית)', 'SSO-only sign-in (do not issue a local password)')}</span>
          </label>}
          <div className="flex justify-end gap-2 pt-2"><button type="button" className={btnSecondary} onClick={() => { setOpen(false); setEditing(null); }}>{t('ביטול', 'Cancel')}</button><button type="submit" disabled={saving} className={btnPrimary}>{saving && <Spinner />}{t(editing ? 'שמירה' : 'יצירה', editing ? 'Save' : 'Create')}</button></div>
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
  const [passwordChanged, setPasswordChanged] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    const changingPassword = Boolean(next);
    try {
      await api('/api/platform/admins', { method: 'POST', json: { email: me.email, fullName: name, role: me.role, department: me.department || 'Cloud Operations', password: next || undefined, currentPassword: next ? cur : undefined } });
      setCur(''); setNext(''); onSaved({ ...me, name });
      if (changingPassword) setPasswordChanged(true);
      else onClose();
    } catch (ex) { toast(errorText(ex, lang), 'error'); } finally { setBusy(false); }
  };
  return (
    <>
      <Modal open={open && !passwordChanged} onClose={onClose} title={t('הפרופיל שלי', 'My profile')}>
        <form onSubmit={submit} className="space-y-3">
          <p className="text-sm text-ink-soft" dir="ltr">{me.email}</p>
          <Field label={t('שם מלא', 'Full name')}><input required className={inputCls} value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label={t('סיסמה נוכחית (לשינוי סיסמה)', 'Current password (to change it)')}><input type="password" autoComplete="current-password" className={inputCls} value={cur} onChange={(e) => setCur(e.target.value)} /></Field>
          <Field label={t('סיסמה חדשה', 'New password')} hint={t('לפחות 10 תווים, אותיות וספרות', 'At least 10 characters, letters and digits')}><input type="password" autoComplete="new-password" minLength={next ? 10 : undefined} className={inputCls} value={next} onChange={(e) => setNext(e.target.value)} /></Field>
          <div className="flex justify-end gap-2 pt-2"><button type="button" className={btnSecondary} onClick={onClose}>{t('ביטול', 'Cancel')}</button><button type="submit" disabled={busy} className={btnPrimary}>{busy && <Spinner />}{t('שמירה', 'Save')}</button></div>
        </form>
      </Modal>
      <SuccessDialog
        open={open && passwordChanged}
        title={t('הסיסמה שונתה בהצלחה', 'Password changed successfully')}
        message={t('הסיסמה החדשה שלך נשמרה. אפשר להמשיך לעבוד ב-SmartQ.', 'Your new password is saved. You can continue using SmartQ.')}
        actionLabel={t('המשך', 'Continue')}
        onClose={() => { setPasswordChanged(false); onClose(); }}
      />
    </>
  );
}
