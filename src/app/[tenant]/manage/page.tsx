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
  ExternalLink,
  Sun,
  Moon,
  Sparkles,
  RefreshCw
} from 'lucide-react';

type ThemeMode = 'light' | 'dark' | 'ai';

interface TenantSettings {
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
}

function TenantManageConsole() {
  const [theme, setTheme] = useState<ThemeMode>('light');
  const params = useParams();
  const tenantSlug = (params?.tenant as string) || 'demo';

  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [settings, setSettings] = useState<TenantSettings>({
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

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tenantRes, settingsRes] = await Promise.all([
        supabase.from('tenants').select('*').eq('id', tenantSlug).single(),
        supabase.from('tenant_settings').select('*').eq('tenant_id', tenantSlug).single()
      ]);

      if (tenantRes.data) setTenant(tenantRes.data);
      if (settingsRes.data) {
        setSettings({
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
      const { error } = await supabase
        .from('tenant_settings')
        .upsert({
          tenant_id: tenantSlug,
          ...settings,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

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
                ORG ADMIN CONSOLE
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
            href={`/${tenantSlug}/admins`}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-black text-slate-800 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 rounded-xl border border-slate-300 dark:border-slate-700 transition"
          >
            <span>תור טכנאי IT (Admins)</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

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
            title="רענן הגדרות"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-500' : ''}`} />
          </button>
        </div>
      </header>

      {/* Main Console Content */}
      <main className="max-w-5xl mx-auto w-full p-6 space-y-6">
        <form onSubmit={handleSaveSettings} className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className={`text-xl font-black ${theme === 'light' ? 'text-slate-950' : 'text-white'}`}>
                הגדרות Workspace של {tenant?.name || tenantSlug}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                שליטה מלאה במדיניות ה-SLA, צוותים מטפלים, והתנהגות Zack AI בארגון
              </p>
            </div>

            <div className="flex items-center gap-3">
              {saveSuccess && (
                <span className="text-xs font-black text-emerald-700 flex items-center gap-1.5 bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-300">
                  <Check className="w-4 h-4" />
                  ההגדרות נשמרו בהצלחה!
                </span>
              )}
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl text-xs font-black shadow-md shadow-indigo-500/20 transition"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'שומר שינויים...' : 'שמור הגדרות סביבה'}</span>
              </button>
            </div>
          </div>

          {/* Section 1: SLA Target Policies */}
          <div className={`p-6 rounded-2xl border space-y-4 ${cardBg[theme]}`}>
            <div className="flex items-center gap-2 border-b pb-3 border-slate-200 dark:border-slate-800">
              <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-sm font-black">מדיניות זמני מענה (SLA Target Policies)</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
              <div className="space-y-1.5">
                <label className="block font-black text-rose-700 dark:text-rose-400">Critical (בשעות)</label>
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
                <label className="block font-black text-orange-700 dark:text-orange-400">High (בשעות)</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={settings.sla_high_hours}
                  onChange={(e) => setSettings({ ...settings, sla_high_hours: parseFloat(e.target.value) || 4 })}
                  className={`w-full px-3 py-2 rounded-xl border font-black ${inputBg[theme]}`}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block font-black text-indigo-700 dark:text-indigo-400">Medium (בשעות)</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={settings.sla_medium_hours}
                  onChange={(e) => setSettings({ ...settings, sla_medium_hours: parseFloat(e.target.value) || 12 })}
                  className={`w-full px-3 py-2 rounded-xl border font-black ${inputBg[theme]}`}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block font-black text-slate-700 dark:text-slate-400">Low (בשעות)</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={settings.sla_low_hours}
                  onChange={(e) => setSettings({ ...settings, sla_low_hours: parseFloat(e.target.value) || 24 })}
                  className={`w-full px-3 py-2 rounded-xl border font-black ${inputBg[theme]}`}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Teams & Queues Management */}
          <div className={`p-6 rounded-2xl border space-y-4 ${cardBg[theme]}`}>
            <div className="flex items-center gap-2 border-b pb-3 border-slate-200 dark:border-slate-800">
              <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-sm font-black">ניהול צוותים מטפלים (Assigned Teams)</h2>
            </div>

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
                <span>הוסף</span>
              </button>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              {settings.allowed_teams.map((team) => (
                <div
                  key={team}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-black ${
                    theme === 'light' 
                      ? 'bg-slate-100 text-slate-900 border-slate-300' 
                      : 'bg-slate-800 text-slate-200 border-slate-700'
                  }`}
                >
                  <span>{team}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTeam(team)}
                    className="text-slate-400 hover:text-rose-600 transition"
                    title="הסר צוות"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Custom Zack AI Instructions */}
          <div className={`p-6 rounded-2xl border space-y-4 ${cardBg[theme]}`}>
            <div className="flex items-center gap-2 border-b pb-3 border-slate-200 dark:border-slate-800">
              <Cpu className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-sm font-black">הנחיות וידע מותאם אישית ל-Zack AI</h2>
            </div>

            <textarea
              rows={4}
              value={settings.custom_ai_instructions}
              onChange={(e) => setSettings({ ...settings, custom_ai_instructions: e.target.value })}
              placeholder="הנחיות ונהלים פנימיים לארגון עבור Zack AI..."
              className={`w-full px-3.5 py-2.5 text-xs rounded-xl border focus:outline-none transition leading-relaxed ${inputBg[theme]}`}
            />
          </div>

          {/* Section 4: Webhook */}
          <div className={`p-6 rounded-2xl border space-y-4 ${cardBg[theme]}`}>
            <div className="flex items-center gap-2 border-b pb-3 border-slate-200 dark:border-slate-800">
              <Bell className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-sm font-black">אינטגרציית Webhook והתרעות</h2>
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="block font-black text-slate-800 dark:text-slate-200">
                כתובת Webhook URL להתרעות על קריאות קריטיות (Teams / Slack)
              </label>
              <input
                type="url"
                value={settings.notification_webhook_url}
                onChange={(e) => setSettings({ ...settings, notification_webhook_url: e.target.value })}
                placeholder="https://outlook.office.com/webhook/..."
                className={`w-full px-3.5 py-2 text-xs rounded-xl border focus:outline-none transition ${inputBg[theme]}`}
              />
            </div>
          </div>
        </form>
      </main>
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