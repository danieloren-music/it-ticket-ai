'use client';

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { ArrowLeft, ArrowRight, Check, Clock3, MessageSquare, RotateCcw, Route, Send, Sparkles } from 'lucide-react';
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
  const pageRef = useRef<HTMLDivElement>(null);
  const { t, lang, isHe } = useLang();
  const Arrow = isHe ? ArrowLeft : ArrowRight;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [ticket, setTicket] = useState<TicketPreview | null>(null);
  const [chatBusy, setChatBusy] = useState(false);
  const [chatError, setChatError] = useState('');
  const [contact, setContact] = useState({ name: '', email: '', company: '', website: '' });
  const [contactBusy, setContactBusy] = useState(false);
  const [contactError, setContactError] = useState('');
  const [contactSent, setContactSent] = useState(false);

  useEffect(() => {
    const page = pageRef.current;
    if (!page || !('IntersectionObserver' in window)) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.motion === '1') return;

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      }
      page.classList.add('home-motion-ready');
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

    page.querySelectorAll('[data-scroll-reveal]').forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  const sendMessage = async (value = draft) => {
    const content = value.trim();
    if (!content || chatBusy) return;

    const openingMessage: ChatMessage = {
      role: 'assistant',
      content: t(
        'היי, אני Tony מ-SmartQ. ספרו לי מה קרה ואעזור לכם לפתוח קריאה.',
        "Hi, I'm Tony from SmartQ. Tell me what happened and I'll help you raise a request."
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
    setChatError('');
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

  const benefits = [
    {
      icon: MessageSquare,
      title: t('פתיחת קריאה בשיחה', 'Request support in a conversation'),
      text: t('העובדים מתארים את הבעיה במילים שלהם, ו-SmartQ עוזרת להשלים את הפרטים.', 'Employees describe the issue in their own words, and SmartQ helps complete the request.'),
    },
    {
      icon: Route,
      title: t('הגעה לצוות הנכון', 'The right team, sooner'),
      text: t('סיווג וניתוב לפי סוג הפנייה והדחיפות, בלי לנחש למי לפנות.', 'Classify and route by request type and urgency, without guessing who to contact.'),
    },
    {
      icon: Clock3,
      title: t('תהליך ברור יותר', 'A clearer service process'),
      text: t('תור טיפול ויעדי שירות שעוזרים לצוותים להתמקד במה שחשוב.', 'A service queue and targets that help teams focus on what matters.'),
    },
  ];

  const workflow = [
    {
      icon: MessageSquare,
      number: '01',
      title: t('מתארים את הבעיה', 'Describe the issue'),
      text: t('העובד מספר מה קרה בשיחה, במילים שלו.', 'The employee explains what happened in their own words.'),
    },
    {
      icon: Sparkles,
      number: '02',
      title: t('הפרטים מתארגנים', 'Turn it into a clear request'),
      text: t('הקריאה מקבלת קטגוריה, דחיפות ומערכת מושפעת.', 'The request is organized by category, urgency, and impacted system.'),
    },
    {
      icon: Route,
      number: '03',
      title: t('הצוות יודע מה לעשות', 'Give the team a clear next step'),
      text: t('הקריאה מנותבת לצוות המתאים ונשארת במעקב.', 'The request is routed to the right team and tracked.'),
    },
  ];

  return (
    <div ref={pageRef} className="bg-white">
      <a href="#main" className="skip-link">{t('דלג לתוכן', 'Skip to content')}</a>

      <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-2 sm:px-6">
          <Brand size={36} />
          <div className="flex items-center gap-5">
            <nav aria-label={t('ניווט ראשי', 'Main navigation')} className="hidden items-center gap-5 text-sm font-medium text-ink-soft sm:flex">
              <a href="#product" className="transition-colors hover:text-brand">{t('המוצר', 'Product')}</a>
              <a href="#contact" className="transition-colors hover:text-brand">{t('יצירת קשר', 'Contact')}</a>
            </nav>
            <LangSwitch />
          </div>
        </div>
      </header>

      <main id="main">
        <section className="home-hero relative isolate overflow-hidden border-b border-line bg-canvas">
          <div className="hero-orb hero-orb-one" aria-hidden="true" />
          <div className="hero-orb hero-orb-two" aria-hidden="true" />
          <div className="hero-orbit" aria-hidden="true"><span /></div>
          <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-12 lg:py-16">
            <div data-scroll-reveal className="scroll-reveal lg:col-span-4">
              <h1 className="text-4xl font-bold leading-tight tracking-tight text-ink sm:text-5xl">
                {t('תמיכת IT מתחילה בשיחה.', 'IT support starts with a conversation.')}
              </h1>
              <p className="mt-4 max-w-md text-lg text-ink-soft">
                {t('SmartQ הופכת תיאור קצר לקריאה מסודרת, עם צוות ודחיפות מתאימים.', 'SmartQ turns a short description into a ticket, routed to the right team with the right priority.')}
              </p>
              <a href="#simulate" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-3 font-semibold text-white hover:bg-brand-strong">
                <Sparkles className="h-4 w-4" />{t('נסו את SmartQ', 'Try SmartQ')}<Arrow className="h-4 w-4" />
              </a>
            </div>

            <section id="simulate" aria-labelledby="simulation-title" data-scroll-reveal data-reveal-delay="1" className="scroll-reveal overflow-hidden rounded-2xl border border-line bg-white shadow-lg shadow-brand/5 transition-shadow duration-500 hover:shadow-xl hover:shadow-brand/10 lg:col-span-8">
              <div className="flex items-center justify-between border-b border-line px-5 py-4">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-brand" />
                  <h2 id="simulation-title" className="font-bold">{t('נסו את SmartQ', 'Try SmartQ')}</h2>
                </div>
                <span className="text-xs text-ink-soft">{t('הדגמה בלבד · לא נפתחת קריאה', 'Demo only · no ticket is created')}</span>
              </div>

              <div className="grid gap-5 p-4 sm:p-5 md:grid-cols-2">
                <div className="flex min-h-80 flex-col">
                  <div className="mb-3 flex-1 space-y-3 overflow-y-auto" aria-live="polite" aria-label={t('שיחה עם Tony', 'Conversation with Tony')}>
                    {messages.length === 0 && (
                      <>
                        <div className="me-auto max-w-[90%] rounded-xl bg-canvas px-3 py-2.5 text-sm leading-relaxed text-ink">
                          <TypingMessage key={lang} text={t(
                            'היי, אני Tony מ-SmartQ. ספרו לי מה קרה ואעזור לכם לפתוח קריאה.',
                            "Hi, I'm Tony from SmartQ. Tell me what happened and I'll help you raise a request."
                          )} />
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
                        {t('Tony מקליד', 'Tony is typing')}
                        <span className="flex gap-1" aria-hidden="true">
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.2s]" />
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.1s]" />
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" />
                        </span>
                      </div>
                    )}
                  </div>

                  {chatError && <p role="alert" className="mb-2 text-sm text-rose-600">{chatError}</p>}
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
                </div>

                <div className="rounded-xl bg-[#101c42] p-4 text-white">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-semibold">{t('טיוטת קריאה', 'Request draft')}</h3>
                    {ticket && <Badge tone={urgencyTone(ticket.urgency)}>{label(URGENCY_LABELS, ticket.urgency, lang)}</Badge>}
                  </div>
                  {!ticket ? (
                    <p className="mt-4 text-sm leading-relaxed text-[#b8c2e9]">{t('פרטי הקריאה יופיעו כאן במהלך השיחה.', 'Your request details will appear here as you chat.')}</p>
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
                      <button type="button" onClick={resetChat} className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#53618f] px-4 py-2.5 text-sm font-semibold hover:bg-[#1a2854]">
                        <RotateCcw className="h-4 w-4" />{t('התחילו פנייה חדשה', 'Start a new request')}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
        </section>

        <section id="product" className="border-y border-line bg-white">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
            <div data-scroll-reveal className="scroll-reveal mb-7 max-w-2xl">
              <h2 className="text-2xl font-bold">{t('ניהול פניות IT במקום אחד', 'IT requests, managed in one place')}</h2>
              <p className="mt-2 text-ink-soft">{t('מפתיחת הבקשה ועד לניתוב ולמעקב אחר הטיפול.', 'From request intake to routing and service tracking.')}</p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {benefits.map(({ icon: Icon, title, text }, index) => (
                <article key={title} data-scroll-reveal data-reveal-delay={index === 0 ? undefined : '1'} className="scroll-reveal rounded-2xl border border-line bg-canvas/60 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-brand/30 hover:shadow-lg hover:shadow-brand/5">
                  <span className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-brand-soft text-brand"><Icon className="h-5 w-5" /></span>
                  <h3 className="font-bold">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section aria-labelledby="workflow-title" className="relative isolate overflow-hidden bg-[#101c42] text-white">
          <div className="pointer-events-none absolute -end-24 -top-32 h-80 w-80 rounded-full bg-violet-500/15 blur-3xl" aria-hidden="true" />
          <div className="pointer-events-none absolute -bottom-40 -start-20 h-80 w-80 rounded-full bg-blue-500/15 blur-3xl" aria-hidden="true" />
          <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-16">
            <div data-scroll-reveal className="scroll-reveal mb-8 flex flex-wrap items-end justify-between gap-5">
              <div className="max-w-2xl">
                <p className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-indigo-200">
                  <Sparkles className="h-4 w-4" />{t('פשוט וברור', 'Simple by design')}
                </p>
                <h2 id="workflow-title" className="text-2xl font-bold sm:text-3xl">
                  {t('מהבעיה — לתור הטיפול.', 'From problem to service queue.')}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-indigo-100/80 sm:text-base">
                  {t('בלי לנחש למי לפנות ובלי לאבד את הפרטים בדרך.', 'No guessing who to contact and no lost details along the way.')}
                </p>
              </div>
              <a href="#simulate" className="inline-flex items-center gap-2 rounded-lg border border-white/25 px-4 py-2.5 text-sm font-semibold transition hover:border-white/50 hover:bg-white/10">
                {t('התנסו בהדגמה', 'Try the demo')}<Arrow className="h-4 w-4" />
              </a>
            </div>
            <ol className="grid gap-3 md:grid-cols-3">
              {workflow.map(({ icon: Icon, number, title, text }, index) => (
                <li key={number} data-scroll-reveal data-reveal-delay={index === 0 ? undefined : '1'} className="scroll-reveal rounded-2xl border border-white/10 bg-white/[0.06] p-5 shadow-lg shadow-black/10 backdrop-blur-sm transition-colors hover:border-indigo-300/40 hover:bg-white/[0.09] sm:p-6">
                  <div className="mb-6 flex items-center justify-between">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-indigo-400/15 text-indigo-200"><Icon className="h-5 w-5" /></span>
                    <span className="font-mono text-sm font-semibold tracking-widest text-indigo-200/80">{number}</span>
                  </div>
                  <h3 className="text-lg font-bold">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-indigo-100/75">{text}</p>
                  <div className="mt-6 h-px bg-gradient-to-l from-indigo-300/50 to-transparent" aria-hidden="true" />
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="contact" className="border-y border-line bg-canvas">
          <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
            <div data-scroll-reveal data-reveal-delay="1" className="scroll-reveal grid gap-6 md:grid-cols-[1fr_2fr] md:items-center">
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
      </footer>
      <A11yWidget />
    </div>
  );
}
