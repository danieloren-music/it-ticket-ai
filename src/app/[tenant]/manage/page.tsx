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
  Layers,
  Globe,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

type TabType = 'general' | 'sso' | 'sla' | 'teams' | 'ai' | 'webhooks';
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
  entra_tenant_id: string;
  entra_client_id: string;
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

function TenantManageConsole() {
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [activeTab, setActiveTab] = useState<TabType>('sso');
  const params = useParams();
  const tenantSlug = (params?.tenant as string) || '';

  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const [settings, setSettings] = useState<TenantSettings>({
    sso_enabled: false,
    sso_provider_type: 'entra_saml',
    idp_entity_id: '',
    saml_login_url: '',
    saml_cert: '',
    saml_group_managers_id: '',
    saml_group_admins_id: '',
    saml_group_users_id: '',
    entra_tenant_id: '',
    entra_client_id: '',
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
          entra_tenant_id: settingsRes.data.entra_tenant_id ?? '',
          entra_client_id: settingsRes.data.entra_client_id ?? '',
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

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
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

      // עדכון תואם לאחור בטבלת tenants
      await supabase.from('tenants').update({
        saml_login_url: settings.saml_login_url.trim() || null,
        saml_cert: settings.saml_cert.trim() || null,
      }).eq('id', canonicalId);

      setSaveSuccess(true);
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
    light: 'bg-white border-slate-200 shadow-sm text-slate-900',
    dark: 'bg-[#111827] border-slate-800 shadow-lg text-slate-100',
    ai: 'bg-[#130D2C]/80 border-indigo-500/40 shadow-xl shadow-indigo-500/10 backdrop-blur-xl text-slate-100'
  };

  const inputBg = {
    light: 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-indigo-600',
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
      {/* Top Header */}
      <header className={`h-16 border-b sticky top-0 z-30 px-6 flex items-center justify-between backdrop-blur-md transition-colors duration-300 ${
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
              <span className={`text-base font-black tracking-tight ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>SmartQ Manage</span>
              <span className="px-2 py-0.5 text-[10px] font-extrabold bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20 rounded-md">
                ENTERPRISE CONSOLE
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400 font-bold">
              <Building2 className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
              <span>{tenant?.name || tenantSlug}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href={`/${tenant?.id || tenantSlug}/admins`}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-black text-slate-800 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 rounded-xl border border-slate-300 dark:border-slate-700 transition"
          >
            <span>תור טכנאי IT</span>
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

      {/* Main Container with Sidebar */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Sidebar Navigation */}
        <aside className={`lg:col-span-3 rounded-2xl border p-3 space-y-1.5 sticky top-22 ${sidebarBg[theme]}`}>
          <div className="px-3 py-2 text-[11px] font-black text-slate-400 uppercase tracking-wider">
            תפריט הגדרות סביבה
          </div>

          <button
            onClick={() => setActiveTab('sso')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'sso'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4" />
              <span>אינטגרציית SSO & Entra</span>
            </div>
            {settings.sso_enabled && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('general')}
            className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'general'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>פרטי ארגון ודומיין</span>
          </button>

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
            <span>צוותים מטפלים ותורים</span>
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
            <span>הנחיות Zack AI מותאמות</span>
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

        {/* Tab Content Form */}
        <main className="lg:col-span-9 space-y-6">
          <form onSubmit={handleSaveSettings} className="space-y-6">
            
            {/* Top Bar Action */}
            <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div>
                <h1 className={`text-base font-black ${theme === 'light' ? 'text-slate-950' : 'text-white'}`}>
                  {activeTab === 'sso' && 'מרכז אינטגרציות אבטחה, SAML 2.0 ו-Microsoft Entra ID'}
                  {activeTab === 'general' && 'סקירה כללית ופרטי הארגון'}
                  {activeTab === 'sla' && 'הגדרת מדיניות זמני מענה (SLA Target Policies)'}
                  {activeTab === 'teams' && 'ניהול צוותי תמיכה וניתוב קריאות'}
                  {activeTab === 'ai' && 'הנחיות וידע מותאם אישית ל-Zack AI'}
                  {activeTab === 'webhooks' && 'חיבורי Webhook להתרעות חיצוניות'}
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                  שינויים יחולו באופן מיידי על סביבת {tenant?.name || tenantSlug}
                </p>
              </div>

              <div className="flex items-center gap-3">
                {saveSuccess && (
                  <span className="text-xs font-black text-emerald-700 flex items-center gap-1.5 bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-300">
                    <Check className="w-4 h-4" />
                    השינויים נשמרו!
                  </span>
                )}
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl text-xs font-black shadow-md shadow-indigo-500/20 transition"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'שומר...' : 'שמור הגדרות'}</span>
                </button>
              </div>
            </div>

            {/* TAB: SSO & Entra ID */}
            {activeTab === 'sso' && (
              <div className="space-y-6">
                
                {/* Master SSO Toggle */}
                <div className={`p-6 rounded-2xl border ${cardBg[theme]}`}>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-indigo-600" />
                        <h2 className="text-sm font-black">הפעלת הזדהות ארגונית (Single Sign-On - SSO)</h2>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        כאשר מופעל, עובדי הארגון וטכנאי ה-IT יוכלו להזדהות באמצעות Microsoft Entra ID / Okta SAML 2.0.
                      </p>
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
                </div>

                {/* Section A: Service Provider (SmartQ) Details to copy to Azure */}
                <div className={`p-6 rounded-2xl border space-y-4 ${cardBg[theme]}`}>
                  <div className="flex items-center gap-2 border-b pb-3 border-slate-200 dark:border-slate-800">
                    <KeyRound className="w-4 h-4 text-purple-600" />
                    <h3 className="text-xs font-black">שלב 1: פרטי ה-Service Provider (SmartQ) להזנה ב-Entra ID Enterprise App</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1.5">
                      <label className="block font-bold text-slate-700 dark:text-slate-300">Identifier (Entity ID)</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={spEntityId}
                          className={`w-full px-3 py-2 text-xs font-mono rounded-xl border bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300`}
                        />
                        <button
                          type="button"
                          onClick={() => copyToClipboard(spEntityId, 'spEntityId')}
                          className="p-2 border rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                          title="העתק"
                        >
                          {copiedField === 'spEntityId' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block font-bold text-slate-700 dark:text-slate-300">Reply URL (Assertion Consumer Service - ACS)</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={spAcsUrl}
                          className={`w-full px-3 py-2 text-xs font-mono rounded-xl border bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300`}
                        />
                        <button
                          type="button"
                          onClick={() => copyToClipboard(spAcsUrl, 'spAcsUrl')}
                          className="p-2 border rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                          title="העתק"
                        >
                          {copiedField === 'spAcsUrl' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section B: Identity Provider (Azure / Entra ID) Configuration */}
                <div className={`p-6 rounded-2xl border space-y-4 ${cardBg[theme]}`}>
                  <div className="flex items-center gap-2 border-b pb-3 border-slate-200 dark:border-slate-800">
                    <Globe className="w-4 h-4 text-indigo-600" />
                    <h3 className="text-xs font-black">שלב 2: הגדרות ה-Identity Provider (IdP מ-Microsoft Entra ID)</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="block font-bold text-slate-800 dark:text-slate-200">
                        SAML Single Sign-On Service URL (Login URL מ-Azure) *
                      </label>
                      <input
                        type="url"
                        value={settings.saml_login_url}
                        onChange={(e) => setSettings({ ...settings, saml_login_url: e.target.value.trim() })}
                        placeholder="https://login.microsoftonline.com/<Tenant-ID>/saml2"
                        className={`w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border focus:outline-none transition ${inputBg[theme]}`}
                      />
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="block font-bold text-slate-800 dark:text-slate-200">
                        X.509 Public Certificate (Base64) *
                      </label>
                      <textarea
                        rows={3}
                        value={settings.saml_cert}
                        onChange={(e) => setSettings({ ...settings, saml_cert: e.target.value.trim() })}
                        placeholder="MIIC8DCCAdigAwIBAgIQ... (ללא שורות ה-BEGIN/END)"
                        className={`w-full px-3.5 py-2 text-xs font-mono rounded-xl border focus:outline-none transition ${inputBg[theme]}`}
                      />
                    </div>
                  </div>
                </div>

                {/* Section C: Entra Security Groups Mapping (RBAC) */}
                <div className={`p-6 rounded-2xl border space-y-4 ${cardBg[theme]}`}>
                  <div className="flex items-center gap-2 border-b pb-3 border-slate-200 dark:border-slate-800">
                    <Users className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-xs font-black">שלב 3: מיפוי קבוצות אבטחה ב-Entra ID להרשאות SmartQ (Group Object IDs)</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div className="space-y-1.5">
                      <label className="block font-black text-purple-700 dark:text-purple-400">
                        SmartQ-Managers (קבוצת מנהלים)
                      </label>
                      <input
                        type="text"
                        value={settings.saml_group_managers_id}
                        onChange={(e) => setSettings({ ...settings, saml_group_managers_id: e.target.value.trim() })}
                        placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                        className={`w-full px-3 py-2 text-xs font-mono rounded-xl border focus:outline-none transition ${inputBg[theme]}`}
                      />
                      <span className="text-[10px] text-slate-500 block">גישה מלאה ל-Manage, Admins ו-Users</span>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block font-black text-indigo-700 dark:text-indigo-400">
                        SmartQ-Admins (קבוצת טכנאי IT)
                      </label>
                      <input
                        type="text"
                        value={settings.saml_group_admins_id}
                        onChange={(e) => setSettings({ ...settings, saml_group_admins_id: e.target.value.trim() })}
                        placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                        className={`w-full px-3 py-2 text-xs font-mono rounded-xl border focus:outline-none transition ${inputBg[theme]}`}
                      />
                      <span className="text-[10px] text-slate-500 block">גישה ל-Admins ו-Users</span>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block font-black text-slate-700 dark:text-slate-300">
                        SmartQ-Users (קבוצת עובדי קצה)
                      </label>
                      <input
                        type="text"
                        value={settings.saml_group_users_id}
                        onChange={(e) => setSettings({ ...settings, saml_group_users_id: e.target.value.trim() })}
                        placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                        className={`w-full px-3 py-2 text-xs font-mono rounded-xl border focus:outline-none transition ${inputBg[theme]}`}
                      />
                      <span className="text-[10px] text-slate-500 block">גישה ל-Users בלבד</span>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* TAB: General Info */}
            {activeTab === 'general' && (
              <div className={`p-6 rounded-2xl border space-y-4 ${cardBg[theme]}`}>
                <h3 className="text-xs font-black border-b pb-3">פרטי הארגון והדומיין</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-bold mb-1 text-slate-500">שם הארגון</label>
                    <input type="text" disabled value={tenant?.name || ''} className="w-full px-3 py-2 rounded-xl border bg-slate-100 dark:bg-slate-800 font-bold" />
                  </div>
                  <div>
                    <label className="block font-bold mb-1 text-slate-500">מזהה סביבה (Slug)</label>
                    <input type="text" disabled value={tenant?.id || ''} className="w-full px-3 py-2 rounded-xl border bg-slate-100 dark:bg-slate-800 font-bold" />
                  </div>
                  <div>
                    <label className="block font-bold mb-1 text-slate-500">דומיין מורשה</label>
                    <input type="text" disabled value={tenant?.domain || ''} className="w-full px-3 py-2 rounded-xl border bg-slate-100 dark:bg-slate-800 font-bold" />
                  </div>
                  <div>
                    <label className="block font-bold mb-1 text-slate-500">אימייל מנהל ראשי</label>
                    <input type="text" disabled value={tenant?.admin_email || ''} className="w-full px-3 py-2 rounded-xl border bg-slate-100 dark:bg-slate-800 font-bold" />
                  </div>
                </div>
              </div>
            )}

            {/* TAB: SLA Policies */}
            {activeTab === 'sla' && (
              <div className={`p-6 rounded-2xl border space-y-4 ${cardBg[theme]}`}>
                <h3 className="text-xs font-black border-b pb-3">מדיניות זמני מענה לקריאות שירות (בשעות)</h3>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
                  <div className="space-y-1.5">
                    <label className="block font-black text-rose-600">Critical</label>
                    <input
                      type="number"
                      min="0.5"
                      step="0.5"
                      value={settings.sla_critical_hours}
                      onChange={(e) => setSettings({ ...settings, sla_critical_hours: parseFloat(e.target.value) || 1 })}
                      className={`w-full px-3 py-2 rounded-xl border font-black ${inputBg[theme]}`}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block font-black text-orange-600">High</label>
                    <input
                      type="number"
                      min="1"
                      value={settings.sla_high_hours}
                      onChange={(e) => setSettings({ ...settings, sla_high_hours: parseFloat(e.target.value) || 4 })}
                      className={`w-full px-3 py-2 rounded-xl border font-black ${inputBg[theme]}`}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block font-black text-indigo-600">Medium</label>
                    <input
                      type="number"
                      min="1"
                      value={settings.sla_medium_hours}
                      onChange={(e) => setSettings({ ...settings, sla_medium_hours: parseFloat(e.target.value) || 12 })}
                      className={`w-full px-3 py-2 rounded-xl border font-black ${inputBg[theme]}`}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block font-black text-slate-600">Low</label>
                    <input
                      type="number"
                      min="1"
                      value={settings.sla_low_hours}
                      onChange={(e) => setSettings({ ...settings, sla_low_hours: parseFloat(e.target.value) || 24 })}
                      className={`w-full px-3 py-2 rounded-xl border font-black ${inputBg[theme]}`}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB: Teams */}
            {activeTab === 'teams' && (
              <div className={`p-6 rounded-2xl border space-y-4 ${cardBg[theme]}`}>
                <h3 className="text-xs font-black border-b pb-3">צוותים מטפלים מורשים בארגון</h3>
                <div className="flex items-center gap-2 max-w-md">
                  <input
                    type="text"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    placeholder="שם צוות חדש..."
                    className={`flex-1 px-3 py-2 text-xs rounded-xl border font-semibold ${inputBg[theme]}`}
                  />
                  <button
                    type="button"
                    onClick={handleAddTeam}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>הוסף צוות</span>
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  {settings.allowed_teams.map((team) => (
                    <div
                      key={team}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-xl border bg-slate-100 dark:bg-slate-800 text-xs font-bold"
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

            {/* TAB: AI Brain */}
            {activeTab === 'ai' && (
              <div className={`p-6 rounded-2xl border space-y-4 ${cardBg[theme]}`}>
                <h3 className="text-xs font-black border-b pb-3">הנחיות וידע מותאם אישית ל-Zack AI עבור {tenant?.name}</h3>
                <textarea
                  rows={6}
                  value={settings.custom_ai_instructions}
                  onChange={(e) => setSettings({ ...settings, custom_ai_instructions: e.target.value })}
                  placeholder="הזן כאן שמות מערכות פנימיות, קישורים לפורטלים, נוהלי אסקלציה וכללי ניתוב מיוחדים..."
                  className={`w-full px-3.5 py-2.5 text-xs rounded-xl border focus:outline-none transition leading-relaxed ${inputBg[theme]}`}
                />
              </div>
            )}

            {/* TAB: Webhooks */}
            {activeTab === 'webhooks' && (
              <div className={`p-6 rounded-2xl border space-y-4 ${cardBg[theme]}`}>
                <h3 className="text-xs font-black border-b pb-3">התרעות Webhook חיצוניות (MS Teams / Slack)</h3>
                <div className="space-y-1.5 text-xs">
                  <label className="block font-bold">Webhook URL</label>
                  <input
                    type="url"
                    value={settings.notification_webhook_url}
                    onChange={(e) => setSettings({ ...settings, notification_webhook_url: e.target.value })}
                    placeholder="https://outlook.office.com/webhook/..."
                    className={`w-full px-3.5 py-2 text-xs rounded-xl border focus:outline-none transition ${inputBg[theme]}`}
                  />
                </div>
              </div>
            )}

          </form>
        </main>

      </div>
    </div>
  );
}

export default function TenantManagePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F8FAFC]" />}>
      <TenantManageConsole />
    </Suspense>
  );
}