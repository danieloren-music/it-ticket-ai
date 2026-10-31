'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check, Clock, KeyRound, Languages, ScrollText, ShieldCheck, Sparkles, Users, Building2, Gauge } from 'lucide-react';
import { api, errorText } from '@/lib/api';
import { useLang } from '@/lib/i18n';
import { A11yWidget } from '@/components/A11yWidget';
import { Badge, Brand, LangSwitch, Spinner, Field, inputCls, urgencyTone } from '@/components/ui';
import { CATEGORY_LABELS, TEAM_LABELS, URGENCY_LABELS, label } from '@/lib/constants';

interface Classification {
  title: string; category: string; urgency: string; assigned_team: string;
  system_impacted: string; next_step: string; sla_hours: number; source: 'ai' | 'rules';
}

export default function HomeClient() {
  const { t, lang, isHe } = useLang();
  const router = useRouter();
  const Arrow = isHe ? ArrowLeft : ArrowRight;

  /* ───────── live console ───────── */
  const examples = [
    { name: t('רשת קריטית', 'Network outage'), text: t('הרשת האלחוטית בקומה 4 מנותקת ומחלקת הכספים לא מצליחה לגשת ל-SAP', 'Wi-Fi on floor 4 is down and Finance cannot reach SAP') },
    { name: t('הרשאות', 'Access'), text: t('עובד חדש לא מצליח להתחבר ל-VPN ומקבל שגיאת הרשאה', 'A new hire cannot connect to the VPN and gets an authorization error') },
    { name: t('חומרה', 'Hardware'), text: t('נשפך קפה על המקלדת של הלפטופ והמקשים תקועים', 'Coffee spilled on my laptop keyboard and keys are stuck') },
  ];
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Classification | null>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const consoleRef = useRef<HTMLDivElement>(null);

  const sample: Classification = {
    title: t('אין Wi-Fi בקומה 4, מחלקת הכספים חסומה מ-SAP', 'No Wi-Fi on floor 4, Finance blocked from SAP'),
    category: 'Network & Connectivity', urgency: 'Critical', assigned_team: 'Network & Security',
    system_impacted: t('נקודות גישה / SAP', 'Access points / SAP'),
    next_step: t('לבדוק את מצב נקודות הגישה בקומה ולנטר חיבורי לקוחות.', 'Check access point status on the floor and monitor client connections.'),
    sla_hours: 4, source: 'rules',
  };
  const shown = result ?? sample;
  const isSample = !result;

  const run = async (value = text) => {
    if (value.trim().length < 6 || busy) return;
    setBusy(true); setError('');
    try {
      setResult(await api<Classification>('/api/demo/classify', { method: 'POST', json: { text: value, language: lang } }));
    } catch (e) { setError(errorText(e, lang)); } finally { setBusy(false); }
  };

  const tryIt = () => {
    consoleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => areaRef.current?.focus(), 400);
  };

  /* ───────── role demo ───────── */
  const [starting, setStarting] = useState<string | null>(null);
  const [demoErr, setDemoErr] = useState('');
  const startDemo = async (role: 'user' | 'admin' | 'manager') => {
    setStarting(role); setDemoErr('');
    try {
      const d = await api<{ redirect: string }>('/api/demo/start', { method: 'POST', json: { role } });
      router.push(d.redirect);
    } catch (e) { setDemoErr(errorText(e, lang)); setStarting(null); }
  };

  /* ───────── contact ───────── */
  const [form, setForm] = useState({ name: '', email: '', company: '', phone: '', message: '', website: '' });
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [formErr, setFormErr] = useState('');
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true); setFormErr('');
    try { await api('/api/contact', { method: 'POST', json: form }); setSent(true); }
    catch (ex) { setFormErr(errorText(ex, lang)); } finally { setSending(false); }
  };

  const roles = [
    { key: 'user' as const, icon: Users, title: t('עובד', 'Employee'), who: 'Noa Levi · Finance', body: t('מתארים תקלה בשיחה עם Tony, בודקים את הטופס שמולא ושולחים. כל עובד רואה רק את הקריאות שלו.', 'Describe a problem to Tony, review the pre-filled ticket and send it. Employees only see their own tickets.') },
    { key: 'admin' as const, icon: Gauge, title: t('טכנאי IT', 'IT technician'), who: 'Daniel Cohen · IT Operations', body: t('תור קריאות עם סינון, מצב SLA, הקצאה, הערות פנימיות ויומן פעולות לכל קריאה.', 'A queue with filters, SLA state, assignment, internal notes and a full timeline per ticket.') },
    { key: 'manager' as const, icon: Building2, title: t('מנהל מערכת', 'Administrator'), who: 'Maya Shapira · IT Management', body: t('מדדים אמיתיים, ניהול משתמשים והרשאות, הגדרת SSO ויומן ביקורת.', 'Live metrics, user and role management, SSO setup and the audit log.') },
  ];

  const features = [
    { icon: ShieldCheck, title: t('בידוד בין ארגונים', 'Tenant isolation'), body: t('כל בקשה נבדקת מול סשן חתום; הארגון נקבע בשרת ולא ע״י הדפדפן. מסד הנתונים נעול ל-anon באמצעות RLS.', 'Every request is checked against a signed session; the tenant comes from the server, never the browser. The database is locked to anon via RLS.') },
    { icon: KeyRound, title: t('SAML 2.0 ו-Microsoft Entra ID', 'SAML 2.0 and Microsoft Entra ID'), body: t('אימות חתימת ה-Assertion מול תעודת ה-IdP של הארגון ושיוך תפקיד אוטומטי לפי קבוצות אבטחה.', "Assertion signatures are verified against the organization's IdP certificate; roles are mapped from security groups.") },
    { icon: Users, title: t('שלושה תפקידים, הרשאות מוגדרות', 'Three roles, enforced server-side'), body: t('עובד, טכנאי ומנהל. נעילת חשבון אחרי ניסיונות כושלים, סיסמאות מוצפנות והחלפת סיסמה זמנית בכניסה ראשונה.', 'Employee, technician, administrator. Account lockout, hashed passwords and forced change of temporary passwords.') },
    { icon: Clock, title: t('מעקב SLA', 'SLA tracking'), body: t('יעד פתרון לפי דחיפות, חישוב עמידה ביעד וקריאות חורגות בתור הטיפול.', 'Resolution targets per urgency, compliance metrics and breached tickets flagged in the queue.') },
    { icon: ScrollText, title: t('יומן ביקורת', 'Audit log'), body: t('כניסות, שינויי משתמשים, הגדרות וטיפול בקריאות נרשמים עם מי, מתי ומאיפה.', 'Sign-ins, user changes, settings and ticket handling are recorded with who, when and from where.') },
    { icon: Languages, title: t('עברית ואנגלית, נגישות', 'Hebrew and English, accessible'), body: t('ממשק RTL/LTR מלא ותפריט נגישות (ניגודיות, גודל גופן, עצירת אנימציות).', 'Full RTL/LTR interface and an accessibility menu (contrast, font size, reduced motion).') },
  ];

  const stack = ['Next.js', 'React', 'TypeScript', 'Supabase (Postgres)', 'Google Gemini', 'SAML 2.0', 'Vercel'];

  return (
    <div className="bg-white">
      <a href="#main" className="skip-link">{t('דלג לתוכן', 'Skip to content')}</a>

      <header className="sticky top-0 z-30 border-b border-line bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Brand size={34} />
          <nav aria-label="Main" className="hidden items-center gap-7 text-sm font-medium text-ink-soft md:flex">
            <a href="#how" className="hover:text-ink">{t('איך זה עובד', 'How it works')}</a>
            <a href="#product" className="hover:text-ink">{t('המוצר', 'The product')}</a>
            <a href="#enterprise" className="hover:text-ink">{t('לארגונים', 'For enterprises')}</a>
            <a href="#contact" className="hover:text-ink">{t('יצירת קשר', 'Contact')}</a>
          </nav>
          <div className="flex items-center gap-3">
            <LangSwitch />
            <button type="button" onClick={tryIt} className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white shadow-sm shadow-brand/30 transition hover:bg-brand-strong">
              <Sparkles className="h-4 w-4" />{t('נסה את SmartQ', 'Try SmartQ')}
            </button>
          </div>
        </div>
      </header>

      <main id="main">
        {/* ───────── Hero ───────── */}
        <section className="border-b border-line bg-canvas">
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-14 sm:px-6 lg:grid-cols-12 lg:py-20">
            <div className="lg:col-span-5">
              <h1 className="text-4xl font-bold leading-tight tracking-tight text-ink sm:text-5xl">
                {t('מתיאור חופשי של תקלה לקריאה מסווגת, מתועדפת ומנותבת.', 'From a plain-language problem to a classified, prioritized, routed ticket.')}
              </h1>
              <p className="mt-5 max-w-lg text-lg text-ink-soft">
                {t('העובד כותב מה קרה. SmartQ מזהה את הקטגוריה, קובע דחיפות, בוחר את הצוות המטפל ומתחיל לספור SLA. בלי טפסים של עשרים שדות.', 'The employee writes what happened. SmartQ picks the category, sets the urgency, chooses the team and starts the SLA clock. No twenty-field forms.')}
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <button type="button" onClick={tryIt} className="inline-flex items-center gap-2.5 rounded-xl bg-brand px-7 py-3.5 text-base font-bold text-white shadow-lg shadow-brand/30 transition hover:-translate-y-0.5 hover:bg-brand-strong">
                  <Sparkles className="h-5 w-5" />{t('נסה את SmartQ', 'Try SmartQ')}
                </button>
                <a href="#product" className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-6 py-3.5 text-base font-semibold text-ink hover:bg-slate-50">
                  {t('לגרסה המלאה', 'Open the full product')}<Arrow className="h-4 w-4" />
                </a>
              </div>
              <p className="mt-4 text-sm text-ink-soft">{t('בלי הרשמה ובלי כרטיס אשראי. ההדגמה פועלת על נתוני דוגמה.', 'No sign-up, no credit card. The demo runs on sample data.')}</p>
            </div>

            {/* The one bold element: the live triage console */}
            <div ref={consoleRef} className="lg:col-span-7" id="try">
              <div className="overflow-hidden rounded-2xl border border-console-line bg-console text-white shadow-2xl shadow-ink/20" dir={isHe ? 'rtl' : 'ltr'}>
                <div className="flex items-center justify-between border-b border-console-line px-5 py-3 text-xs text-[#9aa7d6]">
                  <span className="font-semibold text-white">{t('הודעת העובד', "Employee's message")}</span>
                  <span>{t('סיווג חי', 'Live triage')}</span>
                </div>
                <div className="grid gap-px bg-console-line md:grid-cols-2">
                  <div className="bg-console p-5">
                    <label htmlFor="demo-text" className="sr-only">{t('תיאור התקלה', 'Problem description')}</label>
                    <textarea
                      id="demo-text" ref={areaRef} rows={5} maxLength={500} value={text}
                      onChange={(e) => setText(e.target.value)}
                      onKeyDown={(e) => (e.metaKey || e.ctrlKey) && e.key === 'Enter' && run()}
                      placeholder={t('למשל: המדפסת בקומה 2 לא מדפיסה ומציגה שגיאה', 'e.g. The printer on floor 2 will not print and shows an error')}
                      className="w-full resize-none rounded-lg border border-console-line bg-[#101c42] p-3 text-sm leading-relaxed text-white placeholder:text-[#6f7cab] focus:border-[#8fa0ff] focus:outline-none"
                    />
                    <div className="mt-3 flex flex-wrap gap-2">
                      {examples.map((x) => (
                        <button key={x.name} type="button" onClick={() => { setText(x.text); run(x.text); }} className="rounded-full border border-console-line px-3 py-1 text-xs text-[#c3ccf0] hover:border-[#8fa0ff] hover:text-white">{x.name}</button>
                      ))}
                    </div>
                    <button type="button" onClick={() => run()} disabled={busy || text.trim().length < 6} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-bold text-ink transition hover:bg-[#e8ecff] disabled:opacity-50">
                      {busy ? <><Spinner />{t('SmartQ מסווג…', 'SmartQ is triaging…')}</> : <><Sparkles className="h-4 w-4 text-brand" />{t('סווג את הקריאה', 'Classify this ticket')}</>}
                    </button>
                    {error && <p role="alert" className="mt-3 text-sm text-rose-300">{error}</p>}
                  </div>

                  <div className="bg-[#0e1a3d] p-5" aria-live="polite">
                    <div className="mb-3 flex items-center justify-between text-xs">
                      <span className="text-[#9aa7d6]">{isSample ? t('דוגמה', 'Example') : t('הקריאה שנוצרה', 'Generated ticket')}</span>
                      <Badge tone={urgencyTone(shown.urgency)}>{label(URGENCY_LABELS, shown.urgency, lang)}</Badge>
                    </div>
                    <div key={shown.title} className="rise">
                      <p className="text-base font-semibold leading-snug">{shown.title}</p>
                      <dl className="mt-4 space-y-2.5 text-sm">
                        {[
                          [t('קטגוריה', 'Category'), label(CATEGORY_LABELS, shown.category, lang)],
                          [t('צוות מטפל', 'Assigned team'), label(TEAM_LABELS, shown.assigned_team, lang)],
                          [t('מערכת מושפעת', 'Impacted system'), shown.system_impacted],
                          [t('יעד פתרון', 'Resolution target'), `${shown.sla_hours} ${t('שעות', 'hours')}`],
                        ].map(([k, v]) => (
                          <div key={k} className="flex justify-between gap-4 border-b border-console-line pb-2">
                            <dt className="text-[#9aa7d6]">{k}</dt><dd className="text-end font-medium">{v}</dd>
                          </div>
                        ))}
                      </dl>
                      <p className="mt-4 text-sm"><span className="text-[#9aa7d6]">{t('צעד ראשון לטכנאי: ', 'First step for the technician: ')}</span>{shown.next_step}</p>
                      {!isSample && (
                        <p className="mt-3 text-xs text-[#7f8cbb]">
                          {shown.source === 'ai' ? t('סווג ע״י Google Gemini.', 'Classified by Google Gemini.') : t('מצב גיבוי מבוסס כללים (מנוע ה-AI לא היה זמין).', 'Rule-based fallback (the AI engine was unavailable).')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ───────── How it works ───────── */}
        <section id="how" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <h2 className="max-w-2xl text-3xl font-bold tracking-tight">{t('שלושה צעדים מהתקלה לטכנאי הנכון', 'Three steps from the problem to the right technician')}</h2>
          <ol className="mt-10 grid gap-8 md:grid-cols-3">
            {[
              [t('העובד מתאר', 'The employee describes'), t('בעברית או באנגלית, במילים שלו. Tony שואל שאלת הבהרה אחת אם חסר מידע קריטי.', 'In Hebrew or English, in their own words. Tony asks one clarifying question if critical details are missing.')],
              [t('SmartQ מסווג ומנתב', 'SmartQ classifies and routes'), t('קטגוריה, דחיפות, מערכת מושפעת וצוות מטפל. העובד מאשר לפני שליחה.', 'Category, urgency, impacted system and team. The employee confirms before sending.')],
              [t('הצוות מטפל במעקב', 'The team resolves with tracking'), t('הקריאה נכנסת לתור עם יעד SLA, הקצאה, הערות פנימיות ויומן פעולות.', 'The ticket enters the queue with an SLA target, assignment, internal notes and a timeline.')],
            ].map(([title, body], i) => (
              <li key={title} className="relative border-t-2 border-ink pt-5">
                <span className="text-sm font-semibold text-brand">{i + 1}</span>
                <h3 className="mt-1 text-lg font-bold">{title}</h3>
                <p className="mt-2 text-ink-soft">{body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ───────── Full product demo ───────── */}
        <section id="product" className="border-y border-line bg-canvas">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
            <h2 className="max-w-2xl text-3xl font-bold tracking-tight">{t('המוצר המלא, בלי הרשמה', 'The full product, no sign-up')}</h2>
            <p className="mt-3 max-w-2xl text-ink-soft">{t('בחרו תפקיד וכנסו לארגון הדגמה עם קריאות לדוגמה. אפשר לפתוח קריאה, לטפל בה ולראות את המדדים. הנתונים מתאפסים כל 24 שעות.', 'Pick a role and enter a demo organization with sample tickets. Open a ticket, work it and see the metrics. Data resets every 24 hours.')}</p>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {roles.map((r) => (
                <div key={r.key} className="flex flex-col rounded-xl border border-line bg-white p-6">
                  <r.icon className="h-6 w-6 text-brand" aria-hidden />
                  <h3 className="mt-4 text-lg font-bold">{r.title}</h3>
                  <p className="text-xs text-ink-soft">{r.who}</p>
                  <p className="mt-3 flex-1 text-sm text-ink-soft">{r.body}</p>
                  <button type="button" onClick={() => startDemo(r.key)} disabled={starting !== null} className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand disabled:opacity-60">
                    {starting === r.key ? <Spinner /> : null}{t(`כניסה כ${r.title}`, `Enter as ${r.title.toLowerCase()}`)}
                  </button>
                </div>
              ))}
            </div>
            {demoErr && <p role="alert" className="mt-4 text-sm font-medium text-rose-600">{demoErr}</p>}
          </div>
        </section>

        {/* ───────── Enterprise ───────── */}
        <section id="enterprise" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <h2 className="max-w-2xl text-3xl font-bold tracking-tight">{t('נבנה לעבוד בתוך ארגון', 'Built to run inside an organization')}</h2>
          <dl className="mt-10 grid gap-x-12 gap-y-9 md:grid-cols-2">
            {features.map((f) => (
              <div key={f.title} className="flex gap-4">
                <f.icon className="mt-1 h-5 w-5 shrink-0 text-brand" aria-hidden />
                <div><dt className="font-bold">{f.title}</dt><dd className="mt-1 text-ink-soft">{f.body}</dd></div>
              </div>
            ))}
          </dl>
          <div className="mt-14 border-t border-line pt-6">
            <p className="text-sm font-semibold">{t('טכנולוגיות', 'Built with')}</p>
            <ul className="mt-3 flex flex-wrap gap-2">{stack.map((s) => <li key={s} className="rounded-md bg-canvas px-3 py-1 text-sm text-ink-soft ring-1 ring-inset ring-line">{s}</li>)}</ul>
          </div>
        </section>

        {/* ───────── Contact ───────── */}
        <section id="contact" className="border-t border-line bg-canvas">
          <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
            <h2 className="text-3xl font-bold tracking-tight">{t('רוצים סביבה לארגון שלכם?', 'Want an environment for your organization?')}</h2>
            <p className="mt-3 text-ink-soft">{t('השאירו פרטים ונחזור אליכם להקמת סביבת ניסיון בדומיין שלכם.', 'Leave your details and we will set up a trial environment on your domain.')}</p>
            <div className="mt-8 rounded-xl border border-line bg-white p-6 sm:p-8">
              {sent ? (
                <div className="py-8 text-center">
                  <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-50 text-emerald-600"><Check className="h-6 w-6" /></span>
                  <p className="mt-4 text-lg font-bold">{t('הפנייה התקבלה', 'Request received')}</p>
                  <p className="mt-1 text-ink-soft">{t('נחזור אליכם בהקדם.', 'We will get back to you shortly.')}</p>
                </div>
              ) : (
                <form onSubmit={submit} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label={t('שם מלא', 'Full name')}><input required className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" /></Field>
                    <Field label={t('אימייל ארגוני', 'Work email')}><input required type="email" dir="ltr" className={inputCls} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" /></Field>
                    <Field label={t('ארגון', 'Company')}><input required className={inputCls} value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} autoComplete="organization" /></Field>
                    <Field label={t('טלפון (אופציונלי)', 'Phone (optional)')}><input type="tel" dir="ltr" className={inputCls} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} autoComplete="tel" /></Field>
                  </div>
                  <Field label={t('מה חשוב לכם?', 'What matters to you?')} hint={t('כמות משתמשים, מערכות קיימות, דרישות אבטחה', 'Number of users, existing systems, security requirements')}>
                    <textarea rows={3} className={inputCls} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
                  </Field>
                  <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
                  {formErr && <p role="alert" className="text-sm font-medium text-rose-600">{formErr}</p>}
                  <button type="submit" disabled={sending} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-5 py-3 font-bold text-white hover:bg-brand-strong disabled:opacity-60">
                    {sending && <Spinner />}{t('שליחת בקשה', 'Request a trial')}
                  </button>
                  <p className="text-xs text-ink-soft">{t('הפרטים משמשים ליצירת קשר בלבד.', 'Your details are used only to contact you.')}</p>
                </form>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-ink-soft sm:flex-row sm:px-6">
          <Brand size={24} />
          <p>© {new Date().getFullYear()} SmartQ</p>
          <Link href="/platform/login" className="hover:text-ink">{t('כניסת ספק', 'Vendor sign-in')}</Link>
        </div>
      </footer>
      <A11yWidget />
    </div>
  );
}
