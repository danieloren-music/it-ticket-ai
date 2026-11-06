'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Mail } from 'lucide-react';
import { api, errorText } from '@/lib/api';
import { useLang } from '@/lib/i18n';
import { Brand, Field, LangSwitch, Spinner, btnPrimary, inputCls } from '@/components/ui';

export default function PlatformLoginPage() {
  const { t, lang } = useLang();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      await api('/api/platform/auth', { method: 'POST', json: { email: `${username.trim()}@smartq-ai.com`, password } });
      router.replace('/platform');
      router.refresh();
    } catch (ex) { setError(errorText(ex, lang)); setBusy(false); }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-canvas p-4">
      <div className="absolute end-4 top-4"><LangSwitch /></div>
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center"><Brand size={44} /></div>
        <div className="rounded-2xl border border-line bg-white p-8 shadow-sm sm:p-10">
          <h1 className="text-2xl font-bold">SmartQ Platform</h1>
          <p className="mt-1 text-sm text-ink-soft">{t('גישה לצוות SmartQ בלבד.', 'SmartQ staff only.')}</p>
          <form onSubmit={submit} className="mt-7 space-y-5">
            <Field label={t('שם משתמש', 'Username')}>
              <div className="relative flex" dir="ltr"><Mail className="pointer-events-none absolute start-3 top-2.5 h-4 w-4 text-slate-400" />
                <input type="text" required pattern="[^@\s]+" maxLength={64} dir="ltr" autoComplete="username" autoCapitalize="none" spellCheck={false} className={`${inputCls} rounded-e-none border-e-0 ps-9`} value={username} onChange={(e) => setUsername(e.target.value)} />
                <span className="inline-flex items-center rounded-e-lg border border-line bg-slate-50 px-3 text-sm text-ink-soft">@smartq-ai.com</span>
              </div>
            </Field>
            <Field label={t('סיסמה', 'Password')}>
              <div className="relative"><Lock className="pointer-events-none absolute start-3 top-2.5 h-4 w-4 text-slate-400" />
                <input type="password" required autoComplete="current-password" className={`${inputCls} ps-9`} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
            </Field>
            {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</p>}
            <button type="submit" disabled={busy} className={`${btnPrimary} w-full`}>{busy && <Spinner />}{t('כניסה', 'Sign in')}</button>
          </form>
          <p className="mt-4 text-center text-sm">
            <Link href="/platform/forgot-password" className="font-medium text-brand hover:underline">
              {t('שכחתם סיסמה?', 'Forgot your password?')}
            </Link>
          </p>
        </div>
        <p className="mt-5 text-center text-sm"><Link href="/home" className="text-ink-soft hover:text-ink">{t('לאתר SmartQ', 'Back to SmartQ')}</Link></p>
      </div>
    </div>
  );
}
