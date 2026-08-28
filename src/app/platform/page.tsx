'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabaseClient';
import { 
  Building2, 
  Plus, 
  Layers, 
  ShieldCheck, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  TrendingUp,
  Globe,
  Copy,
  Check,
  Key,
  Sun,
  Moon,
  Sparkles,
  BarChart3,
  Activity,
  Trash2,
  Power,
  PauseCircle,
  PlayCircle
} from 'lucide-react';

type ThemeMode = 'light' | 'dark' | 'ai';
type TabKey = 'overview' | 'tenants' | 'api-keys' | 'analytics' | 'security';

interface Tenant {
  id: string;
  name: string;
  domain: string;
  admin_email: string;
  status?: 'active' | 'suspended';
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
  category: string;
  created_at: string;
  reporter_name?: string;
}

interface ApiKey {
  id: string;
  name: string;
  tenant_id: string;
  key_prefix: string;
  created_at: string;
  last_used?: string;
  status: 'active' | 'revoked';
}

export default function SuperAdminPlatform() {
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Form State
  const [newTenant, setNewTenant] = useState({
    id: '',
    name: '',
    domain: '',
    admin_email: '',
    saml_login_url: '',
    saml_cert: '',
  });

  // Mock API Keys Store
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([
    {
      id: 'key-1',
      name: 'IEC Enterprise Sync',
      tenant_id: 'iec',
      key_prefix: 'sq_live_8f93...4a12',
      created_at: new Date().toISOString(),
      last_used: 'לפני 10 דקות',
      status: 'active'
    },
    {
      id: 'key-2',
      name: 'AMS Webhook Integrator',
      tenant_id: 'ams',
      key_prefix: 'sq_live_3c21...99e4',
      created_at: new Date().toISOString(),
      last_used: 'אתמול',
      status: 'active'
    }
  ]);

  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyTenant, setNewKeyTenant] = useState('');
  const [generatedPlainKey, setGeneratedPlainKey] = useState<string | null>(null);

  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tenantsRes, ticketsRes] = await Promise.all([
        supabase.from('tenants').select('*').order('created_at', { ascending: false }),
        supabase.from('tickets').select('*').order('created_at', { ascending: false })
      ]);

      if (tenantsRes.error) throw tenantsRes.error;
      if (ticketsRes.error) throw ticketsRes.error;

      setTenants(tenantsRes.data || []);
      setTickets(ticketsRes.data || []);
    } catch (err: any) {
      setFeedback({ text: 'שגיאה בטעינת נתוני מערכת: ' + err.message, type: 'error' });
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
          status: 'active',
          saml_login_url: newTenant.saml_login_url.trim() || null,
          saml_cert: newTenant.saml_cert.trim() || null,
        }
      ]);

      if (error) throw error;

      setFeedback({ text: `ארגון ${newTenant.name} הוקם בהצלחה עם הכתובת: /${slug}`, type: 'success' });
      setNewTenant({
        id: '',
        name: '',
        domain: '',
        admin_email: '',
        saml_login_url: '',
        saml_cert: '',
      });
      fetchData();
      setActiveTab('tenants');
    } catch (err: any) {
      setFeedback({ text: 'שגיאה ביצירת ארגון: ' + err.message, type: 'error' });
    } finally {
      setIsCreating(false);
    }
  };

  // Toggle Disable / Enable Tenant
  const handleToggleTenantStatus = async (tenantId: string, currentStatus?: string) => {
    const nextStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
    setActionLoadingId(tenantId);
    setFeedback(null);

    try {
      const { error } = await supabase
        .from('tenants')
        .update({ status: nextStatus })
        .eq('id', tenantId);

      if (error) throw error;

      setTenants((prev) =>
        prev.map((t) => (t.id === tenantId ? { ...t, status: nextStatus } : t))
      );
      setFeedback({
        text: `סטטוס הארגון ${tenantId} שונה בהצלחה ל-${nextStatus === 'active' ? 'פעיל' : 'מושעה'}`,
        type: 'success'
      });
    } catch (err: any) {
      setFeedback({ text: 'שגיאה בעדכון סטטוס ארגון: ' + err.message, type: 'error' });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Delete Tenant Permanently
  const handleDeleteTenant = async (tenantId: string, tenantName: string) => {
    const confirmed = window.confirm(`האם אתה בטוח שברצונך למחוק לחלוטין את ארגון "${tenantName}" (/${tenantId})?\nפעולה זו תמחק לצמיתות את כל הקריאות, ההגדרות וההרשאות של הארגון!`);
    if (!confirmed) return;

    setActionLoadingId(tenantId);
    setFeedback(null);

    try {
      const { error } = await supabase
        .from('tenants')
        .delete()
        .eq('id', tenantId);

      if (error) throw error;

      setTenants((prev) => prev.filter((t) => t.id !== tenantId));
      setTickets((prev) => prev.filter((tick) => tick.tenant_id !== tenantId));
      setFeedback({ text: `הארגון "${tenantName}" נמחק לצמיתות מהמערכת`, type: 'success' });
    } catch (err: any) {
      setFeedback({ text: 'שגיאה במחיקת ארגון: ' + err.message, type: 'error' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleGenerateApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim() || !newKeyTenant) return;

    const randomHash = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const fullKey = `sq_live_${randomHash}`;
    const prefix = `${fullKey.substring(0, 11)}...${fullKey.substring(fullKey.length - 4)}`;

    const newKeyObj: ApiKey = {
      id: 'key-' + Date.now(),
      name: newKeyName.trim(),
      tenant_id: newKeyTenant,
      key_prefix: prefix,
      created_at: new Date().toISOString(),
      last_used: 'מעולם לא',
      status: 'active'
    };

    setApiKeys([newKeyObj, ...apiKeys]);
    setGeneratedPlainKey(fullKey);
    setNewKeyName('');
    setFeedback({ text: 'מפתח API נוצר בהצלחה! העתק ושמור אותו במקום בטוח.', type: 'success' });
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const themeBg = {
    light: 'bg-[#F8FAFC] text-slate-900',
    dark: 'bg-[#0B0F19] text-slate-100',
    ai: 'bg-radial-at-t from-[#160B2E] via-[#090D1A] to-[#04060B] text-slate-100'
  };

  const sidebarBg = {
    light: 'bg-white border-slate-200 shadow-sm',
    dark: 'bg-[#0E1424] border-slate-800',
    ai: 'bg-[#0F0A24]/90 border-indigo-500/30 backdrop-blur-xl'
  };

  const cardBg = {
    light: 'bg-white border-slate-200 shadow-sm text-slate-900',
    dark: 'bg-[#111827] border-slate-800 shadow-lg text-slate-100',
    ai: 'bg-[#130D2C]/80 border-indigo-500/40 shadow-xl shadow-indigo-500/10 backdrop-blur-xl text-slate-100'
  };

  const inputBg = {
    light: 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-indigo-600',
    dark: 'bg-[#1F2937] border-slate-700 text-slate-100 placeholder-slate-500 focus:border-indigo-400',
    ai: 'bg-[#1B1439] border-indigo-500/40 text-indigo-100 placeholder-indigo-300/40 focus:border-cyan-400'
  };

  return (
    <div dir="rtl" className={`min-h-screen font-sans antialiased flex flex-col transition-colors duration-300 ${themeBg[theme]}`}>
      {/* Top Header */}
      <header className={`h-16 border-b sticky top-0 z-40 px-6 flex items-center justify-between backdrop-blur-md transition-colors duration-300 ${
        theme === 'light' ? 'bg-white/95 border-slate-200 shadow-2xs' :
        theme === 'dark' ? 'bg-[#0E1424]/95 border-slate-800' :
        'bg-[#0C081D]/90 border-indigo-500/30 shadow-lg shadow-indigo-500/10'
      }`}>
        <div className="flex items-center gap-3.5">
          <div className="relative w-9 h-9 rounded-xl overflow-hidden shadow-md flex items-center justify-center bg-white border border-slate-100">
            <Image src="/smartq-logo.png" alt="SmartQ" width={36} height={36} className="object-contain" priority />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-lg font-black tracking-tight ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>SmartQ</span>
              <span className="px-2 py-0.5 text-[10px] font-extrabold bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-md uppercase">
                SUPER ADMIN
              </span>
            </div>
            <p className={`text-[11px] ${theme === 'light' ? 'text-slate-600 font-medium' : 'text-slate-400'}`}>
              פלטפורמת ניהול סביבות לקוחות, API ו-Multi-Tenancy
            </p>
          </div>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-3">
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

          <button
            onClick={fetchData}
            className={`p-2 rounded-xl border transition ${
              theme === 'light' ? 'text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border-slate-200' : 'text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border-slate-700'
            }`}
            title="רענן נתוני מערכת"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-500' : ''}`} />
          </button>
        </div>
      </header>

      {/* Main Layout with Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className={`w-64 border-l p-4 flex flex-col justify-between shrink-0 hidden md:flex transition-colors duration-300 ${sidebarBg[theme]}`}>
          <div className="space-y-6">
            <div>
              <p className={`text-[10px] font-extrabold uppercase tracking-wider mb-2 px-3 ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                תפריט ניהול ראשי
              </p>
              <nav className="space-y-1">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                    activeTab === 'overview'
                      ? 'bg-indigo-500/10 text-indigo-600 border border-indigo-500/20'
                      : theme === 'light'
                        ? 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Activity className="w-4 h-4" />
                    <span>דשבורד ראשי</span>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('tenants')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                    activeTab === 'tenants'
                      ? 'bg-indigo-500/10 text-indigo-600 border border-indigo-500/20'
                      : theme === 'light'
                        ? 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Building2 className="w-4 h-4" />
                    <span>לקוחות וארגונים</span>
                  </div>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                    theme === 'light' ? 'bg-slate-100 text-slate-800' : 'bg-slate-800 text-slate-300'
                  }`}>
                    {tenants.length}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab('api-keys')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                    activeTab === 'api-keys'
                      ? 'bg-indigo-500/10 text-indigo-600 border border-indigo-500/20'
                      : theme === 'light'
                        ? 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Key className="w-4 h-4" />
                    <span>מפתחות API</span>
                  </div>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                    theme === 'light' ? 'bg-slate-100 text-slate-800' : 'bg-slate-800 text-slate-300'
                  }`}>
                    {apiKeys.length}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab('analytics')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                    activeTab === 'analytics'
                      ? 'bg-indigo-500/10 text-indigo-600 border border-indigo-500/20'
                      : theme === 'light'
                        ? 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>אנליטיקה ו-SLA</span>
                </button>

                <button
                  onClick={() => setActiveTab('security')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                    activeTab === 'security'
                      ? 'bg-indigo-500/10 text-indigo-600 border border-indigo-500/20'
                      : theme === 'light'
                        ? 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>אבטחה ו-SAML</span>
                </button>
              </nav>
            </div>
          </div>

          <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">מערכת פעילה 100%</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <p className="text-[10px] text-slate-500 font-semibold">Supabase & Zack AI אונליין</p>
          </div>
        </aside>

        {/* Dynamic Content View */}
        <main className="flex-1 p-6 overflow-y-auto space-y-6">
          {feedback && (
            <div className={`p-4 rounded-xl border flex items-center gap-3 text-xs font-semibold ${
              feedback.type === 'success' 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800' 
                : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
            }`}>
              {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
              {feedback.text}
            </div>
          )}

          {/* TAB 1: OVERVIEW DASHBOARD */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className={`p-5 rounded-2xl border ${cardBg[theme]}`}>
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                    <span className="text-xs font-bold">ארגונים מחוברים</span>
                    <Building2 className="w-5 h-5 text-indigo-500" />
                  </div>
                  <p className={`text-3xl font-black ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>{tenants.length}</p>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">סביבות מבודדות ב-Multi-Tenant</span>
                </div>

                <div className={`p-5 rounded-2xl border ${cardBg[theme]}`}>
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                    <span className="text-xs font-bold">סך קריאות בכלל הלקוחות</span>
                    <Layers className="w-5 h-5 text-purple-500" />
                  </div>
                  <p className="text-3xl font-black text-purple-600 dark:text-purple-400">{tickets.length}</p>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">טופלו וסונכרנו ע״י Zack AI</span>
                </div>

                <div className={`p-5 rounded-2xl border ${cardBg[theme]}`}>
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                    <span className="text-xs font-bold">קריאות פתוחות כעת</span>
                    <TrendingUp className="w-5 h-5 text-orange-500" />
                  </div>
                  <p className="text-3xl font-black text-orange-600 dark:text-orange-400">
                    {tickets.filter((t) => t.status === 'Open' || !t.status).length}
                  </p>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">ממתינות למענה IT</span>
                </div>

                <div className={`p-5 rounded-2xl border ${cardBg[theme]}`}>
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                    <span className="text-xs font-bold">אינטגרציות API פעילות</span>
                    <Key className="w-5 h-5 text-emerald-500" />
                  </div>
                  <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{apiKeys.length}</p>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Service Integrations</span>
                </div>
              </div>

              {/* Recent Global Tickets Activity */}
              <div className={`p-6 rounded-2xl border space-y-4 ${cardBg[theme]}`}>
                <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <h2 className={`text-sm font-black ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                      פעילות קריאות גלובלית אחרונה
                    </h2>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">זמן אמת מכל הארגונים</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className={`border-b ${theme === 'light' ? 'bg-slate-100/80 text-slate-900 border-slate-300 font-black' : 'text-slate-300 border-slate-800 font-bold'}`}>
                        <th className="py-3 px-3">ארגון (Tenant)</th>
                        <th className="py-3 px-3">נושא הקריאה</th>
                        <th className="py-3 px-3">קטגוריה</th>
                        <th className="py-3 px-3">דחיפות</th>
                        <th className="py-3 px-3">סטטוס</th>
                        <th className="py-3 px-3">תאריך</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${theme === 'light' ? 'divide-slate-200 text-slate-900 font-bold' : 'divide-slate-800 text-slate-100 font-medium'}`}>
                      {tickets.slice(0, 8).map((ticket) => (
                        <tr key={ticket.id} className="hover:bg-indigo-50/60 dark:hover:bg-slate-800/40 transition">
                          <td className="py-3.5 px-3">
                            <span className="font-mono font-black text-indigo-800 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-950/60 px-2.5 py-1 rounded-md border border-indigo-300 dark:border-indigo-800">
                              /{ticket.tenant_id || 'demo'}
                            </span>
                          </td>
                          <td className={`py-3.5 px-3 font-black ${theme === 'light' ? 'text-slate-950' : 'text-white'}`}>{ticket.title}</td>
                          <td className={`py-3.5 px-3 font-bold ${theme === 'light' ? 'text-slate-800' : 'text-slate-300'}`}>{ticket.category}</td>
                          <td className="py-3.5 px-3">
                            <span className={`px-2.5 py-1 rounded-md text-[10px] font-black border ${
                              ticket.urgency === 'Critical' ? 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800' :
                              ticket.urgency === 'High' ? 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-800' :
                              'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-800'
                            }`}>
                              {ticket.urgency}
                            </span>
                          </td>
                          <td className="py-3.5 px-3">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${
                              ticket.status === 'Resolved' ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800' :
                              ticket.status === 'In Progress' ? 'bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-800' :
                              'bg-slate-200 text-slate-900 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                            }`}>
                              {ticket.status || 'Open'}
                            </span>
                          </td>
                          <td className={`py-3.5 px-3 text-[11px] font-bold ${theme === 'light' ? 'text-slate-700' : 'text-slate-400'}`}>
                            {new Date(ticket.created_at).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TENANTS WITH DISABLE & DELETE */}
          {activeTab === 'tenants' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className={`lg:col-span-1 p-6 rounded-2xl border space-y-5 h-fit ${cardBg[theme]}`}>
                <div className="flex items-center gap-2 border-b pb-3 border-slate-200 dark:border-slate-800">
                  <Plus className="w-4 h-4 text-indigo-500" />
                  <h2 className={`text-sm font-bold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                    הקמת ארגון חדש (Onboarding)
                  </h2>
                </div>

                <form onSubmit={handleCreateTenant} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-bold mb-1 text-slate-800 dark:text-slate-200">שם הארגון *</label>
                    <input
                      type="text"
                      required
                      value={newTenant.name}
                      onChange={(e) => setNewTenant({ ...newTenant, name: e.target.value })}
                      placeholder="לדוגמה: רפאל מערכות לחימה"
                      className={`w-full px-3.5 py-2.5 rounded-xl border focus:outline-none transition ${inputBg[theme]}`}
                    />
                  </div>

                  <div>
                    <label className="block font-bold mb-1 text-slate-800 dark:text-slate-200">מזהה נתיב (Slug באנגלית) *</label>
                    <input
                      type="text"
                      required
                      value={newTenant.id}
                      onChange={(e) => setNewTenant({ ...newTenant, id: e.target.value })}
                      placeholder="לדוגמה: rafael"
                      className={`w-full px-3.5 py-2.5 rounded-xl border focus:outline-none transition ${inputBg[theme]}`}
                    />
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block font-medium">הנתיב יהיה: /{newTenant.id || 'slug'}</span>
                  </div>

                  <div>
                    <label className="block font-bold mb-1 text-slate-800 dark:text-slate-200">דומיין אימייל ראשי</label>
                    <input
                      type="text"
                      value={newTenant.domain}
                      onChange={(e) => setNewTenant({ ...newTenant, domain: e.target.value })}
                      placeholder="rafael.co.il"
                      className={`w-full px-3.5 py-2.5 rounded-xl border focus:outline-none transition ${inputBg[theme]}`}
                    />
                  </div>

                  <div>
                    <label className="block font-bold mb-1 text-slate-800 dark:text-slate-200">אימייל מנהל ה-IT</label>
                    <input
                      type="email"
                      value={newTenant.admin_email}
                      onChange={(e) => setNewTenant({ ...newTenant, admin_email: e.target.value })}
                      placeholder="it-admin@company.com"
                      className={`w-full px-3.5 py-2.5 rounded-xl border focus:outline-none transition ${inputBg[theme]}`}
                    />
                  </div>

                  <div>
                    <label className="block font-bold mb-1 text-slate-800 dark:text-slate-200">כתובת SAML SSO (אופציונלי)</label>
                    <input
                      type="url"
                      value={newTenant.saml_login_url}
                      onChange={(e) => setNewTenant({ ...newTenant, saml_login_url: e.target.value })}
                      placeholder="https://login.microsoftonline.com/..."
                      className={`w-full px-3.5 py-2 text-[11px] rounded-xl border focus:outline-none transition ${inputBg[theme]}`}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isCreating || !newTenant.name || !newTenant.id}
                    className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:from-slate-300 disabled:to-slate-300 text-white rounded-xl font-bold shadow-md shadow-indigo-500/20 transition flex items-center justify-center gap-2"
                  >
                    <Building2 className="w-4 h-4" />
                    {isCreating ? 'מקים סביבה...' : 'הקצה סביבת לקוח ב-SmartQ'}
                  </button>
                </form>
              </div>

              {/* Tenants Directory Grid */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
                  <h2 className={`text-sm font-black ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                    סביבות ארגונים פעילות ({tenants.length})
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {tenants.map((t) => {
                    const tenantTicketCount = tickets.filter((ticket) => ticket.tenant_id === t.id).length;
                    const isSuspended = t.status === 'suspended';

                    return (
                      <div key={t.id} className={`p-5 rounded-2xl border space-y-4 transition ${cardBg[theme]} ${isSuspended ? 'opacity-70 border-rose-300 dark:border-rose-900' : ''}`}>
                        <div className="flex items-start justify-between">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-base border ${
                            isSuspended 
                              ? 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400' 
                              : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-700 dark:text-indigo-400'
                          }`}>
                            {t.name.charAt(0)}
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border ${
                              isSuspended
                                ? 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-400'
                                : 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400'
                            }`}>
                              {isSuspended ? 'מושעה (Disabled)' : 'פעיל (Active)'}
                            </span>
                          </div>
                        </div>

                        <div>
                          <h3 className={`font-black text-sm ${theme === 'light' ? 'text-slate-950' : 'text-white'}`}>{t.name}</h3>
                          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-xs mt-1 font-semibold">
                            <Globe className="w-3 h-3 text-slate-500" />
                            <span>{t.domain || 'ללא דומיין מוגדר'}</span>
                          </div>
                        </div>

                        <div className={`p-3 rounded-xl border space-y-1.5 text-xs ${
                          theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
                        }`}>
                          <div className="flex items-center justify-between text-slate-700 dark:text-slate-400 font-bold">
                            <span>קריאות בארגון:</span>
                            <strong className="font-black text-slate-950 dark:text-white">{tenantTicketCount}</strong>
                          </div>
                          <div className="flex items-center justify-between text-slate-700 dark:text-slate-400 font-bold">
                            <span>נתיב ארגון:</span>
                            <code className="text-indigo-700 dark:text-indigo-400 font-mono font-black text-[11px]">/{t.id}</code>
                          </div>
                        </div>

                        {/* Tenant Links */}
                        <div className="pt-2 border-t flex items-center gap-2 border-slate-200 dark:border-slate-800">
                          <a
                            href={`/${t.id}/users`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex-1 text-center py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-200 rounded-xl text-[11px] font-black transition border border-slate-300 dark:border-slate-700"
                          >
                            עובדים
                          </a>
                          <a
                            href={`/${t.id}/admins`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex-1 text-center py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-950/70 text-indigo-800 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800 rounded-xl text-[11px] font-black transition"
                          >
                            טכנאי IT
                          </a>
                          <a
                            href={`/${t.id}/manage`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex-1 text-center py-2 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-950/70 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-800 rounded-xl text-[11px] font-black transition"
                          >
                            ניהול
                          </a>
                        </div>

                        {/* Super Admin Actions: Disable & Delete */}
                        <div className="pt-2 border-t flex items-center gap-2 border-slate-200 dark:border-slate-800">
                          <button
                            type="button"
                            disabled={actionLoadingId === t.id}
                            onClick={() => handleToggleTenantStatus(t.id, t.status)}
                            className={`flex-1 py-1.5 rounded-xl text-[11px] font-black border transition flex items-center justify-center gap-1.5 ${
                              isSuspended
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300'
                                : 'bg-orange-50 text-orange-800 border-orange-300 hover:bg-orange-100 dark:bg-orange-950/40 dark:text-orange-300'
                            }`}
                          >
                            {isSuspended ? <PlayCircle className="w-3.5 h-3.5" /> : <PauseCircle className="w-3.5 h-3.5" />}
                            <span>{isSuspended ? 'הפעל ארגון' : 'השבת (Disable)'}</span>
                          </button>

                          <button
                            type="button"
                            disabled={actionLoadingId === t.id}
                            onClick={() => handleDeleteTenant(t.id, t.name)}
                            className="p-1.5 px-2.5 rounded-xl text-[11px] font-black bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-300 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900 transition flex items-center gap-1"
                            title="מחק ארגון לחלוטין"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>מחק</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: API KEYS */}
          {activeTab === 'api-keys' && (
            <div className="space-y-6">
              <div className={`p-6 rounded-2xl border space-y-4 ${cardBg[theme]}`}>
                <div className="flex items-center gap-2 border-b pb-3 border-slate-200 dark:border-slate-800">
                  <Key className="w-4 h-4 text-indigo-500" />
                  <h2 className={`text-sm font-black ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                    מחולל מפתחות API לאינטגרציות חיצוניות
                  </h2>
                </div>

                <form onSubmit={handleGenerateApiKey} className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block font-bold mb-1 text-slate-800 dark:text-slate-200">שם המפתח / תיאור</label>
                    <input
                      type="text"
                      required
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      placeholder="לדוגמה: ServiceNow Webhook"
                      className={`w-full px-3.5 py-2.5 rounded-xl border focus:outline-none transition ${inputBg[theme]}`}
                    />
                  </div>

                  <div>
                    <label className="block font-bold mb-1 text-slate-800 dark:text-slate-200">שיוך לארגון (Tenant)</label>
                    <select
                      required
                      value={newKeyTenant}
                      onChange={(e) => setNewKeyTenant(e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-xl border font-semibold focus:outline-none transition ${inputBg[theme]}`}
                    >
                      <option value="">בחר ארגון...</option>
                      {tenants.map((t) => (
                        <option key={t.id} value={t.id}>{t.name} (/{t.id})</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-end">
                    <button
                      type="submit"
                      disabled={!newKeyName.trim() || !newKeyTenant}
                      className="w-full py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:from-slate-300 disabled:to-slate-300 text-white rounded-xl font-bold shadow-md shadow-indigo-500/20 transition flex items-center justify-center gap-2"
                    >
                      <Key className="w-4 h-4" />
                      <span>צור מפתח API חדש</span>
                    </button>
                  </div>
                </form>

                {generatedPlainKey && (
                  <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-300 dark:bg-indigo-950/40 dark:border-indigo-800 space-y-2">
                    <p className="text-xs font-bold text-indigo-900 dark:text-indigo-300">
                      המפתח נוצר בהצלחה! שמור אותו עכשיו, הוא לא יוצג שוב:
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-white dark:bg-slate-900 px-3 py-2 rounded-lg text-xs font-mono font-black text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800">
                        {generatedPlainKey}
                      </code>
                      <button
                        onClick={() => copyToClipboard(generatedPlainKey, 'new-key')}
                        className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                      >
                        {copiedKey === 'new-key' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Active API Keys List */}
              <div className={`p-6 rounded-2xl border space-y-4 ${cardBg[theme]}`}>
                <h3 className={`text-sm font-black ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                  מפתחות API פעילים
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className={`border-b ${theme === 'light' ? 'bg-slate-100/80 text-slate-900 border-slate-300 font-black' : 'text-slate-300 border-slate-800 font-bold'}`}>
                        <th className="py-2.5 px-3">שם המפתח</th>
                        <th className="py-2.5 px-3">ארגון משויך</th>
                        <th className="py-2.5 px-3">Key Prefix</th>
                        <th className="py-2.5 px-3">שימוש אחרון</th>
                        <th className="py-2.5 px-3">סטטוס</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${theme === 'light' ? 'divide-slate-200 text-slate-900 font-bold' : 'divide-slate-800 text-slate-100 font-medium'}`}>
                      {apiKeys.map((key) => (
                        <tr key={key.id} className="hover:bg-indigo-50/60 dark:hover:bg-slate-800/40 transition">
                          <td className="py-3 px-3 font-black text-slate-950 dark:text-slate-100">{key.name}</td>
                          <td className="py-3 px-3">
                            <span className="font-mono font-black text-indigo-800 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-300 dark:border-indigo-800">
                              /{key.tenant_id}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-700 dark:text-slate-400 font-bold">{key.key_prefix}</td>
                          <td className="py-3 px-3 text-slate-600 dark:text-slate-400">{key.last_used}</td>
                          <td className="py-3 px-3">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
                              Active
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ANALYTICS */}
          {activeTab === 'analytics' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className={`p-6 rounded-2xl border space-y-2 ${cardBg[theme]}`}>
                <span className="text-xs font-black text-slate-700 dark:text-slate-400">זמן מענה ממוצע לקריאה</span>
                <p className="text-3xl font-black text-indigo-600 dark:text-indigo-400">1.4 שניות</p>
                <p className="text-[11px] text-slate-600 font-bold">פיענוח מלא ע״י Zack AI</p>
              </div>

              <div className={`p-6 rounded-2xl border space-y-2 ${cardBg[theme]}`}>
                <span className="text-xs font-black text-slate-700 dark:text-slate-400">אחוז הסטת פניות אוטומטית</span>
                <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400">84.2%</p>
                <p className="text-[11px] text-slate-600 font-bold">קריאות שסווגו לצוות המדויק ללא מגע יד</p>
              </div>

              <div className={`p-6 rounded-2xl border space-y-2 ${cardBg[theme]}`}>
                <span className="text-xs font-black text-slate-700 dark:text-slate-400">דיוק ניתוח דחיפות SLA</span>
                <p className="text-3xl font-black text-purple-600 dark:text-purple-400">97.8%</p>
                <p className="text-[11px] text-slate-600 font-bold">מבוסס מודל Gemini 2.5 Flash</p>
              </div>
            </div>
          )}

          {/* TAB 5: SECURITY */}
          {activeTab === 'security' && (
            <div className={`p-6 rounded-2xl border space-y-6 ${cardBg[theme]}`}>
              <div className="flex items-center gap-2 border-b pb-3 border-slate-200 dark:border-slate-800">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <h2 className={`text-sm font-black ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                  הגדרות אבטחה, WAF ואימות זהויות ארגוני
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className={`p-4 rounded-xl border space-y-2 ${theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
                  <div className="flex items-center justify-between">
                    <strong className="font-black text-slate-900 dark:text-white">אימות SAML 2.0 / Entra ID</strong>
                    <span className="text-emerald-700 font-black">פעיל</span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-400 text-[11px] font-medium">תמיכה בהתחברות SSO מאוחדת עם אימות דו-שלבי וסנכרון קבוצות הרשאות IT.</p>
                </div>

                <div className={`p-4 rounded-xl border space-y-2 ${theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
                  <div className="flex items-center justify-between">
                    <strong className="font-black text-slate-900 dark:text-white">הגנת WAF ו-Rate Limiting</strong>
                    <span className="text-emerald-700 font-black">מוגן</span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-400 text-[11px] font-medium">חסימת התקפות מניעת שירות (DDoS) והגנה על נקודות הקצה של ה-API.</p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}