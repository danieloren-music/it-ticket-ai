'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabaseClient';
import { 
  Send, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Layers, 
  User, 
  Check, 
  SlidersHorizontal,
  Zap,
  ArrowDown,
  LogIn,
  ShieldCheck,
  Building2,
  Sun,
  Moon,
  Sparkles,
  MapPin,
  Phone,
  Copy
} from 'lucide-react';

type ThemeMode = 'light' | 'dark' | 'ai';

function TypewriterMessage({ text, onComplete }: { text: string; onComplete?: () => void }) {
  const [displayedText, setDisplayedText] = useState('');
  const indexRef = useRef(0);

  useEffect(() => {
    setDisplayedText('');
    indexRef.current = 0;

    const interval = setInterval(() => {
      if (indexRef.current < text.length) {
        setDisplayedText((prev) => prev + text.charAt(indexRef.current));
        indexRef.current++;
      } else {
        clearInterval(interval);
        if (onComplete) onComplete();
      }
    }, 16);

    return () => clearInterval(interval);
  }, [text]);

  return <span>{displayedText}</span>;
}

interface TenantInfo {
  id: string;
  name: string;
  domain: string;
  admin_email: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

interface Ticket {
  id: string;
  ticket_number?: string;
  created_at: string;
  title: string;
  description: string;
  category: string;
  urgency: string;
  status: string;
  system_impacted?: string;
  assigned_team: string;
  user_name?: string;
  user_email?: string;
  reporter_name?: string;
  reporter_email?: string;
  user_city?: string;
  user_phone?: string;
  tenant_id: string;
}

const QUICK_PROMPTS = [
  'נשפך לי קפה על מקלדת הלפטופ',
  'לא מצליח להתחבר ל-VPN מהבית',
  'צריך הרשאה לתיקייה משותפת',
  'המסך החיצוני מהבהב ומציג קווים'
];

function NewRequestContent() {
  const [theme, setTheme] = useState<ThemeMode>('light');
  const params = useParams();
  const rawTenant = (params?.tenant as string) || 'demo';
  const tenantSlug = rawTenant.toLowerCase();

  const searchParams = useSearchParams();
  const ssoName = searchParams.get('name') || '';
  const ssoEmail = searchParams.get('email') || '';
  const ssoDept = searchParams.get('dept') || '';

  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string; dept: string; phone?: string } | null>(null);

  const [messages, setMessages] = useState<Message[]>([
    { 
      id: 'init-msg',
      role: 'assistant', 
      content: 'היי, אני Zack מבית SmartQ. ספר לי מה התקלה או הבקשה שלך ואדאג למלא את כל פרטי הקריאה עבורך.',
      isStreaming: true
    }
  ]);
  const [userInput, setUserInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isReadyForReview, setIsReadyForReview] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Hardware',
    urgency: 'Medium',
    system_impacted: '',
    assigned_team: 'Helpdesk Tier 1',
    reporter_name: '',
    reporter_email: '',
    user_city: '',
    user_phone: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(true);
  const [createdTicketNumber, setCreatedTicketNumber] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const chatMessagesContainerRef = useRef<HTMLDivElement>(null);
  const formSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchTenantAndSession = async () => {
      const { data } = await supabase
        .from('tenants')
        .select('*')
        .ilike('id', tenantSlug)
        .single();

      if (data) {
        setTenant(data);
      } else {
        setTenant({
          id: tenantSlug,
          name: rawTenant.toUpperCase(),
          domain: '',
          admin_email: '',
        });
      }

      // קריאת Session קיים מה-Cookie
      const matchCookie = document.cookie
        .split('; ')
        .find((row) => row.startsWith('smartq_session='));

      if (matchCookie) {
        try {
          const rawVal = matchCookie.split('=')[1];
          const decoded = JSON.parse(atob(rawVal));
          if (decoded.email) {
            const resolvedName = decoded.name || decoded.email.split('@')[0];
            const resolvedCity = decoded.city || 'מטה ראשי';
            const resolvedPhone = decoded.phone || '';

            setCurrentUser({ name: resolvedName, email: decoded.email, dept: resolvedCity, phone: resolvedPhone });
            setFormData((prev) => ({
              ...prev,
              reporter_name: prev.reporter_name || resolvedName,
              reporter_email: prev.reporter_email || decoded.email,
              user_city: prev.user_city || resolvedCity,
              user_phone: prev.user_phone || resolvedPhone,
            }));
          }
        } catch {}
      }
    };

