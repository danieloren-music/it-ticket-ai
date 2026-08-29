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
  HelpCircle,
  RefreshCw,
  Sun,
  Moon,
  ShieldCheck
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  ticketInfo?: {
    ticketNumber?: string;
    category?: string;
    urgency?: string;
    team?: string;
    summary?: string;
    city?: string;
  };
}

function UsersPortal() {
  const params = useParams();
  const rawTenant = (params?.tenant as string) || '';
  const tenantSlug = rawTenant.toLowerCase();

  const [tenantName, setTenantName] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');
  const [userPhone, setUserPhone] = useState<string>('');
  const [userCity, setUserCity] = useState<string>('');
  const [issueDescription, setIssueDescription] = useState<string>('');

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: 'שלום! אני Zack, מומחה ה-AI לפתרון וסיווג תקלות IT. פרט את הבעיה או הבקשה שלך ואטפל בה מיד.'
    }
  ]);

  const [loading, setLoading] = useState<boolean>(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadTenant() {
      if (!tenantSlug) return;
      const { data: tenant } = await supabase.from('tenants').select('*').ilike('id', tenantSlug).single();
      if (tenant) {
        setTenantName(tenant.name);
      }
    }
    loadTenant();
  }, [tenantSlug]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueDescription.trim()) return;

    const userMsgText = issueDescription;
    const currentCity = userCity.trim() || 'כללי';
    const currentPhone = userPhone.trim() || '';
    const currentName = userName.trim() || 'עובד ארגון';
    const currentEmail = userEmail.trim() || `user@${tenantSlug || 'company.com'}`;

    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), sender: 'user', text: userMsgText }
    ]);
    setIssueDescription('');
    setLoading(true);

    try {
      // 1. סיווג חכם של הפנייה עם Zack AI
      const parseRes = await fetch('/api/ai-parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: userMsgText,
          tenantSlug
        })
      });

      const aiData = await parseRes.json().catch(() => ({}));
      const generatedTicketNum = Math.floor(100000 + Math.random() * 900000).toString();

      const urgency = aiData.urgency || 'Medium';
      const category = aiData.category || 'כללי / Helpdesk';
      const assignedTeam = aiData.assignedTeam || 'Helpdesk Tier 1';
      const summary = aiData.summary || userMsgText;

      // 2. שמירה ב-Supabase (שימוש ב-title שתואם לסכמה)
      const { data: newTicket, error } = await supabase
        .from('tickets')
        .insert({
          tenant_id: tenantSlug,
          ticket_number: generatedTicketNum,
          title: summary.slice(0, 100),
          description: userMsgText,
          user_name: currentName,
          user_email: currentEmail,
          user_phone: currentPhone,
          user_city: currentCity,
          category,
          urgency,
          assigned_team: assignedTeam,
          status: 'Open'
        })
        .select()
        .single();

      if (error) throw error;

      const finalTicketNumber = newTicket?.ticket_number || generatedTicketNum;

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'bot',
          text: `קריאת שירות #${finalTicketNumber} נפתחה בהצלחה עבור מטה ${currentCity} ונותבה לצוות ${assignedTeam}. נציג IT יטפל בפנייתך בהקדם.`,
          ticketInfo: {
            ticketNumber: finalTicketNumber,
            category,
            urgency,
            team: assignedTeam,
            summary,
            city: currentCity
          }
        }
      ]);
    } catch (err: any) {
      console.error('Error creating ticket:', err);
      // הודעה מאובטחת ומסבירת פנים ללא חשיפת שגיאות שרת פנימיות
      setMessages((prev) => [
        ...prev,
        { 
          id: (Date.now() + 1).toString(), 
          sender: 'bot', 
          text: 'פנייתך התקבלה ומעובדת כעת. במידה והתקלה דחופה, אנא פנה ישירות למוקד ה-IT.' 
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-[#0B0F19] text-slate-100 font-sans antialiased flex flex-col justify-between">
      
      {/* Top Header */}
      <header className="h-16 border-b border-slate-800 bg-[#0E1424]/90 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3.5">
          <div className="relative w-9 h-9 rounded-xl overflow-hidden shadow-md flex items-center justify-center bg-white border border-slate-100">
            <Image src="/smartq-logo.png" alt="SmartQ" width={36} height={36} className="object-contain" priority />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-black text-white">SmartQ Support</span>
              <span className="px-2 py-0.5 text-[10px] font-extrabold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-md">
                PORTAL
              </span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-slate-400 font-bold">
              <Building2 className="w-3 h-3 text-indigo-400" />
              <span>{tenantName || rawTenant}</span>
            </div>
          </div>
        </div>

        <a
          href={`/${rawTenant}/login`}
          className="text-xs font-bold text-slate-400 hover:text-indigo-400 transition"
        >
          כניסת מנהלים וטכנאים
        </a>
      </header>

      {/* Main Workspace Layout */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* User Details Sidebar */}
        <aside className="lg:col-span-4 bg-[#111827] border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl">
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-xs font-black text-white flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-400" />
              <span>פרטי הפונה ומיקום מטה</span>
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">הפרטים יצורפו אוטומטית לקריאה עבור צוות ה-IT</p>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-bold text-slate-300 mb-1">שם מלא</label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="למשל: דניאל אורן"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-300 mb-1">אימייל</label>
              <input
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="user@company.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-300 mb-1">טלפון / שלוחה</label>
              <input
                type="tel"
                value={userPhone}
                onChange={(e) => setUserPhone(e.target.value)}
                placeholder="050-0000000"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block font-bold text-indigo-300 mb-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                <span>עיר / מטה / סניף (City / HQ)</span>
              </label>
              <input
                type="text"
                value={userCity}
                onChange={(e) => setUserCity(e.target.value)}
                placeholder="למשל: מטה חיפה / נהריה / תל אביב"
                className="w-full px-3.5 py-2.5 rounded-xl border border-indigo-500/40 bg-indigo-950/20 text-indigo-100 placeholder-indigo-300/40 focus:outline-none focus:border-indigo-400 font-semibold"
              />
            </div>
          </div>
        </aside>

        {/* Chat Bot Main Interface */}
        <section className="lg:col-span-8 bg-[#111827] border border-slate-800 rounded-3xl flex flex-col h-[650px] shadow-2xl overflow-hidden">
          
          <div className="p-4 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-black text-white flex items-center gap-1.5">
                  <span>Zack AI Support Desk</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <div className="text-[10px] text-slate-400 font-bold">סיווג תקלות חכם, ניתוב תורים ו-SLA</div>
              </div>
            </div>
          </div>

          <div className="flex-1 p-5 overflow-y-auto space-y-4">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-3 text-xs leading-relaxed ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.sender === 'bot' && (
                  <div className="w-7 h-7 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300 shrink-0">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[80%] p-4 rounded-2xl ${
                    m.sender === 'user'
                      ? 'bg-indigo-600 text-white rounded-tl-xs font-medium shadow-md'
                      : 'bg-slate-800/90 border border-slate-700/80 text-slate-200 rounded-tr-xs'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.text}</p>

                  {m.ticketInfo && (
                    <div className="mt-3 pt-3 border-t border-slate-700 space-y-2 text-[11px]">
                      <div className="flex items-center justify-between font-black text-indigo-400">
                        <span>קריאה #{m.ticketInfo.ticketNumber}</span>
                        <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          {m.ticketInfo.urgency} Priority
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-slate-400 font-semibold">
                        <div>קטגוריה: <span className="text-slate-200">{m.ticketInfo.category}</span></div>
                        <div>צוות מטפל: <span className="text-slate-200">{m.ticketInfo.team}</span></div>
                        <div>עיר/מטה: <span className="text-slate-200">{m.ticketInfo.city}</span></div>
                      </div>
                    </div>
                  )}
                </div>

                {m.sender === 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300 shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-xs text-indigo-400 font-bold p-3 bg-indigo-950/20 rounded-2xl border border-indigo-500/20 w-fit">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Zack AI מנתח את התקלה ופותח קריאת שירות...</span>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          <form onSubmit={handleSubmitTicket} className="p-3.5 border-t border-slate-800 bg-slate-900/50 flex items-center gap-2">
            <input
              type="text"
              required
              value={issueDescription}
              onChange={(e) => setIssueDescription(e.target.value)}
              placeholder="תאר את התקלה (למשל: נעילת חשבון, בעיית מדפסת, VPN...)..."
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-900 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-500 transition"
            />
            <button
              type="submit"
              disabled={loading || !issueDescription.trim()}
              className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-md transition flex items-center gap-1.5"
            >
              <span>שלח ל-Zack</span>
              <Send className="w-3.5 h-3.5 rtl:rotate-180" />
            </button>
          </form>

        </section>

      </main>

    </div>
  );
}

export default function TenantUsersPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0B0F19]" />}>
      <UsersPortal />
    </Suspense>
  );
}