'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabaseClient';
import { 
  Building2, 
  Lock, 
  Mail, 
  ShieldCheck, 
  ArrowLeft, 
  AlertCircle,
  LogIn,
  KeyRound,
  ShieldAlert,
  HelpCircle,
  CheckCircle2
} from 'lucide-react';

function TenantLoginComponent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const rawTenant = (params?.tenant as string) || '';
  const tenantSlug = rawTenant.toLowerCase();
  const returnTo = searchParams.get('returnTo') || `/${rawTenant}/manage`;

  const [tenantName, setTenantName] = useState<string>('');
  const [ssoEnabled, setSsoEnabled] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  // Form states
  const [activeTab, setActiveTab] = useState<'sso' | 'local'>('local');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<'manager' | 'admin'>('manager');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadTenant() {
      if (!tenantSlug) return;
      setLoading(true);

      const [tenantRes, settingsRes] = await Promise.all([
        supabase.from('tenants').select('*').ilike('id', tenantSlug).single(),
        supabase.from('tenant_settings').select('*').ilike('tenant_id', tenantSlug).single()
      ]);

      if (tenantRes.data) {
        setTenantName(tenantRes.data.name);
      } else {
        setTenantName(rawTenant.toUpperCase());
      }

      const isSso = !!(settingsRes.data?.sso_enabled || settingsRes.data?.saml_login_url || tenantRes.data?.saml_login_url);
      setSsoEnabled(isSso);
      if (isSso) {
        setActiveTab('sso');
      }

      setLoading(false);
    }

    loadTenant();
  }, [tenantSlug, rawTenant]);

  const handleLocalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/auth/local-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantSlug,
          email,
          password,
          role: selectedRole
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'שם משתמש או סיסמה שגויים');
      }

      router.push(returnTo);
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSsoRedirect = () => {
    window.location.href = `/api/auth/saml/login?tenant=${tenantSlug}&returnTo=${encodeURIComponent(returnTo)}`;
  };

  return (
    <div dir="rtl" className="min-h-screen bg-[#0F172A] flex flex-col justify-center items-center p-4 font-sans antialiased text-slate-100 selection:bg-indigo-500 selection:text-white relative overflow-hidden">
      
      {/* Background Glow */}
      <div className="absolute top-1/4 -right-20 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -left-20 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-white border border-slate-200/90 dark:bg-slate-900/95 dark:border-slate-800 rounded-3xl shadow-2xl p-8 space-y-6 relative z-10 backdrop-blur-xl">
        
        {/* Workspace Brand Header */}
        <div className="text-center space-y-3">
          <div className="relative w-14 h-14 mx-auto rounded-2xl overflow-hidden shadow-lg bg-white border border-slate-100 flex items-center justify-center">
            <Image src="/smartq-logo.png" alt="SmartQ" width={48} height={48} className="object-contain" priority />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-3 py-1 rounded-full border border-indigo-200 dark:border-indigo-800/60">
              <Building2 className="w-3.5 h-3.5" />
              <span>{tenantName || rawTenant}</span>
            </div>
            <h1 className="text-xl font-black text-slate-950 dark:text-white mt-2">פורטל הזדהות וכניסה</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">כניסה מאובטחת לסביבת הניהול והשירות</p>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950/60 dark:border-rose-900/80 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-black">
          <button
            type="button"
            onClick={() => setActiveTab('local')}
            className={`py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 ${
              activeTab === 'local' 
                ? 'bg-white text-slate-900 dark:bg-slate-900 dark:text-white shadow-xs' 
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>כניסה מקומית</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sso')}
            className={`py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 ${
              activeTab === 'sso' 
                ? 'bg-white text-indigo-600 dark:bg-slate-900 dark:text-indigo-400 shadow-xs' 
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Microsoft Entra ID</span>
          </button>
        </div>

        {/* TAB 1: Entra ID / SAML SSO */}
        {activeTab === 'sso' && (
          <div className="space-y-4 pt-1">
            {ssoEnabled ? (
              <>
                <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 text-center space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border mx-auto flex items-center justify-center">
                    <svg className="w-5 h-5" viewBox="0 0 23 23">
                      <path fill="#f35325" d="M1 1h10v10H1z"/>
                      <path fill="#81bc06" d="M12 1h10v10H12z"/>
                      <path fill="#05a6f0" d="M1 12h10v10H1z"/>
                      <path fill="#ffba08" d="M12 12h10v10H12z"/>
                    </svg>
                  </div>
                  <div className="text-xs font-black text-slate-900 dark:text-white">אימות ארגוני באמצעות SSO</div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                    התחבר באמצעות חשבון ה-Microsoft 365 של החברה. ההרשאות ייקבעו בהתאם ל-Security Groups שהוגדרו.
                  </p>
                </div>

                <button
                  onClick={handleSsoRedirect}
                  type="button"
                  className="w-full py-3 bg-[#0F172A] hover:bg-[#1E293B] text-white rounded-xl text-xs font-black shadow-md transition flex items-center justify-center gap-2.5"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>התחבר עם Microsoft Entra ID</span>
                </button>
              </>
            ) : (
              <div className="p-6 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-center space-y-3">
                <ShieldAlert className="w-8 h-8 text-amber-600 dark:text-amber-400 mx-auto" />
                <div>
                  <h3 className="text-xs font-black text-amber-900 dark:text-amber-200">אינטגרציית SSO טרם הוגדרה</h3>
                  <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1 font-medium leading-relaxed">
                    כדי להפעיל כניסה עם Entra ID, מנהל המערכת צריך להגדיר את פרטי ה-SAML בקונסולת ה-Manage.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('local')}
                  className="text-xs font-black text-indigo-600 dark:text-indigo-400 underline underline-offset-2"
                >
                  מעבר לכניסה מקומית כמנהל
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Local Credentials Form */}
        {activeTab === 'local' && (
          <form onSubmit={handleLocalLogin} className="space-y-4 text-xs pt-1 text-slate-800 dark:text-slate-200">
            <div>
              <label className="block font-bold mb-1.5">אימייל מנהל / משתמש *</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute right-3.5 top-3 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@domain.com"
                  className="w-full pr-10 pl-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-indigo-600 font-medium transition"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold mb-1.5">סיסמה *</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute right-3.5 top-3 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pr-10 pl-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-indigo-600 font-medium transition"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold mb-1.5">תפקיד להתחברות</label>
              <div className="grid grid-cols-2 gap-2 font-bold text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedRole('manager')}
                  className={`py-2 px-3 rounded-xl border transition ${
                    selectedRole === 'manager'
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-700 dark:bg-indigo-950/60 dark:border-indigo-500 dark:text-indigo-300'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  מנהל (Manager)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRole('admin')}
                  className={`py-2 px-3 rounded-xl border transition ${
                    selectedRole === 'admin'
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-700 dark:bg-indigo-950/60 dark:border-indigo-500 dark:text-indigo-300'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  טכנאי (IT Tech)
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 text-white rounded-xl font-black shadow-md shadow-indigo-500/20 transition flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              <span>{submitting ? 'מתחבר למערכת...' : 'התחבר עכשיו'}</span>
            </button>
          </form>
        )}

        <div className="text-center pt-2 border-t border-slate-100 dark:border-slate-800">
          <a
            href={`/${rawTenant}/users`}
            className="text-xs font-bold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition inline-flex items-center gap-1"
          >
            <span>מעבר לפורטל פתיחת קריאות שירות</span>
            <ArrowLeft className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}

export default function TenantLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0F172A]" />}>
      <TenantLoginComponent />
    </Suspense>
  );
}