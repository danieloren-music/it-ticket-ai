'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Mail } from 'lucide-react';
import { api, errorText } from '@/lib/api';
import { useLang } from '@/lib/i18n';
import { Brand, Field, LangSwitch, Spinner, btnPrimary, inputCls } from '@/components/ui';
import { PLATFORM_EMAIL_DOMAIN } from '@/lib/constants';

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
      await api('/api/platform/auth', { method: 'POST', json: { email: `${username.trim()}@${PLATFORM_EMAIL_DOMAIN}`, password } });
      router.replace('/platform');
      router.refresh();
    } catch (ex) { setError(errorText(ex, lang)); setBusy(false); }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-canvas p-4">
      <div className="absolute end-4 top-4"><LangSwitch /></div>
      <div className="w-full max-w-lg">
        <div className="mb-8 flex justify-center"><Brand size={56} /></div>
        <div className="rounded-2xl border border-line bg-white p-8 shadow-sm sm:p-12">
          <h1 className="text-2xl font-bold">SmartQ Platform</h1>
          <p className="mt-1 text-sm text-ink-soft">{t('גישה לצוות SmartQ בלבד.', 'SmartQ staff only.')}</p>
          <form onSubmit={submit} className="mt-7 space-y-5">
            <Field label={t('שם משתמש', 'Username')}>
              <div dir="ltr" className="flex overflow-hidden rounded-lg border border-line bg-white transition focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
                <div className="relative min-w-0 flex-1">
                  <Mail className="pointer-events-none absolute start-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input type="text" required pattern="[^@\s]+" maxLength={64} dir="ltr" autoComplete="username" autoCapitalize="none" spellCheck={false} className={`${inputCls} min-w-0 border-0 ps-9 focus:border-0 focus:ring-0`} value={username} onChange={(e) => setUsername(e.target.value)} />
                </div>
                <div title={`@${PLATFORM_EMAIL_DOMAIN}`} className="max-w-[55%] flex-none overflow-x-auto whitespace-nowrap border-s border-line bg-slate-50 px-3 py-2 text-sm text-ink-soft">@{PLATFORM_EMAIL_DOMAIN}</div>
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
