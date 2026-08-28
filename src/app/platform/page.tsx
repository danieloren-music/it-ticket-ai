'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabaseClient';
import { 
  Building2, 
  Plus, 
  Layers, 
  ExternalLink, 
  ShieldCheck, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  TrendingUp,
  Globe,
  Mail,
  Copy,
  Check
} from 'lucide-react';

interface Tenant {
  id: string;
  name: string;
  domain: string;
  admin_email: string;
  saml_login_url?: string;
  saml_cert?: string;
  created_at: string;
}

interface Ticket {
  id: string;
  tenant_id: string;
  title: string;
  urgency: string;
  status: string;
  created_at: string;
}

export default function SuperAdminPlatform() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  const [newTenant, setNewTenant] = useState({
    id: '',
    name: '',
    domain: '',
    admin_email: '',
    saml_login_url: '',
    saml_cert: '',
  });

  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tenantsRes, ticketsRes] = await Promise.all([
        supabase.from('tenants').select('*').order('created_at', { ascending: false }),
        supabase.from('tickets').select('id, tenant_id, title, urgency, status, created_at')
      ]);

      if (tenantsRes.error) throw tenantsRes.error;
      if (ticketsRes.error) throw ticketsRes.error;

      setTenants(tenantsRes.data || []);
      setTickets(ticketsRes.data || []);
    } catch (err: any) {
      setFeedback({ text: 'שגיאה בטעינת נתונים: ' + err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setFeedback(null);

    const slug = newTenant.id.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (!slug) {
      setFeedback({ text: 'מזהה ה-Slug חייב להכיל אותיות באנגלית ומספרים בלבד', type: 'error' });
      setIsCreating(false);
      return;
    }

    try {
      const { error } = await supabase.from('tenants').insert([
        {
          id: slug,
          name: newTenant.name.trim(),
          domain: newTenant.domain.trim(),
          admin_email: newTenant.admin_email.trim(),
          saml_login_url: newTenant.saml_login_url.trim() || null,
          saml_cert: newTenant.saml_cert.trim() || null,
        }
      ]);

      if (error) throw error;

      setFeedback({ text: `ארגון ${newTenant.name} הוקם בהצלחה עם ה-Slug: /${slug}`, type: 'success' });
      setNewTenant({
        id: '',
        name: '',
        domain: '',
        admin_email: '',
        saml_login_url: '',
        saml_cert: '',
      });
      fetchData();
    } catch (err: any) {
      setFeedback({ text: 'שגיאה ביצירת ארגון: ' + err.message, type: 'error' });
    } finally {
      setIsCreating(false);
    }
  };

  const copyToClipboard = (text: string, slug: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  return (
    <div dir="rtl" className="min-h-screen bg-[#090D16] text-slate-100 font-sans antialiased">
      {/* Platform Header */}
      <header className="border-b border-slate-800/80 bg-[#0E1526]/80 backdrop-blur-md sticky top-0 z-30 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="relative w-9 h-9 rounded-xl overflow-hidden shadow-lg shadow-indigo-500/20 bg-slate-900 flex items-center justify-center">
              <Image src="/smartq-logo.png" alt="SmartQ" width={36} height={36} className="object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black tracking-tight text-white">SmartQ</span>
                <span className="px-2 py-0.5 text-[10px] font-extrabold bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-md uppercase">
                  SUPER ADMIN CORE
                </span>
              </div>
              <p className="text-[11px] text-slate-400">ניהול סביבות לקוחות, Multi-Tenancy ואינטגרציות SSO</p>
            </div>
          </div>

          <button
            onClick={fetchData}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold border border-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
            <span>רענון מערכת</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-8">
        {/* KPI Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[#0E1526] border border-slate-800/80 p-5 rounded-2xl">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold">ארגונים רשומים בפלטפורמה</span>
              <Building2 className="w-5 h-5 text-indigo-400" />
            </div>
            <p className="text-3xl font-black text-white">{tenants.length}</p>
            <span className="text-[11px] text-slate-400">סביבות מבודדות (Tenants)</span>
          </div>

          <div className="bg-[#0E1526] border border-slate-800/80 p-5 rounded-2xl">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold">סך קריאות בכלל הלקוחות</span>
              <Layers className="w-5 h-5 text-purple-400" />
            </div>
            <p className="text-3xl font-black text-purple-400">{tickets.length}</p>
            <span className="text-[11px] text-slate-400">קריאות שנפתחו ע״י Rebecca AI</span>
          </div>

          <div className="bg-[#0E1526] border border-slate-800/80 p-5 rounded-2xl">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold">חיבורי SAML פעילים</span>
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <p className="text-3xl font-black text-emerald-400">
              {tenants.filter((t) => t.saml_login_url).length || 1}
            </p>
            <span className="text-[11px] text-slate-400">Entra ID / Okta SSO</span>
          </div>
        </div>

        {feedback && (
          <div className={`p-4 rounded-xl border flex items-center gap-3 text-xs font-semibold ${
            feedback.type === 'success' 
              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' 
              : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
          }`}>
            {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-rose-400" />}
            {feedback.text}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Create New Tenant Form */}
          <div className="lg:col-span-1 bg-[#0E1526] border border-slate-800/80 p-6 rounded-2xl space-y-5 h-fit shadow-xl">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Plus className="w-4 h-4 text-indigo-400" />
              <h2 className="text-sm font-bold text-white">הקמת ארגון חדש (Onboarding)</h2>
            </div>

            <form onSubmit={handleCreateTenant} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">שם הארגון *</label>
                <input
                  type="text"
                  required
                  value={newTenant.name}
                  onChange={(e) => setNewTenant({ ...newTenant, name: e.target.value })}
                  placeholder="לדוגמה: רפאל מערכות לחימה"
                  className="w-full bg-[#090D16] border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-200 placeholder-slate-600 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">מזהה נתיב (Slug באנגלית) *</label>
                <input
                  type="text"
                  required
                  value={newTenant.id}
                  onChange={(e) => setNewTenant({ ...newTenant, id: e.target.value })}
                  placeholder="לדוגמה: rafael"
                  className="w-full bg-[#090D16] border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-200 placeholder-slate-600 focus:border-indigo-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">הנתיב יהיה: /{newTenant.id || 'slug'}</span>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">דומיין אימייל ראשי</label>
                <input
                  type="text"
                  value={newTenant.domain}
                  onChange={(e) => setNewTenant({ ...newTenant, domain: e.target.value })}
                  placeholder="לדוגמה: rafael.co.il"
                  className="w-full bg-[#090D16] border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-200 placeholder-slate-600 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">אימייל מנהל ה-IT</label>
                <input
                  type="email"
                  value={newTenant.admin_email}
                  onChange={(e) => setNewTenant({ ...newTenant, admin_email: e.target.value })}
                  placeholder="it-admin@company.com"
                  className="w-full bg-[#090D16] border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-200 placeholder-slate-600 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 border-t border-slate-800/80">
                <label className="block text-slate-300 font-semibold mb-1">כתובת SAML Login (אופציונלי)</label>
                <input
                  type="url"
                  value={newTenant.saml_login_url}
                  onChange={(e) => setNewTenant({ ...newTenant, saml_login_url: e.target.value })}
                  placeholder="https://login.microsoftonline.com/..."
                  className="w-full bg-[#090D16] border border-slate-800 rounded-xl px-3.5 py-2 text-[11px] text-slate-200 placeholder-slate-600 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isCreating || !newTenant.name || !newTenant.id}
                className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:from-slate-800 disabled:to-slate-800 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition flex items-center justify-center gap-2"
              >
                <Building2 className="w-4 h-4" />
                {isCreating ? 'מקים סביבה...' : 'הקצה סביבת לקוח ב-SmartQ'}
              </button>
            </form>
          </div>

          {/* Existing Tenants Grid */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-sm font-bold text-white">סביבות ארגונים פעילות ({tenants.length})</h2>
              <span className="text-xs text-slate-400">גישה ישירה לממשקי הקצה והניהול</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tenants.map((t) => {
                const tenantTicketCount = tickets.filter((ticket) => ticket.tenant_id === t.id).length;

                return (
                  <div key={t.id} className="bg-[#0E1526] border border-slate-800/80 p-5 rounded-2xl space-y-4 hover:border-slate-700 transition">
                    <div className="flex items-start justify-between">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center font-black text-indigo-400 text-base">
                        {t.name.charAt(0)}
                      </div>
                      <span className="px-2.5 py-0.5 text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
                        פעיל
                      </span>
                    </div>

                    <div>
                      <h3 className="font-bold text-sm text-white">{t.name}</h3>
                      <div className="flex items-center gap-2 text-slate-400 text-xs mt-1">
                        <Globe className="w-3 h-3 text-slate-500" />
                        <span>{t.domain || 'ללא דומיין מוגדר'}</span>
                      </div>
                    </div>

                    <div className="bg-[#090D16] p-3 rounded-xl border border-slate-800/80 space-y-2 text-xs">
                      <div className="flex items-center justify-between text-slate-400">
                        <span>קריאות בסביבה:</span>
                        <strong className="text-white font-semibold">{tenantTicketCount}</strong>
                      </div>
                      <div className="flex items-center justify-between text-slate-400">
                        <span>נתיב URL:</span>
                        <code className="text-indigo-400 font-mono text-[11px]">/{t.id}</code>
                      </div>
                    </div>

                    {/* Quick Access Links */}
                    <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2">
                      <a
                        href={`/${t.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 text-center py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-[11px] font-semibold transition"
                      >
                        פורטל עובדים
                      </a>
                      <a
                        href={`/${t.id}/admin`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 text-center py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-xl text-[11px] font-semibold transition"
                      >
                        דשבורד IT
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}