    fetchTenantAndSession();
  }, [tenantSlug, rawTenant]);

  useEffect(() => {
    if (ssoName || ssoEmail) {
      setCurrentUser({ name: ssoName, email: ssoEmail, dept: ssoDept });
      setFormData((prev) => ({
        ...prev,
        reporter_name: ssoName,
        reporter_email: ssoEmail,
      }));
    }
  }, [ssoName, ssoEmail, ssoDept]);

  useEffect(() => {
    if (chatMessagesContainerRef.current) {
      chatMessagesContainerRef.current.scrollTop = chatMessagesContainerRef.current.scrollHeight;
    }
  }, [messages, isAiLoading]);

  const fetchTickets = async () => {
    setIsLoadingTickets(true);
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .ilike('tenant_id', tenantSlug)
      .order('created_at', { ascending: false });

    if (!error && data) setTickets(data);
    setIsLoadingTickets(false);
  };

  useEffect(() => {
    fetchTickets();
  }, [tenantSlug]);

  // Handle Send Message -> Allows Zack to extract reporter_name & reporter_email from conversation
  const handleSendMessage = async (textToSend?: string) => {
    const messageContent = textToSend || userInput;
    if (!messageContent.trim() || isAiLoading) return;

    const userMsgId = 'user-' + Date.now();
    const newMessages: Message[] = [...messages, { id: userMsgId, role: 'user', content: messageContent }];
    setMessages(newMessages);
    setUserInput('');
    setIsAiLoading(true);
    setFeedbackMsg(null);

    try {
      const res = await fetch('/api/ai-parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: newMessages.map(({ role, content }) => ({ role, content })),
          currentFormData: formData,
          description: messageContent,
          tenantSlug
        }),
      });

      if (!res.ok) throw new Error('שגיאה בתקשורת מול Zack');
      const data = await res.json();

      setFormData((prev) => {
        // Dynamic detection: if AI found a reporter_name/email in conversation, use it. Otherwise fallback to current user/previous value
        const updatedName = data.reporter_name || prev.reporter_name || currentUser?.name || '';
        const updatedEmail = data.reporter_email || prev.reporter_email || currentUser?.email || '';

        return {
          ...prev,
          title: data.title || prev.title || messageContent.slice(0, 60),
          description: data.description || prev.description || messageContent,
          category: data.category || prev.category,
          urgency: data.urgency || prev.urgency,
          system_impacted: data.system_impacted || prev.system_impacted,
          assigned_team: data.assigned_team || data.assignedTeam || prev.assigned_team,
          reporter_name: updatedName,
          reporter_email: updatedEmail,
          user_city: data.user_city || prev.user_city || currentUser?.dept || 'מטה ראשי',
          user_phone: prev.user_phone || currentUser?.phone || ''
        };
      });

      if (data.follow_up_question) {
        setMessages((prev) => [
          ...prev, 
          { 
            id: 'ai-' + Date.now(), 
            role: 'assistant', 
            content: data.follow_up_question,
            isStreaming: true 
          }
        ]);
      } else {
        setIsReadyForReview(true);
        setMessages((prev) => [
          ...prev, 
          { 
            id: 'ai-' + Date.now(), 
            role: 'assistant', 
            content: 'מילאתי את כל פרטי הקריאה בטופס. גולל אותך לבדיקה ואישור.',
            isStreaming: true 
          }
        ]);

        setTimeout(() => {
          formSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 1000);
      }
    } catch (err: any) {
      setFeedbackMsg({ text: err.message || 'שגיאה בפענוח הנתונים', type: 'error' });
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFeedbackMsg(null);

    const generated6Digits = Math.floor(100000 + Math.random() * 900000).toString();
    const finalReporterName = formData.reporter_name || currentUser?.name || 'עובד ארגון';
    const finalReporterEmail = formData.reporter_email || currentUser?.email || `user@${tenantSlug}.co.il`;

    try {
      const { data, error } = await supabase.from('tickets').insert([
        {
          tenant_id: tenantSlug,
          ticket_number: generated6Digits,
          title: formData.title,
          description: formData.description,
          category: formData.category,
          urgency: formData.urgency,
          assigned_team: formData.assigned_team,
          reporter_name: finalReporterName,
          reporter_email: finalReporterEmail,
          user_name: finalReporterName,
          user_email: finalReporterEmail,
          user_city: formData.user_city || 'מטה ראשי',
          user_phone: formData.user_phone || '',
          status: 'Open',
        },
      ]).select().single();

      if (error) throw error;

      const finalTicketNum = data?.ticket_number || generated6Digits;
      setCreatedTicketNumber(finalTicketNum);

      setFormData({
        title: '',
        description: '',
        category: 'Hardware',
        urgency: 'Medium',
        system_impacted: '',
        assigned_team: 'Helpdesk Tier 1',
        reporter_name: currentUser?.name || '',
        reporter_email: currentUser?.email || '',
        user_city: currentUser?.dept || '',
        user_phone: currentUser?.phone || '',
      });
      setIsReadyForReview(false);
      setMessages((prev) => [
        ...prev,
        { id: 'done-' + Date.now(), role: 'assistant', content: `קריאה #${finalTicketNum} שוגרה בהצלחה. יש משהו נוסף שאוכל לעזור בו?`, isStreaming: true }
      ]);
      fetchTickets();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setFeedbackMsg({ text: 'שגיאה בשמירת הקריאה: ' + err.message, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyTicketNumber = () => {
    if (createdTicketNumber) {
      navigator.clipboard.writeText(createdTicketNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'Critical': return 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800';
      case 'High': return 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-800';
      case 'Medium': return 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-800';
      default: return 'bg-slate-200 text-slate-900 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    }
  };

  const themeBg = {
    light: 'bg-[#F8FAFC] text-slate-900',
    dark: 'bg-[#0B0F19] text-slate-100',
    ai: 'bg-radial-at-t from-[#160B2E] via-[#090D1A] to-[#04060B] text-slate-100'
  };

  const cardBg = {
    light: 'bg-white border-slate-200 shadow-sm text-slate-900',
    dark: 'bg-[#111827] border-slate-800 shadow-xl text-slate-100',
    ai: 'bg-[#120D26]/70 border-indigo-500/40 shadow-2xl shadow-indigo-500/10 backdrop-blur-xl text-slate-100'
  };

  const inputBg = {
    light: 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-indigo-600',
    dark: 'bg-[#1F2937] border-slate-700 text-slate-100 placeholder-slate-500 focus:border-indigo-400',
    ai: 'bg-[#1C1438]/80 border-indigo-500/30 text-indigo-100 placeholder-indigo-300/40 focus:border-cyan-400'
  };

  return (
    <main dir="rtl" className={`min-h-screen font-sans antialiased transition-colors duration-300 ${themeBg[theme]}`}>
      {/* Top Navbar */}
      <header className={`sticky top-0 z-30 border-b backdrop-blur-md transition-colors duration-300 ${
        theme === 'light' ? 'bg-white/95 border-slate-200 shadow-2xs' : 
        theme === 'dark' ? 'bg-[#0E1424]/90 border-slate-800' : 
        'bg-[#0C081D]/80 border-indigo-500/30 shadow-lg shadow-indigo-500/10'
      }`}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9 rounded-xl overflow-hidden shadow-md flex items-center justify-center bg-white border border-slate-100">
              <Image src="/smartq-logo.png" alt="SmartQ" width={36} height={36} className="object-contain" priority />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-lg font-black tracking-tight ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>SmartQ</span>
                <span className="px-2 py-0.5 text-[10px] font-extrabold text-white bg-gradient-to-r from-indigo-500 to-purple-600 rounded-md shadow-2xs uppercase">
                  AI DESK
                </span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-400 font-bold">
                <Building2 className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                <span>{tenant?.name || rawTenant}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Theme Capsule */}
            <div className={`flex items-center p-1 rounded-xl border ${
              theme === 'light' ? 'bg-slate-100 border-slate-200' : 'bg-slate-800 border-slate-700'
            }`}>
              <button
                onClick={() => setTheme('light')}
                className={`p-1.5 rounded-lg transition ${theme === 'light' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-400 hover:text-white'}`}
                title="Light Mode"
              >
                <Sun className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`p-1.5 rounded-lg transition ${theme === 'dark' ? 'bg-slate-700 text-indigo-400 shadow-xs' : 'text-slate-400 hover:text-white'}`}
                title="Dark Mode"
              >
                <Moon className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setTheme('ai')}
                className={`p-1.5 rounded-lg transition ${theme === 'ai' ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'}`}
                title="AI Neural Mode"
              >
                <Sparkles className="w-3.5 h-3.5" />
              </button>
            </div>

            {currentUser ? (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-emerald-800 text-xs font-black shadow-xs">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>{currentUser.name}</span>
              </div>
            ) : (
              <a
                href={`/${rawTenant}/login`}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border transition ${
                  theme === 'light' ? 'text-slate-800 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border-slate-200' : 'text-slate-200 bg-slate-800 hover:bg-slate-700 border-slate-700'
                }`}
              >
                <LogIn className="w-3.5 h-3.5 text-indigo-600" />
                <span>התחבר</span>
              </a>
            )}

            <button 
              onClick={fetchTickets}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                theme === 'light' ? 'text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200' : 'text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingTickets ? 'animate-spin text-indigo-600' : ''}`} />
              רענון
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 pb-12 space-y-6">
        {/* Quick Prompts */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {QUICK_PROMPTS.map((prompt, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSendMessage(prompt)}
              className={`text-[11px] font-bold px-3.5 py-1.5 rounded-xl border transition shadow-2xs flex items-center gap-1.5 ${
                theme === 'light' ? 'bg-white hover:bg-indigo-50 border-slate-200 hover:border-indigo-300 text-slate-800 hover:text-indigo-700' :
                theme === 'dark' ? 'bg-[#111827] hover:bg-slate-800 border-slate-800 text-slate-300 hover:text-white' :
                'bg-[#181136] hover:bg-indigo-950 border-indigo-500/30 text-indigo-200 hover:text-white'
              }`}
            >
              <Zap className="w-3 h-3 text-indigo-600" />
              {prompt}
            </button>
          ))}
        </div>

        {/* Zack Chat Interface */}
        <div className={`rounded-2xl border overflow-hidden flex flex-col h-[480px] transition-all duration-300 ${
          theme === 'light' ? 'bg-white border-slate-200 shadow-xl' :
          theme === 'dark' ? 'bg-[#111827] border-slate-800 shadow-2xl' :
          'bg-[#120D28]/90 border-indigo-500/40 shadow-2xl shadow-indigo-500/20 backdrop-blur-xl'
        }`}>
          <div className={`px-5 py-3.5 border-b flex items-center justify-between ${
            theme === 'light' ? 'bg-slate-50/80 border-slate-200' :
            theme === 'dark' ? 'bg-slate-900 border-slate-800' :
            'bg-indigo-950/40 border-indigo-500/30'
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center text-white shadow-md font-black text-xs">
                Z
              </div>
              <div className="flex items-center gap-2">
                <h3 className={`font-bold text-sm ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>Zack AI</h3>
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
              </div>
            </div>

            {isReadyForReview && (
              <button
                type="button"
                onClick={() => formSectionRef.current?.scrollIntoView({ behavior: 'smooth' })}
                className="flex items-center gap-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-1 rounded-lg transition"
              >
                <span>הפרטים מוכנים – עבור לטופס</span>
                <ArrowDown className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Messages Flow */}
          <div ref={chatMessagesContainerRef} className={`flex-1 p-5 overflow-y-auto space-y-4 ${
            theme === 'light' ? 'bg-slate-50/40' : 'bg-[#090E1A]/40'
          }`}>
            {messages.map((m) => (
              <div key={m.id} className={`flex gap-3 ${m.role === 'user' ? 'justify-start flex-row-reverse' : 'justify-start'}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-black shadow-2xs ${
                  m.role === 'user' ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white' : 'bg-gradient-to-tr from-indigo-600 to-purple-500 text-white'
                }`}>
                  {m.role === 'user' ? <User className="w-3.5 h-3.5" /> : 'Z'}
                </div>
                <div className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed max-w-[85%] shadow-2xs font-medium ${
                  m.role === 'user' 
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-br-none' 
                    : theme === 'light'
                      ? 'bg-white text-slate-900 rounded-bl-none border border-slate-200'
                      : 'bg-slate-800/90 text-slate-100 rounded-bl-none border border-slate-700'
                }`}>
                  {m.role === 'assistant' && m.isStreaming ? (
                    <TypewriterMessage 
                      text={m.content} 
                      onComplete={() => {
                        setMessages((prev) => 
                          prev.map((msg) => msg.id === m.id ? { ...msg, isStreaming: false } : msg)
                        );
                      }} 
                    />
                  ) : (
                    m.content
                  )}
                </div>
              </div>
            ))}
            
            {isAiLoading && (
              <div className={`flex items-center gap-3 text-xs p-2.5 rounded-2xl w-fit border ${
                theme === 'light' ? 'text-indigo-800 bg-indigo-50 border-indigo-100 font-bold' : 'text-indigo-300 bg-indigo-950/60 border-indigo-800'
              }`}>
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" />
                </div>
                <span>Zack מסנכרן את פרטי הקריאה...</span>
              </div>
            )}
          </div>

          {/* Chat Input */}
          <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className={`p-3 border-t flex gap-2 ${
            theme === 'light' ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
          }`}>
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="כתוב כאן ל-Zack מה התקלה..."
              className={`flex-1 px-4 py-2.5 text-xs sm:text-sm rounded-xl border focus:outline-none transition ${inputBg[theme]}`}
            />
            <button
              type="submit"
              disabled={isAiLoading || !userInput.trim()}
              className="px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:from-slate-300 disabled:to-slate-300 text-white rounded-xl font-bold text-xs sm:text-sm transition shadow-sm flex items-center justify-center gap-1.5"
            >
              <span>שלח</span>
              <Send className="w-3.5 h-3.5 rtl:rotate-180" />
            </button>
          </form>
        </div>
      </div>

      {/* Form Review Section */}
      <div ref={formSectionRef} className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {feedbackMsg && (
          <div className={`p-4 rounded-xl border flex items-center gap-3 text-xs font-semibold shadow-2xs ${
            feedbackMsg.type === 'success' 
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}>
            {feedbackMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
            {feedbackMsg.text}
          </div>
        )}

        <div className={`p-6 sm:p-8 rounded-2xl border space-y-6 transition-all duration-300 ${cardBg[theme]}`}>
          <div className={`flex items-center justify-between border-b pb-3 ${theme === 'light' ? 'border-slate-200' : 'border-slate-800'}`}>
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
              <h2 className={`text-sm font-bold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                אישור ושיגור קריאה ({tenant?.name || rawTenant})
              </h2>
            </div>
            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full">
              SmartQ Core
            </span>
          </div>

          <form onSubmit={handleSubmitTicket} className="space-y-4">
            <div>
              <label className={`block text-xs font-bold mb-1.5 ${theme === 'light' ? 'text-slate-800' : 'text-slate-300'}`}>נושא הפנייה *</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="נושא הפנייה..."
                className={`w-full px-3.5 py-2 text-xs rounded-xl border focus:outline-none transition ${inputBg[theme]}`}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={`block text-xs font-bold mb-1.5 ${theme === 'light' ? 'text-slate-800' : 'text-slate-300'}`}>קטגוריה</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className={`w-full px-3 py-2 text-xs rounded-xl border font-semibold focus:outline-none transition ${inputBg[theme]}`}
                >
                  <option value="Hardware">חומרה (Hardware)</option>
                  <option value="Software & SaaS">תוכנה וענן (Software)</option>
                  <option value="Network & Connectivity">תקשורת ו-VPN</option>
                  <option value="Access & IAM">הרשאות וזהויות (IAM)</option>
                  <option value="Cloud & Infrastructure">תשתיות ענן (Cloud)</option>
                  <option value="Cyber Security">אבטחת מידע</option>
                  <option value="Workstation & Peripherals">ציוד קצה ועמדות</option>
                  <option value="Database & BI">בסיסי נתונים ו-BI</option>
                  <option value="General IT Request">בקשת IT כללית</option>
                </select>
              </div>

              <div>
                <label className={`block text-xs font-bold mb-1.5 ${theme === 'light' ? 'text-slate-800' : 'text-slate-300'}`}>דחיפות SLA</label>
                <select
                  value={formData.urgency}
                  onChange={(e) => setFormData({ ...formData, urgency: e.target.value })}
                  className={`w-full px-3 py-2 text-xs rounded-xl border font-semibold focus:outline-none transition ${inputBg[theme]}`}
                >
                  <option value="Low">Low (נמוכה)</option>
                  <option value="Medium">Medium (בינונית)</option>
                  <option value="High">High (גבוהה)</option>
                  <option value="Critical">Critical (קריטית)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={`block text-xs font-bold mb-1.5 ${theme === 'light' ? 'text-slate-800' : 'text-slate-300'}`}>רכיב / מערכת</label>
                <input
                  type="text"
                  value={formData.system_impacted}
                  onChange={(e) => setFormData({ ...formData, system_impacted: e.target.value })}
                  placeholder="לדוגמה: VPN, מחשב נייד, SAP..."
                  className={`w-full px-3.5 py-2 text-xs rounded-xl border focus:outline-none transition ${inputBg[theme]}`}
                />
              </div>

              <div>
                <label className={`block text-xs font-bold mb-1.5 ${theme === 'light' ? 'text-slate-800' : 'text-slate-300'}`}>צוות מטפל</label>
                <select
                  value={formData.assigned_team}
                  onChange={(e) => setFormData({ ...formData, assigned_team: e.target.value })}
                  className={`w-full px-3 py-2 text-xs font-bold rounded-xl border focus:outline-none transition ${inputBg[theme]}`}
                >
                  <option value="Helpdesk Tier 1">Helpdesk Tier 1</option>
                  <option value="System & Cloud Team">System & Cloud Team</option>
                  <option value="Network & Security">Network & Security</option>
                  <option value="IT Applications & BI">IT Applications & BI</option>
                  <option value="Identity & Access">Identity & Access</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={`block text-xs font-bold mb-1.5 flex items-center gap-1 ${theme === 'light' ? 'text-slate-800' : 'text-slate-300'}`}>
                  <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                  <span>עיר / מטה / סניף (City / HQ)</span>
                </label>
                <input
                  type="text"
                  value={formData.user_city}
                  onChange={(e) => setFormData({ ...formData, user_city: e.target.value })}
                  placeholder="למשל: מטה חיפה / נהריה / תל אביב"
                  className={`w-full px-3.5 py-2 text-xs rounded-xl border focus:outline-none transition ${inputBg[theme]}`}
                />
              </div>

              <div>
                <label className={`block text-xs font-bold mb-1.5 flex items-center gap-1 ${theme === 'light' ? 'text-slate-800' : 'text-slate-300'}`}>
                  <Phone className="w-3.5 h-3.5 text-indigo-600" />
                  <span>טלפון / שלוחה</span>
                </label>
                <input
                  type="tel"
                  value={formData.user_phone}
                  onChange={(e) => setFormData({ ...formData, user_phone: e.target.value })}
                  placeholder="050-0000000"
                  className={`w-full px-3.5 py-2 text-xs rounded-xl border focus:outline-none transition ${inputBg[theme]}`}
                />
              </div>
            </div>

            <div>
              <label className={`block text-xs font-bold mb-1.5 ${theme === 'light' ? 'text-slate-800' : 'text-slate-300'}`}>פירוט הפנייה *</label>
              <textarea
                required
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="פירוט הבקשה..."
                className={`w-full px-3.5 py-2 text-xs rounded-xl border focus:outline-none transition leading-relaxed ${inputBg[theme]}`}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={`block text-xs font-bold mb-1.5 ${theme === 'light' ? 'text-slate-800' : 'text-slate-300'}`}>שם המדווח</label>
                <input
                  type="text"
                  value={formData.reporter_name}
                  onChange={(e) => setFormData({ ...formData, reporter_name: e.target.value })}
                  placeholder="שם מלא"
                  className={`w-full px-3.5 py-2 text-xs rounded-xl border focus:outline-none transition ${inputBg[theme]}`}
                />
              </div>
              <div>
                <label className={`block text-xs font-bold mb-1.5 ${theme === 'light' ? 'text-slate-800' : 'text-slate-300'}`}>אימייל לחזרה</label>
                <input
                  type="email"
                  value={formData.reporter_email}
                  onChange={(e) => setFormData({ ...formData, reporter_email: e.target.value })}
                  placeholder="name@company.com"
                  className={`w-full px-3.5 py-2 text-xs rounded-xl border focus:outline-none transition ${inputBg[theme]}`}
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting || !formData.title.trim()}
                className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:from-slate-300 disabled:to-slate-300 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-indigo-500/20 transition"
              >
                <Check className="w-4 h-4" />
                <span>{isSubmitting ? 'שומר קריאה...' : 'פתח קריאה ב-SmartQ'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Tickets Queue */}
        <section className={`p-6 rounded-2xl border space-y-4 transition-all duration-300 ${cardBg[theme]}`}>
          <div className={`flex items-center justify-between border-b pb-3 ${theme === 'light' ? 'border-slate-200' : 'border-slate-800'}`}>
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              <h2 className={`text-sm font-bold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>קריאות פתוחות בארגון ({tickets.length})</h2>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">מעקב וסטטוס</span>
          </div>

          {isLoadingTickets ? (
            <div className="flex items-center justify-center py-6 text-slate-500 text-xs gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
              טוען קריאות...
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-xs font-medium">
              אין כרגע קריאות פתוחות בסביבה זו.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {tickets.map((t) => (
                <div key={t.id} className={`p-3.5 border rounded-xl space-y-2 transition ${
                  theme === 'light' ? 'bg-slate-50/80 hover:bg-slate-50 border-slate-200' :
                  theme === 'dark' ? 'bg-slate-800/40 hover:bg-slate-800 border-slate-700/60' :
                  'bg-indigo-950/30 hover:bg-indigo-950/60 border-indigo-500/20'
                }`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono font-black text-indigo-600 dark:text-indigo-400 text-[10px] ml-1.5">
                        #{t.ticket_number || t.id.slice(0, 6)}
                      </span>
                      <h3 className={`text-xs font-bold inline ${theme === 'light' ? 'text-slate-900' : 'text-slate-100'}`}>{t.title}</h3>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getUrgencyBadge(t.urgency)}`}>
                      {t.urgency}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {t.description}
                  </p>

                  <div className={`pt-2 border-t flex items-center justify-between text-[10px] ${
                    theme === 'light' ? 'border-slate-200 text-slate-500 font-medium' : 'border-slate-700/50 text-slate-500'
                  }`}>
                    <span className="bg-indigo-50 text-indigo-700 font-bold px-1.5 py-0.5 rounded border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-800">
                      {t.assigned_team || 'Helpdesk'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {new Date(t.created_at).toLocaleDateString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* POPUP MODAL (6-DIGIT TICKET NUMBER) */}
      {createdTicketNumber && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-3xl p-6 sm:p-8 space-y-6 text-center border shadow-2xl animate-in fade-in zoom-in-95 duration-200 ${
            theme === 'light' ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#111827] border-slate-800 text-white'
          }`}>
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 border border-emerald-300 text-emerald-700 dark:bg-emerald-950/60 dark:border-emerald-500/40 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-md">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-black">קריאת השירות נפתחה בהצלחה!</h3>
              <p className="text-xs opacity-75 font-medium">הפנייה נותבה ישירות לתור צוות ה-IT המתאים בארגון</p>
            </div>

            <div className={`p-4 rounded-2xl border space-y-2 ${
              theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/90 border-slate-800'
            }`}>
              <span className="text-[11px] font-bold opacity-75">מספר קריאת שירות למעקב</span>
              <div className="flex items-center justify-center gap-2">
                <span className="text-2xl font-black font-mono tracking-wider text-indigo-600 dark:text-indigo-400">
                  #{createdTicketNumber}
                </span>
                <button
                  type="button"
                  onClick={copyTicketNumber}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300 transition"
                  title="העתק מספר קריאה"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setCreatedTicketNumber(null)}
              className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl text-xs font-black shadow-md transition"
            >
              סגור
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

export default function TenantNewRequestPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F8FAFC]" />}>
      <NewRequestContent />
    </Suspense>
  );
}