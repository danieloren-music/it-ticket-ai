'use client';

import { useState, useEffect, Suspense } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabaseClient';
import { 
  Building2, 
  Layers, 
  Plus, 
  Search, 
  Sun, 
  Moon, 
  Sparkles, 
  ExternalLink, 
  CheckCircle2, 
  X, 
  Save, 
  Trash2, 
  Lock, 
  RefreshCw,
  BarChart3,
  KeyRound,
  Shield,
  Activity,
  Server,
  Settings,
  HelpCircle,
  AlertTriangle,
  Users,
  Globe,
  Radio,
  ArrowRight
} from 'lucide-react';

interface Tenant {
  id: string;
  name: string;
  domain: string;
  admin_email: string;
  created_at: string;
  is_active?: boolean;
}

export default function PlatformMasterConsole() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Onboarding Form
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [domain, setDomain] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchTenants = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setTenants(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !slug) return;
    setIsSubmitting(true);
    setFeedback(null);

    const cleanSlug = slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, '');

    try {
      const { error } = await supabase.from('tenants').insert([
        {
          id: cleanSlug,
          name: name.trim(),
          domain: domain.trim() || `${cleanSlug}.com`,
          admin_email: adminEmail.trim() || `admin@${cleanSlug}.com`,
        },
      ]);

      if (error) throw error;

      // Create default manager for this tenant
      await supabase.from('tenant_users').insert([
        {
          tenant_id: cleanSlug,
          email: adminEmail.trim() || `admin@${cleanSlug}.com`,
          password_hash: 'SmartQ2026!',
          full_name: `מנהל מערכת ${name}`,
          role: 'Manager',
          department: 'IT & Security',
          site_location: 'מטה ראשי',
          is_active: true
        }
      ]);

      setFeedback({ text: `סביבת ${name} הוקמה בהצלחה!`, type: 'success' });
      setName('');
      setSlug('');
      setDomain('');
      setAdminEmail('');
      fetchTenants();
    } catch (err: any) {
      setFeedback({ text: 'שגיאה: ' + err.message, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredTenants = tenants.filter((t) =>
    t.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.domain?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div dir="rtl" className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans antialiased">
      
      {/* 1. Radware Style Header */}
      <header className="h-14 border-b border-slate-200 bg-white px-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg overflow-hidden bg-white border border-slate-200 flex items-center justify-center p-1 shadow-2xs">
              <Image src="/smartq-logo.png" alt="SmartQ" width={28} height={28} className="object-contain" priority />
            </div>
            <div className="flex items-center gap-1.5 font-bold text-xs">
              <span className="text-indigo-600 font-black text-sm">SmartQ</span>
              <span className="text-slate-400">/</span>
              <span className="text-slate-800 font-extrabold">CLOUD PLATFORM</span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-lg border border-slate-200 text-xs font-bold">
            <Globe className="w-3.5 h-3.5 text-indigo-600" />
            <span className="text-slate-800">Multi-Tenancy Master Controller</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-indigo-600 text-white px-3 py-1 rounded-md text-[11px] font-black tracking-wider uppercase shadow-xs">
            <Sparkles className="w-3 h-3" />
            <span>SUPER ADMIN</span>
          </div>

          <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-xs">
            SA
          </div>
        </div>
      </header>

      {/* 2. Main Wrapper */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Radware Left Navigation Bar */}
        <aside className="w-14 bg-[#1E293B] border-r border-slate-800 text-slate-300 flex flex-col items-center py-4 justify-between shrink-0 z-30">
          <div className="space-y-4 w-full flex flex-col items-center">
            <button className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-md" title="ניהול ארגונים">
              <Layers className="w-5 h-5" />
            </button>
            <button className="p-2.5 rounded-xl hover:bg-slate-700 text-slate-400 hover:text-white transition" title="סטטיסטיקות ענן">
              <BarChart3 className="w-5 h-5" />
            </button>
            <button className="p-2.5 rounded-xl hover:bg-slate-700 text-slate-400 hover:text-white transition" title="אבטחה ואינטגרציות">
              <Shield className="w-5 h-5" />
            </button>
          </div>
          <div className="space-y-2 flex flex-col items-center">
            <button className="p-2.5 rounded-xl hover:bg-slate-700 text-slate-400 hover:text-white transition">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </aside>

        {/* Workspace */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h1 className="text-lg font-black text-slate-900">ניהול סביבות וארגונים (Multi-Tenant Master)</h1>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">הקצאה, בקרה וניהול סביבות ענן פעילות ב-SmartQ</p>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
              <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
              <span>כל השירותים פועלים כסדרם (100% Uptime)</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Active Tenants List */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-black text-slate-900 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-indigo-600" />
                    <span>סביבות ארגונים פעילות ({tenants.length})</span>
                  </h2>

                  <div className="relative w-56">
                    <Search className="w-3.5 h-3.5 absolute right-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="חפש ארגון או דומיין..."
                      className="w-full pr-8 pl-3 py-1.5 text-xs rounded-xl border border-slate-300 bg-slate-50 text-slate-900 focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                </div>

                {loading ? (
                  <div className="py-12 text-center text-xs text-slate-500 font-bold">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
                    טוען סביבות ארגונים...
                  </div>
                ) : filteredTenants.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-500 font-bold">לא נמצאו ארגונים</div>
                ) : (
                  <div className="grid grid-cols-1 gap-3.5">
                    {filteredTenants.map((t) => (
                      <div key={t.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-indigo-200 transition space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-black text-sm uppercase">
                              {t.id.slice(0, 2)}
                            </div>
                            <div>
                              <h3 className="text-xs font-black text-slate-900">{t.name}</h3>
                              <span className="text-[11px] font-mono text-slate-500">/{t.id} • {t.domain}</span>
                            </div>
                          </div>

                          <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            פעיל
                          </span>
                        </div>

                        <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between gap-2 text-xs font-black">
                          <a
                            href={`/${t.id}/new-request`}
                            target="_blank"
                            className="flex-1 py-1.5 text-center bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition text-[11px]"
                          >
                            פורטל עובדים
                          </a>
                          <a
                            href={`/${t.id}/admins`}
                            target="_blank"
                            className="flex-1 py-1.5 text-center bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg transition text-[11px]"
                          >
                            תור טכנאי IT
                          </a>
                          <a
                            href={`/${t.id}/manage`}
                            target="_blank"
                            className="flex-1 py-1.5 text-center bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg transition text-[11px]"
                          >
                            קונסולת ניהול
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Onboarding Form */}
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
              <div className="border-b border-slate-200 pb-3">
                <h2 className="text-xs font-black text-slate-900 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-indigo-600" />
                  <span>הקמת ארגון חדש (Tenant Onboarding)</span>
                </h2>
                <p className="text-[11px] text-slate-500 font-semibold mt-0.5">יצירת סביבה ארגונית מבודדת והקצאת מנהל ראשי</p>
              </div>

              {feedback && (
                <div className={`p-3.5 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                  feedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}>
                  {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <X className="w-4 h-4 text-rose-600" />}
                  <span>{feedback.text}</span>
                </div>
              )}

              <form onSubmit={handleCreateTenant} className="space-y-3.5 text-xs font-bold">
                <div>
                  <label className="block mb-1 text-slate-800">שם הארגון *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (!slug) setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''));
                    }}
                    placeholder="למשל: חברת החשמל לישראל"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 focus:outline-none focus:border-indigo-600 font-semibold"
                  />
                </div>

                <div>
                  <label className="block mb-1 text-slate-800">מזהה נתיב (Slug באנגלית) *</label>
                  <input
                    type="text"
                    required
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="למשל: iec / rafael"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 focus:outline-none focus:border-indigo-600 font-mono font-semibold"
                  />
                </div>

                <div>
                  <label className="block mb-1 text-slate-800">דומיין אימייל ראשי</label>
                  <input
                    type="text"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    placeholder="iec.co.il"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 focus:outline-none focus:border-indigo-600 font-mono font-semibold"
                  />
                </div>

                <div>
                  <label className="block mb-1 text-slate-800">אימייל מנהל ה-IT הראשי</label>
                  <input
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="admin@company.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 focus:outline-none focus:border-indigo-600 font-mono font-semibold"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-black shadow-md transition flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{isSubmitting ? 'מקצה סביבה...' : 'הקצה סביבת לקוח ב-SmartQ'}</span>
                  </button>
                </div>
              </form>
            </div>

          </div>

        </main>
      </div>

    </div>
  );
}