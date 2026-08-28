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
  Building2
} from 'lucide-react';

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
  tenant_id: string;
}

const QUICK_PROMPTS = [
  'נשפך לי קפה על מקלדת הלפטופ',
  'לא מצליח להתחבר ל-VPN מהבית',
  'צריך הרשאה לתיקייה משותפת',
  'המסך החיצוני מהבהב ומציג קווים'
];

function TenantPortalContent() {
  const params = useParams();
  const tenantSlug = (params?.tenant as string) || 'demo';

  const searchParams = useSearchParams();
  const ssoName = searchParams.get('name') || '';
  const ssoEmail = searchParams.get('email') || '';
  const ssoDept = searchParams.get('dept') || '';

  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string; dept: string } | null>(null);

  const [messages, setMessages] = useState<Message[]>([
    { 
      id: 'init-msg',
      role: 'assistant', 
      content: 'היי, אני Rebecca מבית SmartQ. ספר לי מה התקלה או הבקשה שלך ואדאג למלא את כל פרטי הקריאה עבורך.',
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

  // 1. טעינת פרטי הארגון (Tenant)
  useEffect(() => {
    const fetchTenant = async () => {
      const { data } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tenantSlug)
        .single();

      if (data) {
        setTenant(data);
      } else {
        setTenant({
          id: tenantSlug,
          name: tenantSlug.toUpperCase(),
          domain: '',
          admin_email: '',
        });
      }
    };

    fetchTenant();
  }, [tenantSlug]);

  // 2. קליטת נתוני SSO אם קיימים
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
          content: `שלום ${ssoName}! זיהיתי שהתחברת מחשבון הארגון${ssoDept ? ` (${ssoDept})` : ''}. ספר לי מה התקלה ואשייך אותה ישירות אליך.`,
          isStreaming: true
        }
      ]);
    }
  }, [ssoName, ssoEmail, ssoDept]);

  // גלילה אוטומטית בצ'אט
  useEffect(() => {
    if (chatMessagesContainerRef.current) {
      chatMessagesContainerRef.current.scrollTop = chatMessagesContainerRef.current.scrollHeight;
    }
  }, [messages, isAiLoading]);

  // 3. שליפת הקריאות של הארגון הספציפי בלבד
  const fetchTickets = async () => {
    setIsLoadingTickets(true);
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('tenant_id', tenantSlug)
      .order('created_at', { ascending: false });

    if (!error && data) setTickets(data);
    setIsLoadingTickets(false);
  };

  useEffect(() => {
    fetchTickets();
  }, [tenantSlug]);

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
            content: 'מילאתי את כל פרטי הקריאה בטופס. מעבירה אותך לבדיקה ושיגור.',
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
          tenant_id: tenantSlug,
          reporter_name: currentUser?.name || formData.reporter_name,
          reporter_email: currentUser?.email || formData.reporter_email,
          status: 'Open',
        },
      ]);

      if (error) throw error;

      setFeedbackMsg({ text: 'הקריאה נשלחה בהצלחה לצוות המטפל בארגון!', type: 'success' });
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
        { id: 'done-' + Date.now(), role: 'assistant', content: 'הקריאה שוגרה בהצלחה. אפשר לפתוח קריאה נוספת!', isStreaming: true }
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
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl overflow-hidden shadow-sm flex items-center justify-center">
              <Image src="/smartq-logo.png" alt="SmartQ" width={36} height={36} className="object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black tracking-tight text-slate-900">SmartQ</span>
                <span className="px-2 py-0.5 text-[10px] font-extrabold text-white bg-gradient-to-r from-indigo-500 to-purple-600 rounded-md shadow-2xs uppercase">
                  AI DESK
                </span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                <Building2 className="w-3 h-3 text-indigo-500" />
                <span>{tenant?.name || tenantSlug}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {currentUser ? (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-emerald-800 text-xs font-semibold">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>{currentUser.name}</span>
              </div>
            ) : (
              <a
                href="/api/auth/saml/login"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200/80 rounded-xl transition"
              >
                <LogIn className="w-3.5 h-3.5 text-indigo-600" />
                <span>התחבר SSO</span>
              </a>
            )}

            <button 
              onClick={fetchTickets}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
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
              className="text-[11px] font-medium px-3.5 py-1.5 rounded-xl bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-slate-700 hover:text-indigo-700 transition shadow-2xs flex items-center gap-1.5"
            >
              <Zap className="w-3 h-3 text-purple-500" />
              {prompt}
            </button>
          ))}
        </div>

        {/* Rebecca Chat Interface */}
        <div className="bg-white rounded-2xl border-2 border-indigo-400/30 shadow-xl overflow-hidden flex flex-col h-[480px]">
          <div className="px-5 py-3.5 bg-gradient-to-r from-indigo-50 via-purple-50/40 to-white border-b border-indigo-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center text-white shadow-md font-bold text-xs">
                R
              </div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-sm">Rebecca AI</h3>
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
              </div>
            </div>

            {isReadyForReview && (
              <button
                type="button"
                onClick={() => formSectionRef.current?.scrollIntoView({ behavior: 'smooth' })}
                className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-1 rounded-lg transition"
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
                  m.role === 'user' ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white' : 'bg-gradient-to-tr from-indigo-600 to-purple-500 text-white'
                }`}>
                  {m.role === 'user' ? <User className="w-3.5 h-3.5" /> : 'R'}
                </div>
                <div className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed max-w-[85%] shadow-2xs ${
                  m.role === 'user' 
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-br-none' 
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
              <div className="flex items-center gap-3 text-xs text-indigo-700 bg-indigo-50 border border-indigo-100 p-2.5 rounded-2xl w-fit">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" />
                </div>
                <span>Rebecca מפענחת את הנתונים...</span>
              </div>
            )}
          </div>

          {/* Chat Input */}
          <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="p-3 bg-white border-t border-slate-100 flex gap-2">
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="כתוב כאן ל-Rebecca מה התקלה..."
              className="flex-1 px-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none transition"
            />
            <button
              type="submit"
              disabled={isAiLoading || !userInput.trim()}
              className="px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:from-slate-200 disabled:to-slate-200 text-white rounded-xl font-semibold text-xs sm:text-sm transition shadow-sm flex items-center justify-center gap-1.5"
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

        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-900">אישור ושיגור קריאה ({tenant?.name})</h2>
            </div>
            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full">
              SmartQ Core
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
                className="w-full px-3.5 py-2 text-xs bg-slate-50/70 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none transition"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">קטגוריה</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50/70 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-indigo-500 focus:outline-none transition"
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
                  className="w-full px-3 py-2 text-xs bg-slate-50/70 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-indigo-500 focus:outline-none transition"
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
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">רכיב / מערכת</label>
                <input
                  type="text"
                  value={formData.system_impacted}
                  onChange={(e) => setFormData({ ...formData, system_impacted: e.target.value })}
                  placeholder="לדוגמה: VPN, מחשב נייד, SAP..."
                  className="w-full px-3.5 py-2 text-xs bg-slate-50/70 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">צוות מטפל</label>
                <select
                  value={formData.assigned_team}
                  onChange={(e) => setFormData({ ...formData, assigned_team: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50/70 border border-slate-200 rounded-xl text-indigo-900 font-semibold focus:bg-white focus:border-indigo-500 focus:outline-none transition"
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
                className="w-full px-3.5 py-2 text-xs bg-slate-50/70 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none transition leading-relaxed"
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
                  className="w-full px-3.5 py-2 text-xs bg-slate-50/70 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">אימייל לחזרה</label>
                <input
                  type="email"
                  value={formData.reporter_email}
                  onChange={(e) => setFormData({ ...formData, reporter_email: e.target.value })}
                  placeholder="name@company.com"
                  className="w-full px-3.5 py-2 text-xs bg-slate-50/70 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none transition"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting || !formData.title.trim()}
                className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:from-slate-200 disabled:to-slate-200 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-indigo-500/20 transition"
              >
                <Check className="w-4 h-4" />
                {isSubmitting ? 'שומר קריאה...' : 'פתח קריאה ב-SmartQ'}
              </button>
            </div>
          </form>
        </div>

        {/* Tickets Queue of this Tenant */}
        <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-800">קריאות פתוחות בארגון ({tickets.length})</h2>
            </div>
            <span className="text-xs text-slate-400 font-medium">מעקב וסטטוס</span>
          </div>

          {isLoadingTickets ? (
            <div className="flex items-center justify-center py-6 text-slate-400 text-xs gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
              טוען קריאות...
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-xs font-medium">
              אין כרגע קריאות פתוחות בסביבה זו.
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
                    <span className="bg-indigo-50 text-indigo-700 font-semibold px-1.5 py-0.5 rounded border border-indigo-100">
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

export default function TenantPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F8FAFC]" />}>
      <TenantPortalContent />
    </Suspense>
  );
}