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
  MapPin,
  Phone,
  Copy
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
  'Spilled coffee on laptop keyboard',
  'Cannot connect to corporate VPN from home',
  'Need access permission for shared directory',
  'External monitor is flickering with lines'
];

function SelfServiceContent() {
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
      content: 'Hi! I am Zack from SmartQ. Describe your IT issue or request and I will automatically structure and route your ticket.',
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

      const matchCookie = document.cookie
        .split('; ')
        .find((row) => row.startsWith('smartq_session='));

      if (matchCookie) {
        try {
          const rawVal = matchCookie.split('=')[1];
          const decoded = JSON.parse(atob(rawVal));
          if (decoded.email) {
            const resolvedName = decoded.name || decoded.email.split('@')[0];
            const resolvedCity = decoded.city || 'Headquarters';
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

      if (!res.ok) throw new Error('Communication error with Zack AI');
      const data = await res.json();

      setFormData((prev) => {
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
          user_city: data.user_city || prev.user_city || currentUser?.dept || 'Headquarters',
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
            content: 'I have populated the ticket details below. Scrolling down for your final confirmation.',
            isStreaming: true 
          }
        ]);

        setTimeout(() => {
          formSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 1000);
      }
    } catch (err: any) {
      setFeedbackMsg({ text: err.message || 'Error processing request', type: 'error' });
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFeedbackMsg(null);

    const generated6Digits = Math.floor(100000 + Math.random() * 900000).toString();
    const finalReporterName = formData.reporter_name || currentUser?.name || 'Enterprise Employee';
    const finalReporterEmail = formData.reporter_email || currentUser?.email || `user@${tenantSlug}.com`;

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
          user_city: formData.user_city || 'Headquarters',
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
        { id: 'done-' + Date.now(), role: 'assistant', content: `Ticket #${finalTicketNum} was created successfully! Anything else I can assist with?`, isStreaming: true }
      ]);
      fetchTickets();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setFeedbackMsg({ text: 'Error saving ticket: ' + err.message, type: 'error' });
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

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans antialiased">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9 rounded-xl overflow-hidden shadow-md flex items-center justify-center bg-white border border-slate-100">
              <Image src="/smartq-logo.png" alt="SmartQ" width={36} height={36} className="object-contain" priority />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black tracking-tight text-slate-900">SmartQ</span>
                <span className="px-2 py-0.5 text-[10px] font-extrabold text-white bg-indigo-600 rounded-md uppercase">
                  SELF-SERVICE
                </span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-slate-500 font-bold">
                <Building2 className="w-3 h-3 text-indigo-600" />
                <span>{tenant?.name || rawTenant}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {currentUser ? (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-emerald-800 text-xs font-black">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>{currentUser.name}</span>
              </div>
            ) : (
              <a
                href={`/${rawTenant}/login`}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-800 transition"
              >
                <LogIn className="w-3.5 h-3.5 text-indigo-600" />
                <span>Sign In</span>
              </a>
            )}

            <button 
              onClick={fetchTickets}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingTickets ? 'animate-spin text-indigo-600' : ''}`} />
              Refresh
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
              className="text-[11px] font-bold px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-indigo-50 hover:border-indigo-300 text-slate-700 hover:text-indigo-700 transition shadow-2xs flex items-center gap-1.5"
            >
              <Zap className="w-3 h-3 text-indigo-600" />
              {prompt}
            </button>
          ))}
        </div>

        {/* Zack Chat Interface */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden flex flex-col h-[480px]">
          <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow-md font-black text-xs">
                Z
              </div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-slate-900">Zack AI Support Agent</h3>
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
              </div>
            </div>

            {isReadyForReview && (
              <button
                type="button"
                onClick={() => formSectionRef.current?.scrollIntoView({ behavior: 'smooth' })}
                className="flex items-center gap-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-1 rounded-lg transition"
              >
                <span>Ready for Review</span>
                <ArrowDown className="w-3 h-3" />
              </button>
            )}
          </div>

          <div ref={chatMessagesContainerRef} className="flex-1 p-5 overflow-y-auto space-y-4 bg-slate-50/40">
            {messages.map((m) => (
              <div key={m.id} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-black shadow-2xs ${
                  m.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-white'
                }`}>
                  {m.role === 'user' ? <User className="w-3.5 h-3.5" /> : 'Z'}
                </div>
                <div className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed max-w-[85%] shadow-2xs font-medium ${
                  m.role === 'user' 
                    ? 'bg-indigo-600 text-white rounded-br-none' 
                    : 'bg-white text-slate-900 rounded-bl-none border border-slate-200'
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
              <div className="flex items-center gap-3 text-xs p-2.5 rounded-2xl w-fit border text-indigo-800 bg-indigo-50 border-indigo-100 font-bold">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" />
                </div>
                <span>Zack is analyzing your request...</span>
              </div>
            )}
          </div>

          <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="p-3 border-t border-slate-200 bg-white flex gap-2">
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Describe your IT request or problem to Zack..."
              className="flex-1 px-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 bg-slate-50 text-slate-900 focus:outline-none focus:border-indigo-600"
            />
            <button
              type="submit"
              disabled={isAiLoading || !userInput.trim()}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl font-bold text-xs sm:text-sm transition shadow-sm flex items-center justify-center gap-1.5"
            >
              <span>Send</span>
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

        <div className="p-6 sm:p-8 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-900">
                Ticket Details Confirmation ({tenant?.name || rawTenant})
              </h2>
            </div>
            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full">
              Verified by Zack
            </span>
          </div>

          <form onSubmit={handleSubmitTicket} className="space-y-4 text-xs font-bold">
            <div>
              <label className="block mb-1.5 text-slate-800">Ticket Subject / Title *</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Brief summary of the issue..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 focus:outline-none focus:border-indigo-600 font-semibold"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block mb-1.5 text-slate-800">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 font-bold focus:outline-none focus:border-indigo-600"
                >
                  <option value="Hardware">Hardware (Laptops, Monitors, Peripherals)</option>
                  <option value="Software & SaaS">Software & SaaS (Office, Zoom, Slack)</option>
                  <option value="Network & Connectivity">Network & VPN</option>
                  <option value="Access & IAM">Access & Identity (IAM)</option>
                  <option value="Cloud & Infrastructure">Cloud & Infrastructure</option>
                  <option value="Cyber Security">Cyber Security</option>
                  <option value="Workstation & Peripherals">Workstation & Peripherals</option>
                  <option value="Database & BI">Database & BI</option>
                  <option value="General IT Request">General IT Request</option>
                </select>
              </div>

              <div>
                <label className="block mb-1.5 text-slate-800">SLA Urgency</label>
                <select
                  value={formData.urgency}
                  onChange={(e) => setFormData({ ...formData, urgency: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 font-bold focus:outline-none focus:border-indigo-600"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block mb-1.5 text-slate-800">System Impacted</label>
                <input
                  type="text"
                  value={formData.system_impacted}
                  onChange={(e) => setFormData({ ...formData, system_impacted: e.target.value })}
                  placeholder="e.g. Laptop, VPN Client, SAP, Email..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 focus:outline-none focus:border-indigo-600 font-semibold"
                />
              </div>

              <div>
                <label className="block mb-1.5 text-slate-800">Assigned IT Team</label>
                <select
                  value={formData.assigned_team}
                  onChange={(e) => setFormData({ ...formData, assigned_team: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 font-bold focus:outline-none focus:border-indigo-600"
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
                <label className="block mb-1.5 text-slate-800">Location / Headquarters</label>
                <input
                  type="text"
                  value={formData.user_city}
                  onChange={(e) => setFormData({ ...formData, user_city: e.target.value })}
                  placeholder="e.g. Haifa HQ / Tel Aviv Campus"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 focus:outline-none focus:border-indigo-600 font-semibold"
                />
              </div>

              <div>
                <label className="block mb-1.5 text-slate-800">Contact Phone / Extension</label>
                <input
                  type="tel"
                  value={formData.user_phone}
                  onChange={(e) => setFormData({ ...formData, user_phone: e.target.value })}
                  placeholder="050-0000000"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 focus:outline-none focus:border-indigo-600 font-semibold font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block mb-1.5 text-slate-800">Detailed Description *</label>
              <textarea
                required
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Detailed explanation of what occurred..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 focus:outline-none focus:border-indigo-600 font-medium leading-relaxed"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block mb-1.5 text-slate-800">Reporter Full Name</label>
                <input
                  type="text"
                  value={formData.reporter_name}
                  onChange={(e) => setFormData({ ...formData, reporter_name: e.target.value })}
                  placeholder="Full Name"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 focus:outline-none focus:border-indigo-600 font-semibold"
                />
              </div>
              <div>
                <label className="block mb-1.5 text-slate-800">Reporter Work Email</label>
                <input
                  type="email"
                  value={formData.reporter_email}
                  onChange={(e) => setFormData({ ...formData, reporter_email: e.target.value })}
                  placeholder="name@company.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 focus:outline-none focus:border-indigo-600 font-semibold font-mono"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting || !formData.title.trim()}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl text-xs sm:text-sm font-black shadow-md transition flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>{isSubmitting ? 'Submitting Ticket...' : 'Dispatch Ticket to SmartQ'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Active Tickets */}
        <section className="p-6 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-900">Active Organization Tickets ({tickets.length})</h2>
            </div>
            <span className="text-xs text-slate-400 font-bold">Real-time status</span>
          </div>

          {isLoadingTickets ? (
            <div className="py-8 text-center text-xs text-slate-500 font-bold">
              <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2 text-indigo-600" />
              Loading tickets...
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500 font-bold">
              No open tickets found for this organization.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {tickets.map((t) => (
                <div key={t.id} className="p-4 border border-slate-200 rounded-xl bg-slate-50/60 hover:bg-white transition space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono font-black text-indigo-600 text-xs mr-2">
                        #{t.ticket_number || t.id.slice(0, 6)}
                      </span>
                      <h3 className="text-xs font-bold inline text-slate-900">{t.title}</h3>
                    </div>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-md border bg-slate-100 text-slate-800 border-slate-300">
                      {t.urgency}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed font-medium">
                    {t.description}
                  </p>

                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500 font-bold">
                    <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-200">
                      {t.assigned_team || 'Helpdesk Tier 1'}
                    </span>
                    <span className="flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {new Date(t.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
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
          <div className="w-full max-w-md rounded-3xl p-7 space-y-6 text-center border border-slate-200 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 border border-emerald-300 text-emerald-700 flex items-center justify-center mx-auto shadow-md">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-black text-slate-900">Ticket Created Successfully!</h3>
              <p className="text-xs text-slate-500 font-medium">Your request has been classified and routed to the designated IT team.</p>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
              <span className="text-[11px] font-bold text-slate-500">Tracking Ticket Reference ID</span>
              <div className="flex items-center justify-center gap-2">
                <span className="text-2xl font-black font-mono tracking-wider text-indigo-600">
                  #{createdTicketNumber}
                </span>
                <button
                  type="button"
                  onClick={copyTicketNumber}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 transition"
                  title="Copy Reference ID"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setCreatedTicketNumber(null)}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-md transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

export default function SelfServicePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F8FAFC]" />}>
      <SelfServiceContent />
    </Suspense>
  );
}