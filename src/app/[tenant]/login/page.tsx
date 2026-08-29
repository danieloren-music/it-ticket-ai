'use client';

import { useState, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { 
  Building2, 
  LogIn, 
  KeyRound, 
  ShieldCheck, 
  AlertCircle, 
  ArrowRight,
  Sparkles,
  Lock,
  Mail
} from 'lucide-react';

function LoginContent() {
  const params = useParams();
  const rawTenant = (params?.tenant as string) || '';
  const tenantSlug = rawTenant.toLowerCase();
  
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo') || `/${rawTenant}/new-request`;

  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/auth/local-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantSlug,
          email,
          password
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'ההתחברות נכשלה');

      router.push(returnTo);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col justify-center items-center p-4 font-sans antialiased select-none">
      
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-8 shadow-xl space-y-6">
        
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl overflow-hidden bg-white border border-slate-100 flex items-center justify-center mx-auto p-1.5 shadow-md">
            <Image src="/smartq-logo.png" alt="SmartQ" width={44} height={44} className="object-contain" priority />
          </div>
          <div>
            <div className="flex items-center justify-center gap-1.5">
              <span className="text-lg font-black text-slate-900">SmartQ Enterprise</span>
              <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 font-extrabold px-2 py-0.5 rounded-md uppercase">
                AI DESK
              </span>
            </div>
            <div className="flex items-center justify-center gap-1 text-xs font-bold text-slate-500 mt-1">
              <Building2 className="w-3.5 h-3.5 text-indigo-600" />
              <span>הזדהות לסביבת {rawTenant.toUpperCase()}</span>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Local Login Form */}
        <form onSubmit={handleLogin} className="space-y-4 text-xs font-bold">
          <div>
            <label className="block mb-1 text-slate-800">אימייל ארגוני</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={`user@${tenantSlug}.co.il`}
                className="w-full pr-9 pl-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 focus:outline-none focus:border-indigo-600 font-mono font-semibold"
              />
            </div>
          </div>

          <div>
            <label className="block mb-1 text-slate-800">סיסמה</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pr-9 pl-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 focus:outline-none focus:border-indigo-600 font-semibold"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-black shadow-md transition flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            <span>{loading ? 'מאמת פרטים...' : 'התחבר עכשיו'}</span>
          </button>
        </form>

        {/* Entra ID SSO Button */}
        <div className="pt-4 border-t border-slate-200 text-center space-y-3">
          <span className="text-[11px] text-slate-400 font-bold block">או התחבר באמצעות Identity Provider</span>
          <a
            href={`/api/auth/saml/login?tenant=${tenantSlug}`}
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold border border-slate-200 transition flex items-center justify-center gap-2"
          >
            <KeyRound className="w-4 h-4 text-indigo-600" />
            <span>התחבר עם Microsoft Entra ID</span>
          </a>
        </div>

      </div>

    </div>
  );
}

export default function TenantLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F8FAFC]" />}>
      <LoginContent />
    </Suspense>
  );
}