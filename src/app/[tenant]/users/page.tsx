'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabaseClient';
import { 
  Building2, 
  Send, 
  Sparkles, 
  Bot, 
  User, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  MapPin, 
  Phone, 
  Mail, 
  RefreshCw,
  X,
  Copy,
  Check,
  ShieldCheck,
  Sun,
  Moon,
  Zap
} from 'lucide-react';

type ThemeMode = 'light' | 'dark' | 'ai';

interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
}

interface ParsedTicketPreview {
  title: string;
  category: string;
  urgency: 'Critical' | 'High' | 'Medium' | 'Low';
  assigned_team: string;
  description: string;
}

function UsersPortalContent() {
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const params = useParams();
  const rawTenant = (params?.tenant as string) || '';
  const tenantSlug = rawTenant.toLowerCase();

  const [tenantName, setTenantName] = useState<string>('');
  
  // User Profile States
  const [userName, setUserName] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');
  const [userPhone, setUserPhone] = useState<string>('');
  const [userCity, setUserCity] = useState<string>('');
  const [isIdentified, setIsIdentified] = useState<boolean>(false);

  const [inputMessage, setInputMessage] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: 'שלום! אני Zack, מומחה ה-AI של מוקד ה-IT. תאר לי את התקלה או הבקשה שלך, ואני אבצע אבחון מיידי, סיווג ופתיחת קריאה מול הצוות המתאים.'
    }
  ]);

  const [analyzing, setAnalyzing] = useState(false);
  const [ticketPreview, setTicketPreview] = useState<ParsedTicketPreview | null>(null);
  const [submittingTicket, setSubmittingTicket] = useState(false);
  const [createdTicketNumber, setCreatedTicketNumber] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function initPortal() {
      if (!tenantSlug) return;

      const { data: tenant } = await supabase.from('tenants').select('*').ilike('id', tenantSlug).single();
      if (tenant) {
        setTenantName(tenant.name);
      } else {
        setTenantName(rawTenant.toUpperCase());
      }

      const matchCookie = document.cookie
        .split('; ')
        .find((row) => row.startsWith('smartq_session='));

      if (matchCookie) {
        try {
          const rawVal = matchCookie.split('=')[1];
          const decoded = JSON.parse(atob(rawVal));
          if (decoded.email) {
            setUserEmail(decoded.email);
            setUserName(decoded.name || decoded.email.split('@')[0]);
            if (decoded.city) setUserCity(decoded.city);
            setIsIdentified(true);
          }
        } catch {}
      }
    }

    initPortal();
  }, [tenantSlug, rawTenant]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, ticketPreview]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || analyzing) return;

    const currentText = inputMessage.trim();
    setInputMessage('');

    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), sender: 'user', text: currentText }
    ]);

    setAnalyzing(true);
    setTicketPreview(null);

    try {
      const parseRes = await fetch('/api/ai-parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: currentText,
          tenantSlug
        })
      });

      const aiData = await parseRes.json().catch(() => ({}));

      const parsed: ParsedTicketPreview = {
        title: aiData.summary || currentText.slice(0, 80),
        category: aiData.category || 'כללי / Helpdesk',
        urgency: aiData.urgency || 'Medium',
        assigned_team: aiData.assignedTeam || 'Helpdesk Tier 1',
        description: currentText
      };

      setTicketPreview(parsed);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'bot',
          text: `אבחנתי את הפנייה שלך! סיווגתי אותה כ-${parsed.category} ברמת דחיפות ${parsed.urgency}. בדוק את כרטיס הקריאה מטה ולחץ על "פתח קריאת שירות" כדי לשלוח אותה לצוות ${parsed.assigned_team}.`
        }
      ]);
    } catch {
      const fallbackParsed: ParsedTicketPreview = {
        title: currentText.slice(0, 80),
        category: 'Helpdesk Support',
        urgency: 'Medium',
        assigned_team: 'Helpdesk Tier 1',
        description: currentText
      };
      setTicketPreview(fallbackParsed);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'bot',
          text: 'ניתחתי את בקשתך. תוכל לאשר את פתיחת הקריאה ישירות מהכרטיס מטה.'
        }
      ]);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleConfirmCreateTicket = async () => {
    if (!ticketPreview) return;
    setSubmittingTicket(true);

    const generated6Digits = Math.floor(100000 + Math.random() * 900000).toString();
    const finalName = userName.trim() || 'עובד ארגון';
    const finalEmail = userEmail.trim() || `user@${tenantSlug || 'company.com'}`;
    const finalCity = userCity.trim() || 'מטה ראשי';
    const finalPhone = userPhone.trim() || '';

    try {
      const { data, error } = await supabase
        .from('tickets')
        .insert({
          tenant_id: tenantSlug,
          ticket_number: generated6Digits,
          title: ticketPreview.title,
          description: ticketPreview.description,
          user_name: finalName,
          user_email: finalEmail,
          user_phone: finalPhone,
          user_city: finalCity,
          category: ticketPreview.category,
          urgency: ticketPreview.urgency,
          assigned_team: ticketPreview.assigned_team,
          status: 'Open'
        })
        .select()
        .single();

      if (error) throw error;

      const finalTicketNum = data?.ticket_number || generated6Digits;
      setCreatedTicketNumber(finalTicketNum);
      setTicketPreview(null);
    } catch (err: any) {
      alert('שגיאה בפתיחת הקריאה: ' + err.message);
    } finally {
      setSubmittingTicket(false);
    }
  };

  const copyTicketNumber = () => {
    if (createdTicketNumber) {
      navigator.clipboard.writeText(createdTicketNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Dynamic Theme Styling Matrix
  const themeBg = {
    light: 'bg-[#F8FAFC] text-slate-900',
    dark: 'bg-[#0B0F19] text-slate-100',
    ai: 'bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#1e0847] via-[#0b051e] to-[#04010d] text-cyan-50 selection:bg-fuchsia-500'
  };

  const headerBg = {
    light: 'bg-white/90 border-slate-200 shadow-xs',
    dark: 'bg-[#0E1424]/90 border-slate-800',
    ai: 'bg-[#110729]/80 border-fuchsia-500/30 backdrop-blur-xl shadow-lg shadow-purple-950/40'
  };

  const cardBg = {
    light: 'bg-white border-slate-200 text-slate-900 shadow-sm',
    dark: 'bg-[#111827] border-slate-800 text-slate-100 shadow-xl',
    ai: 'bg-gradient-to-b from-[#180b38]/90 to-[#0d0522]/90 border-cyan-500/30 text-cyan-100 shadow-[0_0_35px_rgba(168,85,247,0.15)] backdrop-blur-2xl'
  };

  const inputStyle = {
    light: 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-indigo-600',
    dark: 'bg-slate-800/90 border-slate-700 text-white placeholder-slate-500 focus:border-indigo-500',
    ai: 'bg-[#1e0d47]/80 border-cyan-400/40 text-cyan-100 placeholder-fuchsia-300/40 focus:border-cyan-300 focus:ring-1 focus:ring-cyan-300/50 shadow-inner'
  };

  const botBubbleBg = {
    light: 'bg-slate-100 border-slate-200 text-slate-800',
    dark: 'bg-slate-800/90 border-slate-700/80 text-slate-200',
    ai: 'bg-[#200d4d]/90 border border-fuchsia-500/40 text-fuchsia-100 shadow-[0_0_15px_rgba(217,70,239,0.1)]'
  };

  const userBubbleBg = {
    light: 'bg-indigo-600 text-white',
    dark: 'bg-indigo-600 text-white',
    ai: 'bg-gradient-to-r from-fuchsia-600 via-purple-600 to-cyan-600 text-white font-bold shadow-lg shadow-fuchsia-600/30'
  };

  return (
    <div dir="rtl" className={`min-h-screen font-sans antialiased flex flex-col justify-between transition-colors duration-500 ${themeBg[theme]}`}>
      
      {/* Top Header */}
      <header className={`h-16 border-b sticky top-0 z-30 px-6 flex items-center justify-between backdrop-blur-md transition-colors duration-300 ${headerBg[theme]}`}>
        <div className="flex items-center gap-3.5">
          <div className={`relative w-9 h-9 rounded-xl overflow-hidden shadow-md flex items-center justify-center bg-white border ${theme === 'ai' ? 'border-fuchsia-400 ring-2 ring-cyan-400/50' : 'border-slate-100'}`}>
            <Image src="/smartq-logo.png" alt="SmartQ" width={36} height={36} className="object-contain" priority />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-base font-black ${theme === 'ai' ? 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-fuchsia-300 to-purple-400' : ''}`}>SmartQ Support</span>
              <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-md border ${
                theme === 'ai' ? 'bg-fuchsia-500/20 text-cyan-300 border-cyan-400/40 animate-pulse' :
                theme === 'light' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                'bg-indigo-500/20 text-indigo-400 border-indigo-500/30'
              }`}>
                {theme === 'ai' ? '⚡ NEURAL AI HUB' : 'EMPLOYEE PORTAL'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-bold opacity-80">
              <Building2 className={`w-3.5 h-3.5 ${theme === 'ai' ? 'text-cyan-400' : 'text-indigo-400'}`} />
              <span>{tenantName || rawTenant}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Theme Switcher */}
          <div className={`flex items-center p-1 rounded-xl border ${
            theme === 'light' ? 'bg-slate-100 border-slate-200' :
            theme === 'dark' ? 'bg-slate-800 border-slate-700' :
            'bg-[#190938] border-fuchsia-500/40 shadow-inner'
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
              className={`p-1.5 rounded-lg transition ${theme === 'ai' ? 'bg-gradient-to-r from-fuchsia-600 to-cyan-500 text-white shadow-[0_0_10px_rgba(217,70,239,0.5)]' : 'text-slate-400 hover:text-white'}`}
              title="Supercharged AI Neural Mode"
            >
              <Sparkles className="w-3.5 h-3.5" />
            </button>
          </div>

          <a
            href={`/${rawTenant}/login`}
            className={`text-xs font-bold transition px-3 py-1.5 rounded-xl border ${
              theme === 'ai' ? 'border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/20' :
              theme === 'light' ? 'border-slate-300 text-slate-700 hover:bg-slate-100' :
              'border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
          >
            כניסת מנהלים וטכנאי IT
          </a>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* User Details Sidebar */}
        <aside className={`lg:col-span-4 rounded-3xl p-5 space-y-4 border transition-colors ${cardBg[theme]}`}>
          <div className="border-b pb-3 border-inherit/30">
            <h2 className="text-xs font-black flex items-center gap-2">
              <User className={`w-4 h-4 ${theme === 'ai' ? 'text-cyan-400' : 'text-indigo-400'}`} />
              <span>פרטי הפונה ומיקום מטה</span>
            </h2>
            <p className="text-[11px] opacity-70 mt-0.5">זאק יצרף פרטים אלו אוטומטית לכרטיס הקריאה</p>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-bold mb-1 opacity-90">שם מלא</label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="למשל: דניאל אורן"
                className={`w-full px-3.5 py-2.5 rounded-xl border font-medium transition ${inputStyle[theme]}`}
              />
            </div>

            <div>
              <label className="block font-bold mb-1 opacity-90">אימייל ארגוני</label>
              <input
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="user@company.com"
                className={`w-full px-3.5 py-2.5 rounded-xl border font-medium transition ${inputStyle[theme]}`}
              />
            </div>

            <div>
              <label className="block font-bold mb-1 opacity-90">טלפון / שלוחה</label>
              <input
                type="tel"
                value={userPhone}
                onChange={(e) => setUserPhone(e.target.value)}
                placeholder="050-0000000"
                className={`w-full px-3.5 py-2.5 rounded-xl border font-medium transition ${inputStyle[theme]}`}
              />
            </div>

            <div>
              <label className={`block font-bold mb-1 flex items-center gap-1.5 ${theme === 'ai' ? 'text-cyan-300' : 'text-indigo-400'}`}>
                <MapPin className="w-3.5 h-3.5" />
                <span>עיר / מטה / סניף (City / HQ)</span>
              </label>
              <input
                type="text"
                value={userCity}
                onChange={(e) => setUserCity(e.target.value)}
                placeholder="למשל: מטה חיפה / נהריה / תל אביב"
                className={`w-full px-3.5 py-2.5 rounded-xl border font-semibold transition ${inputStyle[theme]}`}
              />
            </div>
          </div>
        </aside>

        {/* Zack AI Interactive Chat Desk */}
        <section className={`lg:col-span-8 rounded-3xl flex flex-col h-[650px] border overflow-hidden transition-colors ${cardBg[theme]}`}>
          
          {/* Desk Header */}
          <div className={`p-4 border-b flex items-center justify-between ${
            theme === 'ai' ? 'bg-[#150734]/80 border-fuchsia-500/20' :
            theme === 'light' ? 'bg-slate-50 border-slate-200' :
            'bg-slate-900/60 border-slate-800'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-md ${
                theme === 'ai' ? 'bg-gradient-to-tr from-fuchsia-600 to-cyan-400 ring-2 ring-cyan-300/40 shadow-fuchsia-500/30' :
                'bg-gradient-to-tr from-indigo-500 to-purple-600'
              }`}>
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-black flex items-center gap-1.5">
                  <span className={theme === 'ai' ? 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-fuchsia-300 to-white' : ''}>
                    Zack AI Assistant
                  </span>
                  <span className={`w-2 h-2 rounded-full ${theme === 'ai' ? 'bg-cyan-400 shadow-[0_0_8px_#22d3ee]' : 'bg-emerald-400'} animate-pulse`} />
                </div>
                <div className="text-[10px] opacity-70 font-bold">סיווג תקלות חכם, ניתוב תורים ו-SLA</div>
              </div>
            </div>
          </div>

          {/* Messages Flow */}
          <div className="flex-1 p-5 overflow-y-auto space-y-4">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-3 text-xs leading-relaxed ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.sender === 'bot' && (
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
                    theme === 'ai' ? 'bg-fuchsia-950/60 border-fuchsia-500/40 text-cyan-300 shadow-[0_0_10px_rgba(217,70,239,0.3)]' :
                    'bg-indigo-600/20 border-indigo-500/30 text-indigo-400'
                  }`}>
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[80%] p-4 rounded-2xl ${
                    m.sender === 'user'
                      ? `${userBubbleBg[theme]} rounded-tl-xs`
                      : `${botBubbleBg[theme]} rounded-tr-xs`
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.text}</p>
                </div>

                {m.sender === 'user' && (
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
                    theme === 'ai' ? 'bg-cyan-950/60 border-cyan-500/40 text-fuchsia-300' :
                    'bg-purple-600/20 border-purple-500/30 text-purple-400'
                  }`}>
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {analyzing && (
              <div className={`flex items-center gap-2 text-xs font-bold p-3.5 rounded-2xl border w-fit ${
                theme === 'ai' ? 'bg-[#290e5c]/80 border-cyan-400/50 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.2)]' :
                'bg-indigo-950/30 border-indigo-500/30 text-indigo-400'
              }`}>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Zack AI מאבחן את הפנייה ובונה כרטיס שירות...</span>
              </div>
            )}

            {/* Smart Parsed Ticket Preview Card */}
            {ticketPreview && (
              <div className={`p-5 rounded-2xl border space-y-3.5 shadow-xl ${
                theme === 'ai'
                  ? 'bg-gradient-to-r from-[#290d5e] to-[#16063b] border-fuchsia-500/50 shadow-[0_0_25px_rgba(217,70,239,0.25)]'
                  : 'bg-indigo-950/20 border-indigo-500/40'
              }`}>
                <div className="flex items-center justify-between border-b pb-2.5 border-inherit/30">
                  <div className="flex items-center gap-2">
                    <Sparkles className={`w-4 h-4 ${theme === 'ai' ? 'text-cyan-400' : 'text-indigo-400'}`} />
                    <span className="text-xs font-black">כרטיס קריאה מוכן לאישור</span>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                    ticketPreview.urgency === 'Critical' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                    ticketPreview.urgency === 'High' ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40' :
                    'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  }`}>
                    {ticketPreview.urgency} Priority
                  </span>
                </div>

                <div className="text-xs space-y-1.5">
                  <div className="font-bold text-sm">{ticketPreview.title}</div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 opacity-80">
                    <div>קטגוריה: <span className="font-bold opacity-100">{ticketPreview.category}</span></div>
                    <div>צוות מטפל: <span className="font-bold opacity-100">{ticketPreview.assigned_team}</span></div>
                    <div>פונה: <span className="font-bold opacity-100">{userName || 'עובד ארגון'}</span></div>
                    <div>עיר/מטה: <span className="font-bold opacity-100">{userCity || 'מטה ראשי'}</span></div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleConfirmCreateTicket}
                  disabled={submittingTicket}
                  className={`w-full py-2.5 rounded-xl text-xs font-black shadow-md transition flex items-center justify-center gap-2 ${
                    theme === 'ai'
                      ? 'bg-gradient-to-r from-fuchsia-500 via-purple-600 to-cyan-500 hover:opacity-90 text-white shadow-[0_0_20px_rgba(217,70,239,0.4)]'
                      : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{submittingTicket ? 'פותח קריאה במוקד...' : 'אשר ופתח קריאת שירות זו'}</span>
                </button>
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>

          {/* Chat Message Input */}
          <form onSubmit={handleSendMessage} className={`p-3.5 border-t flex items-center gap-2 ${
            theme === 'ai' ? 'bg-[#12062b] border-fuchsia-500/20' :
            theme === 'light' ? 'bg-slate-50 border-slate-200' :
            'bg-slate-900/50 border-slate-800'
          }`}>
            <input
              type="text"
              required
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="תאר את התקלה (לדוגמה: נעילת חשבון, בעיית VPN, הגדרת מדפסת...)..."
              className={`flex-1 px-4 py-2.5 rounded-xl border text-xs font-medium transition ${inputStyle[theme]}`}
            />
            <button
              type="submit"
              disabled={analyzing || !inputMessage.trim()}
              className={`px-5 py-2.5 rounded-xl text-xs font-black shadow-md transition flex items-center gap-1.5 ${
                theme === 'ai'
                  ? 'bg-gradient-to-r from-fuchsia-600 to-cyan-500 hover:opacity-90 text-white shadow-fuchsia-500/30'
                  : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white'
              }`}
            >
              <span>שלח ל-Zack</span>
              <Send className="w-3.5 h-3.5 rtl:rotate-180" />
            </button>
          </form>

        </section>

      </main>

      {/* SUCCESS MODAL POPUP (6-DIGIT TICKET CONFIRMATION) */}
      {createdTicketNumber && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-3xl p-6 sm:p-8 space-y-6 text-center border animate-in fade-in zoom-in-95 duration-200 ${
            theme === 'ai'
              ? 'bg-[#150734] border-fuchsia-500/50 text-cyan-50 shadow-[0_0_50px_rgba(217,70,239,0.35)]'
              : 'bg-[#111827] border-slate-800 text-white shadow-2xl'
          }`}>
            
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto shadow-lg ${
              theme === 'ai'
                ? 'bg-fuchsia-950/80 border border-fuchsia-400 text-cyan-300 shadow-fuchsia-500/40'
                : 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 shadow-emerald-500/10'
            }`}>
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-black">קריאת השירות נפתחה בהצלחה!</h3>
              <p className="text-xs opacity-75 font-medium">הפנייה נותבה ישירות לתור צוות ה-IT המתאים</p>
            </div>

            {/* Ticket 6-Digit Badge */}
            <div className={`p-4 rounded-2xl border space-y-2 ${
              theme === 'ai' ? 'bg-[#1f0b4a] border-cyan-400/40 shadow-inner' : 'bg-slate-900/90 border-slate-800'
            }`}>
              <span className="text-[11px] font-bold opacity-75">מספר קריאת שירות למעקב</span>
              <div className="flex items-center justify-center gap-2">
                <span className={`text-2xl font-black font-mono tracking-wider ${theme === 'ai' ? 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-400' : 'text-indigo-400'}`}>
                  #{createdTicketNumber}
                </span>
                <button
                  type="button"
                  onClick={copyTicketNumber}
                  className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition"
                  title="העתק מספר קריאה"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setCreatedTicketNumber(null)}
              className={`w-full py-3 rounded-xl text-xs font-black shadow-md transition ${
                theme === 'ai'
                  ? 'bg-gradient-to-r from-fuchsia-600 via-purple-600 to-cyan-500 text-white shadow-fuchsia-500/30'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              סגור ופתח פנייה חדשה
            </button>

          </div>
        </div>
      )}

    </div>
  );
}

export default function TenantUsersPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0B0F19]" />}>
      <UsersPortalContent />
    </Suspense>
  );
}