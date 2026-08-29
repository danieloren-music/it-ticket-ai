'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabaseClient';
import { 
  Building2, 
  Settings, 
  Clock, 
  Users, 
  Cpu, 
  Bell, 
  ShieldCheck, 
  Save, 
  Check, 
  Plus, 
  Trash2, 
  Sun, 
  Moon, 
  Sparkles, 
  RefreshCw,
  ExternalLink,
  Copy,
  KeyRound,
  LayoutDashboard,
  Plug,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Shield,
  Activity,
  UserCheck,
  FolderLock,
  Layers,
  Search,
  Filter,
  BarChart3,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';

type TabType = 'dashboard' | 'directory' | 'integrations' | 'sla' | 'teams' | 'ai' | 'webhooks';
type ThemeMode = 'light' | 'dark' | 'ai';

interface TenantSettings {
  sso_enabled: boolean;
  sso_provider_type: string;
  idp_entity_id: string;
  saml_login_url: string;
  saml_cert: string;
  saml_group_managers_id: string;
  saml_group_admins_id: string;
  saml_group_users_id: string;
  sla_critical_hours: number;
  sla_high_hours: number;
  sla_medium_hours: number;
  sla_low_hours: number;
  allowed_teams: string[];
  custom_ai_instructions: string;
  notification_webhook_url: string;
}

interface TenantInfo {
  id: string;
  name: string;
  domain: string;
  admin_email: string;
  created_at: string;
}

interface LocalUser {
  id: string;
  name: string;
  email: string;
  role: 'manager' | 'admin' | 'user';
  group: string;
  status: 'active' | 'pending';
}

function EnterpriseManageConsole() {
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [showSsoModal, setShowSsoModal] = useState<boolean>(false);
  const [directorySubTab, setDirectorySubTab] = useState<'users' | 'groups'>('users');
  
  const params = useParams();
  const rawTenant = (params?.tenant as string) || '';
  const tenantSlug = rawTenant.toLowerCase();

  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Directory state
  const [usersList, setUsersList] = useState<LocalUser[]>([
    { id: '1', name: 'מנהל ראשי', email: 'it-admin@company.com', role: 'manager', group: 'IT Leadership', status: 'active' },
    { id: '2', name: 'טכנאי תמיכה', email: 'support@company.com', role: 'admin', group: 'Tier 1 Support', status: 'active' },
  ]);
  const [searchQuery, setSearchQuery] = useState('');

  const [settings, setSettings] = useState<TenantSettings>({
    sso_enabled: false,
    sso_provider_type: 'entra_saml',
    idp_entity_id: '',
    saml_login_url: '',
    saml_cert: '',
    saml_group_managers_id: '',
    saml_group_admins_id: '',
    saml_group_users_id: '',
    sla_critical_hours: 1,
    sla_high_hours: 4,
    sla_medium_hours: 12,
    sla_low_hours: 24,
    allowed_teams: [
      'Helpdesk Tier 1',
      'System & Cloud Team',
      'Network & Security',
      'IT Applications & BI',
      'Identity & Access'
    ],
    custom_ai_instructions: '',
    notification_webhook_url: '',
  });

  const [newTeamName, setNewTeamName] = useState('');

  const spEntityId = 'https://it-ticket-ai-beige.vercel.app/api/auth/saml/metadata';
  const spAcsUrl = 'https://it-ticket-ai-beige.vercel.app/api/auth/saml/callback';

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const fetchData = async () => {
    if (!tenantSlug) return;
    setLoading(true);
    try {
      const [tenantRes, settingsRes] = await Promise.all([
        supabase.from('tenants').select('*').ilike('id', tenantSlug).single(),
        supabase.from('tenant_settings').select('*').ilike('tenant_id', tenantSlug).single()
      ]);

      if (tenantRes.data) {
        setTenant(tenantRes.data);
        if (tenantRes.data.admin_email) {
          setUsersList((prev) => [
            { id: '1', name: tenantRes.data.name + ' Admin', email: tenantRes.data.admin_email, role: 'manager', group: 'Security Principals', status: 'active' },
            ...prev.slice(1)
          ]);
        }
      }

      if (settingsRes.data) {
        setSettings({
          sso_enabled: settingsRes.data.sso_enabled ?? (!!settingsRes.data.saml_login_url),
          sso_provider_type: settingsRes.data.sso_provider_type ?? 'entra_saml',
          idp_entity_id: settingsRes.data.idp_entity_id ?? '',
          saml_login_url: settingsRes.data.saml_login_url ?? '',
          saml_cert: settingsRes.data.saml_cert ?? '',
          saml_group_managers_id: settingsRes.data.saml_group_managers_id ?? '',
          saml_group_admins_id: settingsRes.data.saml_group_admins_id ?? '',
          saml_group_users_id: settingsRes.data.saml_group_users_id ?? '',
          sla_critical_hours: settingsRes.data.sla_critical_hours ?? 1,
          sla_high_hours: settingsRes.data.sla_high_hours ?? 4,
          sla_medium_hours: settingsRes.data.sla_medium_hours ?? 12,
          sla_low_hours: settingsRes.data.sla_low_hours ?? 24,
          allowed_teams: settingsRes.data.allowed_teams ?? settings.allowed_teams,
          custom_ai_instructions: settingsRes.data.custom_ai_instructions ?? '',
          notification_webhook_url: settingsRes.data.notification_webhook_url ?? '',
        });
      }
    } catch (err: any) {
      console.error('Error loading settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [tenantSlug]);

  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);

    try {
      const canonicalId = tenant?.id || tenantSlug;
      const { error } = await supabase.from('tenant_settings').upsert({
        tenant_id: canonicalId,
        ...settings,
        updated_at: new Date().toISOString()
      }, { onConflict: 'tenant_id' });

      if (error) throw error;

      await supabase.from('tenants').update({
        saml_login_url: settings.saml_login_url.trim() || null,
        saml_cert: settings.saml_cert.trim() || null,
      }).eq('id', canonicalId);

      setSaveSuccess(true);
      setShowSsoModal(false);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert('שגיאה בשמירת הגדרות: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddTeam = () => {
    if (!newTeamName.trim() || settings.allowed_teams.includes(newTeamName.trim())) return;
    setSettings({
      ...settings,
      allowed_teams: [...settings.allowed_teams, newTeamName.trim()]
    });
    setNewTeamName('');
  };

  const handleRemoveTeam = (teamToRemove: string) => {
    setSettings({
      ...settings,
      allowed_teams: settings.allowed_teams.filter((t) => t !== teamToRemove)
    });
  };

  const themeBg = {
    light: 'bg-[#F8FAFC] text-slate-900',
    dark: 'bg-[#0B0F19] text-slate-100',
    ai: 'bg-radial-at-t from-[#160B2E] via-[#090D1A] to-[#04060B] text-slate-100'
  };

  const cardBg = {
    light: 'bg-white border-slate-200 shadow-xs text-slate-900',
    dark: 'bg-[#111827] border-slate-800 shadow-lg text-slate-100',
    ai: 'bg-[#130D2C]/90 border-indigo-500/40 shadow-xl text-slate-100'
  };

  const inputBg = {
    light: 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600',
    dark: 'bg-[#1F2937] border-slate-700 text-slate-100 placeholder-slate-500 focus:border-indigo-400',
    ai: 'bg-[#1B1439] border-indigo-500/40 text-indigo-100 placeholder-indigo-300/40 focus:border-cyan-400'
  };

  const sidebarBg = {
    light: 'bg-white border-slate-200 shadow-xs',
    dark: 'bg-[#111827] border-slate-800',
    ai: 'bg-[#100B26]/90 border-indigo-500/30'
  };

  return (
    <div dir="rtl" className={`min-h-screen font-sans antialiased flex flex-col transition-colors duration-300 ${themeBg[theme]}`}>
      
      {/* Top Navigation Bar */}
      <header className={`h-16 border-b sticky top-0 z-30 px-6 flex items-center justify-between backdrop-blur-md transition-colors duration-300 ${
        theme === 'light' ? 'bg-white/95 border-slate-200 shadow-2xs' :
        theme === 'dark' ? 'bg-[#0E1424]/95 border-slate-800' :
        'bg-[#0C081D]/90 border-indigo-500/30'
      }`}>
        <div className="flex items-center gap-3.5">
          <div className="relative w-9 h-9 rounded-xl overflow-hidden shadow-md flex items-center justify-center bg-white border border-slate-100">
            <Image src="/smartq-logo.png" alt="SmartQ" width={36} height={36} className="object-contain" priority />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-base font-black tracking-tight ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>SmartQ Identity & Ops</span>
              <span className="px-2 py-0.5 text-[10px] font-extrabold bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20 rounded-md">
                ADMIN CONSOLE
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400 font-bold">
              <Building2 className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
              <span>{tenant?.name || rawTenant}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href={`/${tenant?.id || rawTenant}/admins`}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-black text-slate-800 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 rounded-xl border border-slate-300 dark:border-slate-700 transition"
          >
            <span>תור קריאות IT</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          {/* Theme Switcher */}
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
            title="רענן נתונים"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-500' : ''}`} />
          </button>
        </div>
      </header>

      {/* Main Framework Layout */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Okta-Style Sidebar */}
        <aside className={`lg:col-span-3 rounded-2xl border p-3 space-y-1.5 sticky top-22 ${sidebarBg[theme]}`}>
          <div className="px-3 py-2 text-[11px] font-black text-slate-500 uppercase tracking-wider">
            מרכז שליטה ובקרה
          </div>

          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'dashboard'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>דשבורד ואנליטיקות</span>
          </button>

          <button
            onClick={() => setActiveTab('integrations')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'integrations'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Plug className="w-4 h-4" />
              <span>Applications & SSO</span>
            </div>
            {settings.sso_enabled && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-emerald-300" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('directory')}
            className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'directory'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Directory (משתמשים וקבוצות)</span>
          </button>

          <div className="px-3 pt-3 pb-1 text-[11px] font-black text-slate-500 uppercase tracking-wider">
            תצורת מערכת
          </div>

          <button
            onClick={() => setActiveTab('sla')}
            className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'sla'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>מדיניות SLA ויעדים</span>
          </button>

          <button
            onClick={() => setActiveTab('teams')}
            className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'teams'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>צוותי תמיכה וניתוב</span>
          </button>

          <button
            onClick={() => setActiveTab('ai')}
            className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'ai'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>הנחיות Zack AI</span>
          </button>

          <button
            onClick={() => setActiveTab('webhooks')}
            className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'webhooks'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>התרעות ו-Webhooks</span>
          </button>
        </aside>

        {/* Content View */}
        <main className="lg:col-span-9 space-y-6">
          
          {/* Header Action Banner */}
          <div className={`p-5 rounded-2xl border flex items-center justify-between ${cardBg[theme]}`}>
            <div>
              <h1 className="text-base font-black">
                {activeTab === 'dashboard' && `דשבורד ואנליטיקות פעילות - ${tenant?.name || rawTenant}`}
                {activeTab === 'directory' && 'ניהול משתמשים, תפקידים וקבוצות (Directory)'}
                {activeTab === 'integrations' && 'מרכז אינטגרציות וספקי זהויות (Applications & SSO)'}
                {activeTab === 'sla' && 'מדיניות זמני מענה (SLA Target Policies)'}
                {activeTab === 'teams' && 'ניהול צוותים מטפלים מורשים'}
                {activeTab === 'ai' && 'הנחיות וידע מותאם אישית ל-Zack AI'}
                {activeTab === 'webhooks' && 'חיבורי Webhook להתרעות'}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                ניהול זהויות, בקרת גישה (RBAC) ותפעול שוטף
              </p>
            </div>

            <div className="flex items-center gap-3">
              {saveSuccess && (
                <span className="text-xs font-black text-emerald-700 bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 px-3.5 py-1.5 rounded-xl border border-emerald-300 flex items-center gap-1.5">
                  <Check className="w-4 h-4" />
                  השינויים נשמרו!
                </span>
              )}
              {activeTab !== 'integrations' && activeTab !== 'dashboard' && activeTab !== 'directory' && (
                <button
                  type="button"
                  onClick={() => handleSaveSettings()}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl text-xs font-black shadow-md transition"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'שומר...' : 'שמור שינויים'}</span>
                </button>
              )}
            </div>
          </div>

          {/* TAB 1: Enterprise Dashboard & Analytics */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              
              {/* Metric KPI Widgets */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className={`p-4 rounded-2xl border ${cardBg[theme]}`}>
                  <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1.5">
                    <span>סטטוס אימות SSO</span>
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="text-sm font-black">
                    {settings.sso_enabled ? (
                      <span className="text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Entra ID SAML
                      </span>
                    ) : (
                      <span className="text-slate-500">כניסה מקומית</span>
                    )}
                  </div>
                </div>

                <div className={`p-4 rounded-2xl border ${cardBg[theme]}`}>
                  <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1.5">
                    <span>משתמשים פעילים</span>
                    <Users className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="text-lg font-black text-slate-900 dark:text-white">
                    {usersList.length} רשומים
                  </div>
                </div>

                <div className={`p-4 rounded-2xl border ${cardBg[theme]}`}>
                  <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1.5">
                    <span>עמידה ביעד SLA</span>
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-lg font-black text-emerald-600">
                    98.4%
                  </div>
                </div>

                <div className={`p-4 rounded-2xl border ${cardBg[theme]}`}>
                  <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1.5">
                    <span>זמן פתרון ממוצע</span>
                    <Clock className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="text-lg font-black text-indigo-600">
                    42 דקות
                  </div>
                </div>
              </div>

              {/* Analytics & Activity Graph Panel */}
              <div className={`p-6 rounded-2xl border space-y-4 ${cardBg[theme]}`}>
                <div className="flex items-center justify-between border-b pb-3">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-indigo-600" />
                    <h3 className="text-xs font-black">התפלגות קריאות שירות וביצועי צוותים</h3>
                  </div>
                  <span className="text-[11px] font-bold text-slate-400">30 ימים אחרונים</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border space-y-2">
                    <div className="text-[11px] font-bold text-slate-500">Tier 1 Helpdesk</div>
                    <div className="text-xl font-black text-indigo-600">142 פניות</div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-indigo-600 h-full w-[70%]" />
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border space-y-2">
                    <div className="text-[11px] font-bold text-slate-500">System & Cloud Ops</div>
                    <div className="text-xl font-black text-purple-600">58 פניות</div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-purple-600 h-full w-[40%]" />
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border space-y-2">
                    <div className="text-[11px] font-bold text-slate-500">Network & Identity</div>
                    <div className="text-xl font-black text-emerald-600">29 פניות</div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-emerald-600 h-full w-[25%]" />
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: Directory (Users & Groups) */}
          {activeTab === 'directory' && (
            <div className={`p-6 rounded-2xl border space-y-5 ${cardBg[theme]}`}>
              <div className="flex items-center justify-between border-b pb-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setDirectorySubTab('users')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition ${
                      directorySubTab === 'users' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    משתמשים (Users)
                  </button>
                  <button
                    onClick={() => setDirectorySubTab('groups')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition ${
                      directorySubTab === 'groups' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    קבוצות אבטחה (Groups)
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute right-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="חפש משתמש או אימייל..."
                      className={`pr-8 pl-3 py-1.5 text-xs rounded-xl border ${inputBg[theme]}`}
                    />
                  </div>
                </div>
              </div>

              {/* Users Table */}
              {directorySubTab === 'users' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 font-black">
                        <th className="py-2.5 px-3">שם משתמש</th>
                        <th className="py-2.5 px-3">כתובת אימייל</th>
                        <th className="py-2.5 px-3">תפקיד במערכת (Role)</th>
                        <th className="py-2.5 px-3">שיוך קבוצתי</th>
                        <th className="py-2.5 px-3">סטטוס</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-semibold">
                      {usersList.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                          <td className="py-3 px-3 font-black text-slate-900 dark:text-white">{u.name}</td>
                          <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-300">{u.email}</td>
                          <td className="py-3 px-3">
                            <span className={`px-2.5 py-1 rounded-md text-[10px] font-black ${
                              u.role === 'manager' 
                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-300' 
                                : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-300'
                            }`}>
                              {u.role.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-500">{u.group}</td>
                          <td className="py-3 px-3">
                            <span className="flex items-center gap-1 text-emerald-600 text-[11px] font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Groups Table */}
              {directorySubTab === 'groups' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/40 dark:bg-purple-950/20 dark:border-purple-900/40 space-y-2">
                    <div className="font-black text-purple-900 dark:text-purple-300">SmartQ-Managers</div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">שליטה מלאה בקונסולת הניהול, אינטגרציות SSO והגדרות אבטחה.</p>
                    <span className="text-[10px] font-mono text-slate-400 block pt-1">מיפוי: Entra Group Object ID</span>
                  </div>

                  <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/40 dark:bg-indigo-950/20 dark:border-indigo-900/40 space-y-2">
                    <div className="font-black text-indigo-900 dark:text-indigo-300">SmartQ-Admins</div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">גישה לתור קריאות שירות וטיפול בפניות טכנולוגיות.</p>
                    <span className="text-[10px] font-mono text-slate-400 block pt-1">מיפוי: Entra Group Object ID</span>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 dark:bg-slate-800/40 dark:border-slate-700 space-y-2">
                    <div className="font-black text-slate-900 dark:text-white">SmartQ-Users</div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">גישה לפורטל פתיחת קריאות שירות עבור כלל עובדי החברה.</p>
                    <span className="text-[10px] font-mono text-slate-400 block pt-1">מיפוי: All Employees / Group ID</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Integrations & SSO Suite (Okta Style) */}
          {activeTab === 'integrations' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-black text-slate-900 dark:text-white">אינטגרציות אבטחה וספקי זהויות (Identity Providers)</h2>
                  <p className="text-xs text-slate-500 font-medium">חיבור סביבת הארגון ל-Microsoft Entra ID, Okta ופרוטוקול SAML 2.0</p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowSsoModal(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-md shadow-indigo-600/20 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ הוסף / הגדר אינטגרציית SSO</span>
                </button>
              </div>

              {/* Integrations Catalog */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Entra Card */}
                <div className={`p-6 rounded-2xl border flex flex-col justify-between ${cardBg[theme]}`}>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border flex items-center justify-center">
                          <svg className="w-5 h-5" viewBox="0 0 23 23">
                            <path fill="#f35325" d="M1 1h10v10H1z"/>
                            <path fill="#81bc06" d="M12 1h10v10H12z"/>
                            <path fill="#05a6f0" d="M1 12h10v10H1z"/>
                            <path fill="#ffba08" d="M12 12h10v10H12z"/>
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-xs font-black text-slate-900 dark:text-white">Microsoft Entra ID (Azure AD)</h3>
                          <span className="text-[10px] text-slate-400 font-bold">SAML 2.0 Enterprise Application</span>
                        </div>
                      </div>

                      {settings.sso_enabled ? (
                        <span className="px-2.5 py-1 text-[10px] font-black rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300">
                          פעיל ומחובר
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 text-[10px] font-black rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-300">
                          לא מוגדר
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-500 font-medium leading-relaxed">
                      אימות משתמשים וטכנאים בחשבון Office 365 עם סנכרון הרשאות אוטומטי מבוסס Security Groups.
                    </p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400">
                      {settings.saml_login_url ? 'הוגדרו מזהי קבוצות ו-URL' : 'טרם הוזנו פרטים'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowSsoModal(true)}
                      className="px-3.5 py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl transition"
                    >
                      {settings.sso_enabled ? 'ערוך הגדרות אינטגרציה' : 'הגדר אינטגרציה זו'}
                    </button>
                  </div>
                </div>

                {/* Okta Card */}
                <div className={`p-6 rounded-2xl border opacity-80 flex flex-col justify-between ${cardBg[theme]}`}>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 flex items-center justify-center font-black text-indigo-600">
                          <Shield className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-xs font-black text-slate-900 dark:text-white">Okta Identity Cloud</h3>
                          <span className="text-[10px] text-slate-400 font-bold">SAML 2.0 & OIDC</span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500">
                        Enterprise Addon
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 font-medium leading-relaxed">
                      התחברות SSO מול שרתי ה-Okta הארגוניים של החברה.
                    </p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
                    <button disabled className="px-3.5 py-1.5 text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-xl cursor-not-allowed">
                      זמין לחשבונות Enterprise
                    </button>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 4: SLA */}
          {activeTab === 'sla' && (
            <div className={`p-6 rounded-2xl border space-y-4 ${cardBg[theme]}`}>
              <h3 className="text-xs font-black border-b pb-3 text-slate-900 dark:text-white">מדיניות זמני מענה לקריאות שירות (בשעות)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
                <div className="space-y-1.5">
                  <label className="block font-black text-rose-600">Critical (שעות)</label>
                  <input
                    type="number"
                    min="0.5"
                    step="0.5"
                    value={settings.sla_critical_hours}
                    onChange={(e) => setSettings({ ...settings, sla_critical_hours: parseFloat(e.target.value) || 1 })}
                    className={`w-full px-3.5 py-2.5 rounded-xl border font-black ${inputBg[theme]}`}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block font-black text-orange-600">High (שעות)</label>
                  <input
                    type="number"
                    min="1"
                    value={settings.sla_high_hours}
                    onChange={(e) => setSettings({ ...settings, sla_high_hours: parseFloat(e.target.value) || 4 })}
                    className={`w-full px-3.5 py-2.5 rounded-xl border font-black ${inputBg[theme]}`}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block font-black text-indigo-600">Medium (שעות)</label>
                  <input
                    type="number"
                    min="1"
                    value={settings.sla_medium_hours}
                    onChange={(e) => setSettings({ ...settings, sla_medium_hours: parseFloat(e.target.value) || 12 })}
                    className={`w-full px-3.5 py-2.5 rounded-xl border font-black ${inputBg[theme]}`}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block font-black text-slate-600">Low (שעות)</label>
                  <input
                    type="number"
                    min="1"
                    value={settings.sla_low_hours}
                    onChange={(e) => setSettings({ ...settings, sla_low_hours: parseFloat(e.target.value) || 24 })}
                    className={`w-full px-3.5 py-2.5 rounded-xl border font-black ${inputBg[theme]}`}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: Teams */}
          {activeTab === 'teams' && (
            <div className={`p-6 rounded-2xl border space-y-4 ${cardBg[theme]}`}>
              <h3 className="text-xs font-black border-b pb-3 text-slate-900 dark:text-white">צוותים מטפלים מורשים בארגון</h3>
              <div className="flex items-center gap-2 max-w-md">
                <input
                  type="text"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="שם צוות חדש..."
                  className={`flex-1 px-3.5 py-2 text-xs rounded-xl border font-semibold ${inputBg[theme]}`}
                />
                <button
                  type="button"
                  onClick={handleAddTeam}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>הוסף</span>
                </button>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                {settings.allowed_teams.map((team) => (
                  <div
                    key={team}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl border bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold"
                  >
                    <span>{team}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTeam(team)}
                      className="text-slate-400 hover:text-rose-600 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: AI */}
          {activeTab === 'ai' && (
            <div className={`p-6 rounded-2xl border space-y-4 ${cardBg[theme]}`}>
              <h3 className="text-xs font-black border-b pb-3 text-slate-900 dark:text-white">הנחיות וידע מותאם אישית ל-Zack AI</h3>
              <textarea
                rows={6}
                value={settings.custom_ai_instructions}
                onChange={(e) => setSettings({ ...settings, custom_ai_instructions: e.target.value })}
                placeholder="הזן כאן שמות מערכות פנימיות, קישורים לפורטלים, נוהלי אסקלציה וכללי ניתוב מיוחדים..."
                className={`w-full px-3.5 py-2.5 text-xs rounded-xl border focus:outline-none transition leading-relaxed ${inputBg[theme]}`}
              />
            </div>
          )}

          {/* TAB 7: Webhooks */}
          {activeTab === 'webhooks' && (
            <div className={`p-6 rounded-2xl border space-y-4 ${cardBg[theme]}`}>
              <h3 className="text-xs font-black border-b pb-3 text-slate-900 dark:text-white">התרעות Webhook חיצוניות (MS Teams / Slack)</h3>
              <div className="space-y-1.5 text-xs">
                <label className="block font-bold text-slate-700 dark:text-slate-300">Webhook URL</label>
                <input
                  type="url"
                  value={settings.notification_webhook_url}
                  onChange={(e) => setSettings({ ...settings, notification_webhook_url: e.target.value })}
                  placeholder="https://outlook.office.com/webhook/..."
                  className={`w-full px-3.5 py-2.5 text-xs rounded-xl border focus:outline-none transition ${inputBg[theme]}`}
                />
              </div>
            </div>
          )}

        </main>
      </div>

      {/* FULL INTEGRATION POPUP MODAL (Okta / Azure SAML Suite) */}
      {showSsoModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto text-slate-900 dark:text-slate-100">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b pb-4 border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 flex items-center justify-center text-indigo-600">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black">הגדרת אינטגרציית SAML 2.0 / Microsoft Entra ID</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">חיבור סביבת {tenant?.name || rawTenant} ל-Azure Identity</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowSsoModal(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-2 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Master Toggle */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <div className="text-xs font-black text-slate-900 dark:text-white">הפעל אינטגרציית SSO</div>
                <div className="text-[11px] text-slate-500 font-medium">כאשר פעיל, כפתור ההתחברות באמצעות Entra ID יופיע בדף הלוגין</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.sso_enabled}
                  onChange={(e) => setSettings({ ...settings, sso_enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {/* Step 1: SP Info */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-black text-purple-700 dark:text-purple-400">
                <KeyRound className="w-4 h-4" />
                <span>שלב 1: פרטי ה-Service Provider להעתקה אל ה-Enterprise App ב-Azure</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <label className="block font-bold text-slate-600 dark:text-slate-400">Identifier (Entity ID)</label>
                  <div className="flex items-center gap-2">
                    <input type="text" readOnly value={spEntityId} className="w-full px-3 py-2 text-xs font-mono rounded-xl border bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200" />
                    <button type="button" onClick={() => copyToClipboard(spEntityId, 'spEntityId')} className="p-2 border rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                      {copiedField === 'spEntityId' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-slate-600 dark:text-slate-400">Reply URL (Assertion Consumer Service - ACS)</label>
                  <div className="flex items-center gap-2">
                    <input type="text" readOnly value={spAcsUrl} className="w-full px-3 py-2 text-xs font-mono rounded-xl border bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200" />
                    <button type="button" onClick={() => copyToClipboard(spAcsUrl, 'spAcsUrl')} className="p-2 border rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                      {copiedField === 'spAcsUrl' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2: IdP Info */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-black text-indigo-700 dark:text-indigo-400">
                <Shield className="w-4 h-4" />
                <span>שלב 2: נתוני ה-Identity Provider (מ-Microsoft Entra ID SAML Configuration)</span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="block font-bold text-slate-800 dark:text-slate-200">SAML Single Sign-On Service URL (Login URL) *</label>
                  <input
                    type="url"
                    value={settings.saml_login_url}
                    onChange={(e) => setSettings({ ...settings, saml_login_url: e.target.value.trim() })}
                    placeholder="https://login.microsoftonline.com/<Tenant-ID>/saml2"
                    className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1F2937] text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-slate-800 dark:text-slate-200">X.509 Certificate (Base64) *</label>
                  <textarea
                    rows={3}
                    value={settings.saml_cert}
                    onChange={(e) => setSettings({ ...settings, saml_cert: e.target.value.trim() })}
                    placeholder="MIIC8DCCAdigAwIBAgIQ..."
                    className="w-full px-3.5 py-2 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1F2937] text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>
            </div>

            {/* Step 3: Group IDs */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-black text-emerald-700 dark:text-emerald-400">
                <Users className="w-4 h-4" />
                <span>שלב 3: מיפוי קבוצות אבטחה ב-Entra ID להרשאות SmartQ (Object IDs)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="space-y-1">
                  <label className="block font-black text-purple-700 dark:text-purple-400">SmartQ-Managers ID</label>
                  <input
                    type="text"
                    value={settings.saml_group_managers_id}
                    onChange={(e) => setSettings({ ...settings, saml_group_managers_id: e.target.value.trim() })}
                    placeholder="xxxxxxxx-xxxx-xxxx..."
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1F2937] text-slate-900 dark:text-white"
                  />
                  <span className="text-[10px] text-slate-400 block">מורשה ל-Manage, Admins, Users</span>
                </div>

                <div className="space-y-1">
                  <label className="block font-black text-indigo-700 dark:text-indigo-400">SmartQ-Admins ID</label>
                  <input
                    type="text"
                    value={settings.saml_group_admins_id}
                    onChange={(e) => setSettings({ ...settings, saml_group_admins_id: e.target.value.trim() })}
                    placeholder="xxxxxxxx-xxxx-xxxx..."
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1F2937] text-slate-900 dark:text-white"
                  />
                  <span className="text-[10px] text-slate-400 block">מורשה ל-Admins ו-Users</span>
                </div>

                <div className="space-y-1">
                  <label className="block font-black text-slate-700 dark:text-slate-300">SmartQ-Users ID</label>
                  <input
                    type="text"
                    value={settings.saml_group_users_id}
                    onChange={(e) => setSettings({ ...settings, saml_group_users_id: e.target.value.trim() })}
                    placeholder="xxxxxxxx-xxxx-xxxx..."
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1F2937] text-slate-900 dark:text-white"
                  />
                  <span className="text-[10px] text-slate-400 block">מורשה ל-Users בלבד</span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowSsoModal(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                ביטול
              </button>
              <button
                type="button"
                onClick={() => handleSaveSettings()}
                disabled={saving}
                className="px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl text-xs font-black shadow-md transition flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'שומר שינויים...' : 'שמור והחל אינטגרציה'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default function TenantManagePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F8FAFC]" />}>
      <EnterpriseManageConsole />
    </Suspense>
  );
}