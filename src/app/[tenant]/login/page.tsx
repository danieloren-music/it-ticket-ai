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
  KeyRound,
  LogIn
} from 'lucide-react';

function TenantLoginComponent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const tenantSlug = (params?.tenant as string) || '';
  const returnTo = searchParams.get('returnTo') || `/${tenantSlug}/users`;

  const [tenantName, setTenantName] = useState<string>('');
  const [hasSso, setHasSso] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  // Form states
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
        supabase.from('tenants').select('*').eq('id', tenantSlug).single(),
        supabase.from('tenant_settings').select('*').eq('tenant_id', tenantSlug).single()
      ]);

      if (tenantRes.data) {
        setTenantName(tenantRes.data.name);
        if (tenantRes.data.admin_email && !email) {
          setEmail(tenantRes.data.admin_email);
        }
      } else {
        setTenantName(tenantSlug.toUpperCase());
      }

      const ssoUrl = settingsRes.data?.saml_login_url || tenantRes.data?.saml_login_url;
      setHasSso(!!ssoUrl);
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
        throw new Error(data.error || 'התחברות נכשלה');
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
          <h1 className="text-xl font-black text-slate-950">כניסה למערכת</h1>
          <p className="text-xs text-slate-500 font-medium">הזדהות עבור מנהלי מערכת וטכנאי IT</p>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* SSO Button (If configured) */}
        {hasSso && (
          <div className="space-y-3">
            <button
              onClick={handleSsoRedirect}
              type="button"
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black shadow-md transition flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>התחבר באמצעות SSO / Microsoft Entra ID</span>
            </button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-[11px] font-bold text-slate-400">או כניסה מקומית</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>
          </div>
        )}

        {/* Local Login Form */}
        <form onSubmit={handleLocalLogin} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold mb-1.5 text-slate-800">אימייל מנהל / טכנאי *</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute right-3.5 top-3 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@company.com"
                className="w-full pr-10 pl-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-600 font-medium transition"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold mb-1.5 text-slate-800">סיסמה מקומית *</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute right-3.5 top-3 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="הזן סיסמת ניהול..."
                className="w-full pr-10 pl-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-600 font-medium transition"
              />
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">סיסמת ברירת מחדל ראשונית: SmartQ2026!</span>
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
            <span>{submitting ? 'מתחבר למערכת...' : 'התחבר עכשיו'}</span>
          </button>
        </form>

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