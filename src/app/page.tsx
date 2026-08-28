'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
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
  ShieldCheck
} from 'lucide-react';

function SmartDeskLogo({ className = "w-9 h-9" }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center shrink-0 ${className}`}>
      <svg viewBox="0 0 54 54" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-sm">
        <defs>
          <linearGradient id="primary-sky" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0EA5E9" />
            <stop offset="100%" stopColor="#0284C7" />
          </linearGradient>
          <linearGradient id="accent-orange" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FB923C" />
            <stop offset="100%" stopColor="#F97316" />
          </linearGradient>
        </defs>
        <rect x="3" y="6" width="48" height="34" rx="12" fill="url(#primary-sky)" />
        <path d="M33 16H22C19.2386 16 17 18.2386 17 21C17 23.7614 19.2386 26 22 26H32C34.7614 26 37 28.2386 37 31C37 33.7614 34.7614 36 32 36H20" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="35" cy="16" r="3.5" fill="url(#accent-orange)" />
        <path d="M21 46H33" stroke="#0284C7" strokeWidth="3.5" strokeLinecap="round" />
      </svg>
    </div>
  );
}

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

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

interface Ticket {
  id: string;
  created_at: string;
  title: string;
  description: string;
  category: string;
  urgency: string;
  status: string;
  system_impacted: string;
  assigned_team: string;
  reporter_name: string;
  reporter_email: string;
}

const QUICK_PROMPTS = [
  'נשפך לי קפה על מקלדת הלפטופ',
  'לא מצליח להתחבר ל-VPN מהבית',
  'צריך הרשאה לתיקייה משותפת',
  'המסך החיצוני מהבהב ומציג קווים'
];

function DeskContent() {
  const searchParams = useSearchParams();
  const ssoName = searchParams.get('name') || '';
  const ssoEmail = searchParams.get('email') || '';
  const ssoDept = searchParams.get('dept') || '';

  const [currentUser, setCurrentUser] = useState<{ name: string; email: string; dept: string } | null>(null);

  const [messages, setMessages] = useState<Message[]>([
    { 
      id: 'init-msg',
      role: 'assistant', 
      content: 'היי, אני Rebecca. ספר לי מה התקלה או הבקשה שלך ואדאג למלא את כל פרטי הקריאה.',
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
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(true);

  const chatMessagesContainerRef = useRef<HTMLDivElement>(null);
  const formSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ssoName || ssoEmail) {
      setCurrentUser({ name: ssoName, email: ssoEmail, dept: ssoDept });
      setFormData((prev) => ({
        ...prev,
        reporter_name: ssoName || prev.reporter_name,
        reporter_email: ssoEmail || prev.reporter_email,
      }));
      setMessages([
        {
          id: 'welcome-sso',
          role: 'assistant',
          content: `שלום ${ssoName}! זיהיתי שהתחברת מחשבון הארגון${ssoDept ? ` (${ssoDept})` : ''}. ספר לי מה התקלה ואשייך אותה ישירות לחשבונך.`,
          isStreaming: true
        }
      ]);
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
      .order('created_at', { ascending: false });

    if (!error && data) setTickets(data);
    setIsLoadingTickets(false);
  };

  useEffect(() => {
    fetchTickets();
  }, []);

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
          currentFormData: formData 
        }),
      });

      if (!res.ok) throw new Error('שגיאה בתקשורת מול Rebecca');
      const data = await res.json();

      setFormData((prev) => ({
        ...prev,
        title: data.title || prev.title,
        description: data.description || prev.description,
        category: data.category || prev.category,
        urgency: data.urgency || prev.urgency,
        system_impacted: data.system_impacted || prev.system_impacted,
        assigned_team: data.assigned_team || prev.assigned_team,
        reporter_name: currentUser?.name || data.reporter_name || prev.reporter_name,
        reporter_email: currentUser?.email || data.reporter_email || prev.reporter_email,
      }));

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
            content: 'מילאתי את כל פרטי הקריאה בטופס. גוללת אותך לבדיקה ואישור.',
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

    try {
      const { error } = await supabase.from('tickets').insert([
        {
          ...formData,
          reporter_name: currentUser?.name || formData.reporter_name,
          reporter_email: currentUser?.email || formData.reporter_email,
          status: 'Open',
        },
      ]);

      if (error) throw error;

      setFeedbackMsg({ text: 'הקריאה נשלחה בהצלחה לצוות המטפל!', type: 'success' });
      setFormData({
        title: '',
        description: '',
        category: 'Hardware',
        urgency: 'Medium',
        system_impacted: '',
        assigned_team: 'Helpdesk Tier 1',
        reporter_name: currentUser?.name || '',
        reporter_email: currentUser?.email || '',
      });
      setIsReadyForReview(false);
      setMessages((prev) => [
        ...prev,
        { id: 'done-' + Date.now(), role: 'assistant', content: 'הקריאה נשמרה בהצלחה. יש משהו נוסף שאוכל לעזור בו?', isStreaming: true }
      ]);
      fetchTickets();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setFeedbackMsg({ text: 'שגיאה בשמירת הקריאה: ' + err.message, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'Critical': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'High': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'Medium': return 'bg-sky-50 text-sky-700 border-sky-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <main dir="rtl" className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans antialiased">
      {/* Top Navbar */}
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SmartDeskLogo className="w-9 h-9" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black tracking-tight text-slate-900">SmartDesk</span>
                <span className="px-2 py-0.5 text-[10px] font-extrabold text-white bg-gradient-to-r from-sky-500 to-sky-600 rounded-md uppercase">
                  AI
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {currentUser ? (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200/80 rounded-full text-emerald-800 text-xs font-semibold">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>{currentUser.name}</span>
              </div>
            ) : (
              <a
                href="/api/auth/saml/login"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200/80 rounded-xl transition"
              >
                <LogIn className="w-3.5 h-3.5 text-sky-600" />
                <span>התחבר עם Entra ID</span>
              </a>
            )}

            <button 
              onClick={fetchTickets}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 rounded-lg transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingTickets ? 'animate-spin text-sky-600' : ''}`} />
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
              className="text-[11px] font-medium px-3.5 py-1.5 rounded-xl bg-white hover:bg-sky-50 border border-slate-200 hover:border-sky-300 text-slate-700 hover:text-sky-700 transition shadow-2xs flex items-center gap-1.5"
            >
              <Zap className="w-3 h-3 text-orange-500" />
              {prompt}
            </button>
          ))}
        </div>

        {/* Rebecca Chat Interface */}
        <div className="bg-white rounded-2xl border-2 border-sky-400/40 shadow-xl overflow-hidden flex flex-col h-[480px]">
          <div className="px-5 py-3.5 bg-gradient-to-r from-sky-50 via-sky-50/50 to-white border-b border-sky-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-sky-600 to-sky-400 flex items-center justify-center text-white shadow-md shadow-sky-500/20 font-bold text-xs">
                R
              </div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-sm">Rebecca</h3>
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
              </div>
            </div>

            {isReadyForReview && (
              <button
                type="button"
                onClick={() => formSectionRef.current?.scrollIntoView({ behavior: 'smooth' })}
                className="flex items-center gap-1 text-[11px] font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 border border-orange-200 px-3 py-1 rounded-lg transition"
              >
                <span>הפרטים מוכנים – עבור לטופס</span>
                <ArrowDown className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Messages Flow */}
          <div ref={chatMessagesContainerRef} className="flex-1 p-5 overflow-y-auto space-y-4 bg-slate-50/30">
            {messages.map((m) => (
              <div key={m.id} className={`flex gap-3 ${m.role === 'user' ? 'justify-start flex-row-reverse' : 'justify-start'}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold shadow-2xs ${
                  m.role === 'user' ? 'bg-orange-500 text-white' : 'bg-gradient-to-tr from-sky-600 to-sky-400 text-white'
                }`}>
                  {m.role === 'user' ? <User className="w-3.5 h-3.5" /> : 'R'}
                </div>
                <div className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed max-w-[85%] shadow-2xs ${
                  m.role === 'user' 
                    ? 'bg-orange-500 text-white rounded-br-none' 
                    : 'bg-white text-slate-800 rounded-bl-none border border-slate-200/90'
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
              <div className="flex items-center gap-3 text-xs text-sky-700 bg-sky-50 border border-sky-100 p-2.5 rounded-2xl w-fit">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-sky-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 bg-sky-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 bg-sky-500 rounded-full animate-bounce" />
                </div>
                <span>Rebecca מעדכנת את הטופס...</span>
              </div>
            )}
          </div>

          {/* Chat Input */}
          <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="p-3 bg-white border-t border-slate-100 flex gap-2">
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="כתוב כאן ל-Rebecca..."
              className="flex-1 px-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-100 focus:outline-none transition"
            />
            <button
              type="submit"
              disabled={isAiLoading || !userInput.trim()}
              className="px-4 py-2.5 bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 disabled:from-slate-200 disabled:to-slate-200 text-white rounded-xl font-semibold text-xs sm:text-sm transition shadow-sm flex items-center justify-center gap-1.5"
            >
              <span>שלח</span>
              <Send className="w-3.5 h-3.5" />
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

        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/90 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-sky-600" />
              <h2 className="text-sm font-bold text-slate-900">פרטי הקריאה שנאספו</h2>
            </div>
            <span className="text-[10px] font-bold text-sky-700 bg-sky-50 border border-sky-100 px-2.5 py-0.5 rounded-full">
              סונכרן ע״י Rebecca
            </span>
          </div>

          <form onSubmit={handleSubmitTicket} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">נושא הפנייה *</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="נושא הפנייה..."
                className="w-full px-3.5 py-2 text-xs bg-slate-50/70 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:border-sky-500 focus:outline-none transition"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">קטגוריה</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50/70 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-sky-500 focus:outline-none transition"
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
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">דחיפות SLA</label>
                <select
                  value={formData.urgency}
                  onChange={(e) => setFormData({ ...formData, urgency: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50/70 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-sky-500 focus:outline-none transition"
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
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">רכיב / אפליקציה</label>
                <input
                  type="text"
                  value={formData.system_impacted}
                  onChange={(e) => setFormData({ ...formData, system_impacted: e.target.value })}
                  placeholder="לדוגמה: VPN, מחשב נייד"
                  className="w-full px-3.5 py-2 text-xs bg-slate-50/70 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:border-sky-500 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">צוות מטפל</label>
                <select
                  value={formData.assigned_team}
                  onChange={(e) => setFormData({ ...formData, assigned_team: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50/70 border border-slate-200 rounded-xl text-sky-800 font-semibold focus:bg-white focus:border-sky-500 focus:outline-none transition"
                >
                  <option value="Helpdesk Tier 1">Helpdesk Tier 1</option>
                  <option value="System & Cloud Team">System & Cloud Team</option>
                  <option value="Network & Security">Network & Security</option>
                  <option value="IT Applications & BI">IT Applications & BI</option>
                  <option value="Identity & Access">Identity & Access</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">פירוט הפנייה *</label>
              <textarea
                required
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="פירוט הבקשה..."
                className="w-full px-3.5 py-2 text-xs bg-slate-50/70 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:border-sky-500 focus:outline-none transition leading-relaxed"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">שם המדווח</label>
                <input
                  type="text"
                  value={formData.reporter_name}
                  onChange={(e) => setFormData({ ...formData, reporter_name: e.target.value })}
                  placeholder="שם מלא"
                  className="w-full px-3.5 py-2 text-xs bg-slate-50/70 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:border-sky-500 focus:outline-none transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">אימייל לחזרה</label>
                <input
                  type="email"
                  value={formData.reporter_email}
                  onChange={(e) => setFormData({ ...formData, reporter_email: e.target.value })}
                  placeholder="name@company.com"
                  className="w-full px-3.5 py-2 text-xs bg-slate-50/70 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:border-sky-500 focus:outline-none transition"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting || !formData.title.trim()}
                className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:from-slate-200 disabled:to-slate-200 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-orange-500/20 transition"
              >
                <Check className="w-4 h-4" />
                {isSubmitting ? 'שומר קריאה...' : 'אשר ופתח קריאה ב-SmartDesk'}
              </button>
            </div>
          </form>
        </div>

        {/* Compact Tickets Queue */}
        <section className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-sky-600" />
              <h2 className="text-sm font-bold text-slate-800">קריאות פתוחות במערכת ({tickets.length})</h2>
            </div>
            <span className="text-xs text-slate-400 font-medium">מעקב וסטטוס</span>
          </div>

          {isLoadingTickets ? (
            <div className="flex items-center justify-center py-6 text-slate-400 text-xs gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-sky-600" />
              טוען קריאות...
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-xs font-medium">
              אין כרגע קריאות פתוחות.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {tickets.map((t) => (
                <div key={t.id} className="p-3.5 bg-slate-50/60 hover:bg-slate-50 border border-slate-200/70 rounded-xl space-y-2 transition">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-xs font-bold text-slate-800 line-clamp-1">{t.title}</h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getUrgencyBadge(t.urgency)}`}>
                      {t.urgency}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                    {t.description}
                  </p>

                  <div className="pt-2 border-t border-slate-200/50 flex items-center justify-between text-[10px] text-slate-400">
                    <span className="bg-sky-50 text-sky-700 font-semibold px-1.5 py-0.5 rounded border border-sky-100">
                      {t.assigned_team || 'Helpdesk'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {new Date(t.created_at).toLocaleDateString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F8FAFC]" />}>
      <DeskContent />
    </Suspense>
  );
}