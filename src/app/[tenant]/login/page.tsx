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
  KeyRound
} from 'lucide-react';

function TenantLoginComponent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const rawTenant = (params?.tenant as string) || '';
  const tenantSlug = rawTenant.toLowerCase();
  const returnTo = searchParams.get('returnTo') || `/${rawTenant}/users`;

  const [tenantName, setTenantName] = useState<string>('');
  const [ssoEnabled, setSsoEnabled] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  // Form states
  const [loginMethod, setLoginMethod] = useState<'sso' | 'local'>('sso');
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
        setTenantName(tenantSlug.toUpperCase());
      }

      const isSso = !!(settingsRes.data?.sso_enabled || settingsRes.data?.saml_login_url || tenantRes.data?.saml_login_url);
      setSsoEnabled(isSso);
      if (!isSso) {
        setLoginMethod('local');
      }

      setLoading(false);
    }

    loadTenant();
  }, [tenantSlug]);

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
        throw new Error(data.error || 'פרטי התחברות שגויים');
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
    <div dir="rtl" className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center items-center p-4 font-sans antialiased selection:bg-indigo-500 selection:text-white">
      <div className="w-full max-w-md bg-white border border-slate-200/90 rounded-3xl shadow-xl p-8 space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="relative w-14 h-14 mx-auto rounded-2xl overflow-hidden shadow-md bg-white border border-slate-100 flex items-center justify-center">
            <Image src="/smartq-logo.png" alt="SmartQ" width={48} height={48} className="object-contain" priority />
          </div>
          <div className="flex items-center justify-center gap-1.5 text-xs font-black text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full w-fit mx-auto border border-indigo-200">
            <Building2 className="w-3.5 h-3.5" />
            <span>{tenantName || tenantSlug}</span>
          </div>
          <h1 className="text-xl font-black text-slate-950">התחברות לארגון</h1>
          <p className="text-xs text-slate-500 font-semibold">פורטל שירות והזדהות ארגונית מאובטחת</p>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Auth Method Tabs */}
        {ssoEnabled && (
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-2xl border border-slate-200 text-xs font-black">
            <button
              type="button"
              onClick={() => setLoginMethod('sso')}
              className={`py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 ${
                loginMethod === 'sso' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Microsoft Entra ID</span>
            </button>
            <button
              type="button"
              onClick={() => setLoginMethod('local')}
              className={`py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 ${
                loginMethod === 'local' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <KeyRound className="w-4 h-4 text-slate-600" />
              <span>כניסה מקומית</span>
            </button>
          </div>
        )}

        {/* Method 1: Entra ID / SAML SSO */}
        {loginMethod === 'sso' && ssoEnabled && (
          <div className="space-y-4 pt-2">
            <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 text-center space-y-2">
              <ShieldCheck className="w-8 h-8 text-indigo-600 mx-auto" />
              <div className="text-xs font-black text-slate-800">הזדהות ארגונית מאובטחת (SSO)</div>
              <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                התחבר באמצעות חשבון ה-Microsoft Entra ID / Office 365 של הארגון. ההרשאות ייקבעו אוטומטית לפי קבוצות האבטחה שלך.
              </p>
            </div>

            <button
              onClick={handleSsoRedirect}
              type="button"
              className="w-full py-3 bg-[#0F172A] hover:bg-[#1E293B] text-white rounded-xl text-xs font-black shadow-md transition flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 23 23">
                <path fill="#f35325" d="M1 1h10v10H1z"/>
                <path fill="#81bc06" d="M12 1h10v10H12z"/>
                <path fill="#05a6f0" d="M1 12h10v10H1z"/>
                <path fill="#ffba08" d="M12 12h10v10H12z"/>
              </svg>
              <span>התחבר באמצעות Microsoft Entra ID</span>
            </button>
          </div>
        )}

        {/* Method 2: Local Credentials Form */}
        {(loginMethod === 'local' || !ssoEnabled) && (
          <form onSubmit={handleLocalLogin} className="space-y-4 text-xs pt-1">
            <div>
              <label className="block font-bold mb-1.5 text-slate-800">אימייל מנהל / טכנאי *</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute right-3.5 top-3 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@domain.com"
                  className="w-full pr-10 pl-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-600 font-medium transition"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold mb-1.5 text-slate-800">סיסמה *</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute right-3.5 top-3 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="הזן סיסמה..."
                  className="w-full pr-10 pl-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-600 font-medium transition"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold mb-1.5 text-slate-800">תפקיד להתחברות</label>
              <div className="grid grid-cols-2 gap-2 font-bold text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedRole('manager')}
                  className={`py-2 px-3 rounded-xl border transition ${
                    selectedRole === 'manager'
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  מנהל (Manager)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRole('admin')}
                  className={`py-2 px-3 rounded-xl border transition ${
                    selectedRole === 'admin'
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  טכנאי (IT Tech)
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:from-slate-300 disabled:to-slate-300 text-white rounded-xl font-black shadow-md shadow-indigo-500/20 transition flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              <span>{submitting ? 'מתחבר...' : 'התחבר עכשיו'}</span>
            </button>
          </form>
        )}

        <div className="text-center pt-2 border-t border-slate-100">
          <a
            href={`/${tenantSlug}/users`}
            className="text-xs font-bold text-slate-500 hover:text-indigo-600 transition inline-flex items-center gap-1"
          >
            <span>מעבר לפורטל פתיחת קריאות</span>
            <ArrowLeft className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}

export default function TenantLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F8FAFC]" />}>
      <TenantLoginComponent />
    </Suspense>
  );
}