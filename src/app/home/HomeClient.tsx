'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Building2, Check, Gauge, MessageSquare, RotateCcw, Send, Sparkles, TicketCheck, Users } from 'lucide-react';
import { api, errorText } from '@/lib/api';
import { useLang } from '@/lib/i18n';
import { A11yWidget } from '@/components/A11yWidget';
import { Badge, Brand, Field, LangSwitch, Spinner, btnPrimary, inputCls, urgencyTone } from '@/components/ui';
import { CATEGORY_LABELS, TEAM_LABELS, URGENCY_LABELS, label } from '@/lib/constants';

interface TicketPreview {
  title: string;
  description: string;
  category: string;
  urgency: string;
  assigned_team: string;
  system_impacted: string;
  sla_hours: number;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AssistantResponse {
  reply: string;
  ticket: TicketPreview | null;
  source: 'simulation';
}

function TypingMessage({ text }: { text: string }) {
  const [visibleChars, setVisibleChars] = useState(0);

  useEffect(() => {
    let position = 0;
    const timer = window.setInterval(() => {
      position = Math.min(position + 1, text.length);
      setVisibleChars(position);
      if (position === text.length) window.clearInterval(timer);
    }, 22);
    return () => window.clearInterval(timer);
  }, [text]);

  return (
    <span aria-label={text}>
      {text.slice(0, visibleChars)}
      {visibleChars < text.length && <span className="animate-pulse" aria-hidden="true">▍</span>}
    </span>
  );
}

const EXAMPLES = [
  { he: 'ה-VPN לא מתחבר ומציג שגיאת הרשאה', en: 'VPN will not connect and shows an authorization error' },
  { he: 'המדפסת בקומה 2 לא מדפיסה', en: 'The printer on floor 2 will not print' },
  { he: 'המערכת נפלה וכל צוות הכספים חסום', en: 'The system is down and all of Finance is blocked' },
];

export default function HomeClient() {
  const { t, lang, isHe } = useLang();
  const router = useRouter();
  const Arrow = isHe ? ArrowLeft : ArrowRight;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [ticket, setTicket] = useState<TicketPreview | null>(null);
  const [ticketNumber, setTicketNumber] = useState('');
  const [source, setSource] = useState<'simulation' | null>(null);
  const [chatBusy, setChatBusy] = useState(false);
  const [chatError, setChatError] = useState('');
  const [tenantSlug, setTenantSlug] = useState('');
  const [loginError, setLoginError] = useState('');
  const [starting, setStarting] = useState<string | null>(null);
  const [demoError, setDemoError] = useState('');
  const [contact, setContact] = useState({ name: '', email: '', company: '', website: '' });
  const [contactBusy, setContactBusy] = useState(false);
  const [contactError, setContactError] = useState('');
  const [contactSent, setContactSent] = useState(false);

  const sendMessage = async (value = draft) => {
    const content = value.trim();
    if (!content || chatBusy || ticketNumber) return;

    const openingMessage: ChatMessage = {
      role: 'assistant',
      content: t(
        'שלום, אני SmartQ. ספרו לי מה קרה ואעזור לכם לסכם את הפנייה לקריאה.',
        'Hello, I am SmartQ. Tell me what happened and I will help turn it into a clear ticket.'
      ),
    };
    const nextMessages: ChatMessage[] = [...(messages.length ? messages : [openingMessage]), { role: 'user', content }];
    setMessages(nextMessages);
    setDraft('');
    setChatBusy(true);
    setChatError('');

    try {
      const startedAt = Date.now();
      const response = await api<AssistantResponse>('/api/demo/assistant', {
        method: 'POST',
        json: { messages: nextMessages, language: lang },
      });
      const typingTime = 650 - (Date.now() - startedAt);
      if (typingTime > 0) await new Promise((resolve) => window.setTimeout(resolve, typingTime));
      setMessages([...nextMessages, { role: 'assistant', content: response.reply }]);
      setTicket(response.ticket);
      setSource(response.source);
    } catch (error) {
      setMessages(messages);
      setDraft(content);
      setChatError(errorText(error, lang));
    } finally {
      setChatBusy(false);
    }
  };

  const handleChatKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      void sendMessage();
    }
  };

  const resetChat = () => {
    setMessages([]);
    setDraft('');
    setTicket(null);
    setTicketNumber('');
    setSource(null);
    setChatError('');
  };

  const openDemoTicket = () => {
    if (!ticket || ticketNumber) return;
    setTicketNumber(`DEMO-${Math.floor(100000 + Math.random() * 900000)}`);
  };

  const openTenantLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const slug = tenantSlug.trim().toLowerCase();
    if (slug.length < 2 || !/^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/.test(slug)) {
      setLoginError(t('הזינו מזהה ארגון תקין.', 'Enter a valid organization ID.'));
      return;
    }
    router.push(`/${slug}/login`);
  };

  const startRoleDemo = async (role: 'user' | 'admin' | 'manager') => {
    setStarting(role);
    setDemoError('');
    try {
      const result = await api<{ redirect: string }>('/api/demo/start', { method: 'POST', json: { role } });
      router.push(result.redirect);
    } catch (error) {
      setDemoError(errorText(error, lang));
      setStarting(null);
    }
  };

  const sendContact = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setContactBusy(true);
    setContactError('');
    try {
      await api('/api/contact', { method: 'POST', json: contact });
      setContactSent(true);
    } catch (error) {
      setContactError(errorText(error, lang));
    } finally {
      setContactBusy(false);
    }
  };

  const roles = [
    { key: 'user' as const, label: t('עובד', 'Employee'), icon: Users },
    { key: 'admin' as const, label: t('טכנאי', 'Technician'), icon: TicketCheck },
    { key: 'manager' as const, label: t('מנהל', 'Manager'), icon: Gauge },
  ];

  return (
    <div className="bg-white">
      <a href="#main" className="skip-link">{t('דלג לתוכן', 'Skip to content')}</a>

      <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-2 sm:px-6">
          <Brand size={32} />
          <div className="flex items-center gap-3">
            <LangSwitch />
            <form onSubmit={openTenantLogin} className="flex items-center gap-2">
              <label htmlFor="tenant-login" className="sr-only">{t('מזהה ארגון', 'Organization ID')}</label>
              <input
                id="tenant-login"
                dir="ltr"
                className={`${inputCls} w-36 py-2 text-sm`}
                value={tenantSlug}
                onChange={(event) => { setTenantSlug(event.target.value); setLoginError(''); }}
                placeholder={t('מזהה ארגון', 'Organization ID')}
                autoComplete="organization"
              />
              <button type="submit" className="rounded-lg border border-line px-3 py-2 text-sm font-semibold hover:bg-canvas">
                {t('כניסה', 'Sign in')}
              </button>
            </form>
          </div>
        </div>
        {loginError && <p role="alert" className="mx-auto max-w-7xl px-4 pb-2 text-end text-xs text-rose-600 sm:px-6">{loginError}</p>}
      </header>

      <main id="main">
        <section className="border-b border-line bg-canvas">
          <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-12 lg:py-16">
            <div className="lg:col-span-4">
              <h1 className="text-4xl font-bold leading-tight tracking-tight text-ink sm:text-5xl">
                {t('תמיכת IT מתחילה בשיחה.', 'IT support starts with a conversation.')}
              </h1>
              <p className="mt-4 max-w-md text-lg text-ink-soft">
                {t('SmartQ הופכת תיאור קצר לקריאה מסודרת, עם צוות ודחיפות מתאימים.', 'SmartQ turns a short description into a ticket, routed to the right team with the right priority.')}
              </p>
              <a href="#simulate" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-3 font-semibold text-white hover:bg-brand-strong">
                <Sparkles className="h-4 w-4" />{t('נסו את ההדמיה', 'Try the simulation')}<Arrow className="h-4 w-4" />
              </a>
            </div>

            <section id="simulate" aria-labelledby="simulation-title" className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm lg:col-span-8">
              <div className="flex items-center justify-between border-b border-line px-5 py-4">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-brand" />
                  <h2 id="simulation-title" className="font-bold">{t('שיחת הדגמה', 'Try the support chat')}</h2>
                </div>
                <span className="text-xs text-ink-soft">{t('הדמיה בלבד · לא נוצרת קריאה אמיתית', 'Simulation only · no real ticket is created')}</span>
              </div>

              <div className="grid gap-5 p-4 sm:p-5 md:grid-cols-2">
                <div className="flex min-h-80 flex-col">
                  <div className="mb-3 flex-1 space-y-3 overflow-y-auto" aria-live="polite" aria-label={t('שיחה עם SmartQ', 'Conversation with SmartQ')}>
                    {messages.length === 0 && (
                      <>
                        <div className="me-auto max-w-[90%] rounded-xl bg-canvas px-3 py-2.5 text-sm leading-relaxed text-ink">
                          <TypingMessage key={lang} text={t(
                            'שלום, אני SmartQ. ספרו לי מה קרה ואעזור לכם לסכם את הפנייה לקריאה.',
                            'Hello, I am SmartQ. Tell me what happened and I will help turn it into a clear ticket.'
                          )} />
                        </div>
                        <div className="rounded-xl border border-line p-4 text-sm text-ink-soft">
                          <p>{t('תארו בקצרה את הבעיה כדי להתחיל.', 'Briefly describe the issue to get started.')}</p>
                          <p className="mt-2 text-xs">{t('הדמיה עם תשובות מוכנות מראש. לא נשלח מידע לספק AI ולא נוצרת קריאה אמיתית.', 'A scripted simulation. No data is sent to an AI provider and no real ticket is created.')}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {EXAMPLES.map((example) => (
                            <button
                              key={example.en}
                              type="button"
                              onClick={() => setDraft(isHe ? example.he : example.en)}
                              className="rounded-full border border-line bg-white px-3 py-1.5 text-xs hover:border-brand hover:text-brand"
                            >
                              {t(example.he, example.en)}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                    {messages.map((message, index) => (
                      <div
                        key={`${message.role}-${index}`}
                        className={`max-w-[90%] rounded-xl px-3 py-2.5 text-sm leading-relaxed ${
                          message.role === 'user' ? 'ms-auto bg-brand text-white' : 'me-auto bg-canvas text-ink'
                        }`}
                      >
                        {message.role === 'assistant' ? <TypingMessage key={`${index}-${lang}`} text={message.content} /> : message.content}
                      </div>
                    ))}
                    {chatBusy && (
                      <div className="me-auto flex items-center gap-2 rounded-xl bg-canvas px-3 py-2.5 text-sm text-ink-soft" role="status">
                        {t('SmartQ מקלידה', 'SmartQ is typing')}
                        <span className="flex gap-1" aria-hidden="true">
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.2s]" />
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.1s]" />
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" />
                        </span>
                      </div>
                    )}
                  </div>

                  {chatError && <p role="alert" className="mb-2 text-sm text-rose-600">{chatError}</p>}
                  {ticketNumber ? (
                    <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800" role="status">
                      <p className="font-bold">{t('קריאת הדגמה נפתחה', 'Demo ticket opened')}</p>
                      <p className="mt-1" dir="ltr">{ticketNumber}</p>
                      <p className="mt-1 text-xs">{t('זהו מספר מדומה; לא נוצרה קריאה במערכת ולא נשלח מידע לספק AI.', 'This is a mock ID; no ticket was created in the system and no data was sent to an AI provider.')}</p>
                    </div>
                  ) : (
                    <>
                      <label htmlFor="chat-message" className="sr-only">{t('תיאור התקלה', 'Describe the issue')}</label>
                      <textarea
                        id="chat-message"
                        rows={3}
                        maxLength={1200}
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        onKeyDown={handleChatKeyDown}
                        placeholder={t('למשל: אין חיבור לרשת בחדר הישיבות…', 'For example: the meeting room has no network…')}
                        className={`${inputCls} resize-none`}
                      />
                      <button
                        type="button"
                        onClick={() => void sendMessage()}
                        disabled={chatBusy || !draft.trim()}
                        className={`${btnPrimary} mt-2 w-full`}
                      >
                        {chatBusy ? <Spinner /> : <Send className="h-4 w-4" />}
                        {t('שליחה', 'Send')} <span className="text-xs font-normal opacity-75">Ctrl+Enter</span>
                      </button>
                    </>
                  )}
                </div>

                <div className="rounded-xl bg-[#101c42] p-4 text-white">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-semibold">{t('סיכום הקריאה', 'Ticket summary')}</h3>
                    {ticket && <Badge tone={urgencyTone(ticket.urgency)}>{label(URGENCY_LABELS, ticket.urgency, lang)}</Badge>}
                  </div>
                  {!ticket ? (
                    <p className="mt-4 text-sm leading-relaxed text-[#b8c2e9]">{t('הסיכום יופיע כאן אחרי שהעוזר יבין את הפנייה.', 'The summary will appear here once the assistant understands the request.')}</p>
                  ) : (
                    <div className="mt-4 space-y-3" aria-live="polite">
                      <h4 className="font-semibold leading-snug">{ticket.title}</h4>
                      <p className="text-sm leading-relaxed text-[#cbd3f4]">{ticket.description}</p>
                      <dl className="space-y-2 border-t border-[#34416d] pt-3 text-sm">
                        <div className="flex justify-between gap-3"><dt className="text-[#9aa7d6]">{t('קטגוריה', 'Category')}</dt><dd className="text-end">{label(CATEGORY_LABELS, ticket.category, lang)}</dd></div>
                        <div className="flex justify-between gap-3"><dt className="text-[#9aa7d6]">{t('צוות', 'Team')}</dt><dd className="text-end">{label(TEAM_LABELS, ticket.assigned_team, lang)}</dd></div>
                        <div className="flex justify-between gap-3"><dt className="text-[#9aa7d6]">{t('מערכת', 'System')}</dt><dd className="text-end">{ticket.system_impacted}</dd></div>
                        <div className="flex justify-between gap-3"><dt className="text-[#9aa7d6]">{t('יעד טיפול', 'Resolution target')}</dt><dd className="text-end">{ticket.sla_hours} {t('שעות', 'hours')}</dd></div>
                      </dl>
                      <p className="text-xs text-[#9aa7d6]">
                        {source === 'simulation' && t('סיכום להדגמה בלבד.', 'Simulation summary only.')}
                      </p>
                      {!ticketNumber ? (
                        <button type="button" onClick={openDemoTicket} className="w-full rounded-lg bg-white px-4 py-2.5 text-sm font-bold text-ink hover:bg-[#e8ecff]">
                          {t('פתחו קריאת הדגמה', 'Open a demo ticket')}
                        </button>
                      ) : (
                        <button type="button" onClick={resetChat} className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#53618f] px-4 py-2.5 text-sm font-semibold hover:bg-[#1a2854]">
                          <RotateCcw className="h-4 w-4" />{t('התחילו מחדש', 'Start again')}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
        </section>

        <section id="demo" className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold">{t('נסו את סביבת העבודה', 'Explore the workspace')}</h2>
              <p className="mt-1 text-sm text-ink-soft">{t('נתוני הדגמה בלבד, מתאפסים מעת לעת.', 'Sample data only; periodically reset.')}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {roles.map(({ key, label: roleLabel, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => void startRoleDemo(key)}
                  disabled={starting !== null}
                  className="inline-flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm font-semibold hover:border-brand hover:text-brand disabled:opacity-50"
                >
                  {starting === key ? <Spinner /> : <Icon className="h-4 w-4" />}
                  {roleLabel}
                </button>
              ))}
            </div>
          </div>
          {demoError && <p role="alert" className="mt-3 text-sm text-rose-600">{demoError}</p>}
        </section>

        <section id="contact" className="border-y border-line bg-canvas">
          <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
            <div className="grid gap-6 md:grid-cols-[1fr_2fr] md:items-center">
              <div>
                <h2 className="text-xl font-bold">{t('רוצים לבדוק התאמה לארגון?', 'See if SmartQ fits your organization?')}</h2>
                <p className="mt-1 text-sm text-ink-soft">{t('השאירו פרטים ונחזור אליכם.', 'Leave your details and we will be in touch.')}</p>
              </div>
              {contactSent ? (
                <p role="status" className="flex items-center gap-2 font-semibold text-emerald-700"><Check className="h-5 w-5" />{t('הפנייה התקבלה.', 'Request received.')}</p>
              ) : (
                <form onSubmit={sendContact} className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field label={t('שם', 'Name')}><input required className={inputCls} value={contact.name} onChange={(event) => setContact({ ...contact, name: event.target.value })} autoComplete="name" /></Field>
                    <Field label={t('אימייל', 'Email')}><input required type="email" dir="ltr" className={inputCls} value={contact.email} onChange={(event) => setContact({ ...contact, email: event.target.value })} autoComplete="email" /></Field>
                    <Field label={t('ארגון', 'Organization')}><input required className={inputCls} value={contact.company} onChange={(event) => setContact({ ...contact, company: event.target.value })} autoComplete="organization" /></Field>
                  </div>
                  <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" value={contact.website} onChange={(event) => setContact({ ...contact, website: event.target.value })} />
                  {contactError && <p role="alert" className="text-sm text-rose-600">{contactError}</p>}
                  <button type="submit" disabled={contactBusy} className="inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand disabled:opacity-60">
                    {contactBusy && <Spinner />}{t('שליחת פרטים', 'Contact me')}
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-5 text-sm text-ink-soft sm:px-6">
        <Brand size={24} />
        <span>© {new Date().getFullYear()} SmartQ</span>
        <Link href="/platform/login" className="inline-flex items-center gap-1.5 hover:text-ink"><Building2 className="h-4 w-4" />{t('כניסת צוות SmartQ', 'SmartQ staff sign-in')}</Link>
      </footer>
      <A11yWidget />
    </div>
  );
}
