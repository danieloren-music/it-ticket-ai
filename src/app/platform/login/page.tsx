'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, Lock, Mail } from 'lucide-react';
import { api, errorText } from '@/lib/api';
import { useLang } from '@/lib/i18n';
import { Brand, Field, LangSwitch, Spinner, btnPrimary, btnSecondary, inputCls } from '@/components/ui';
import { PLATFORM_EMAIL_DOMAIN } from '@/lib/constants';

export default function PlatformLoginPage() {
  const { t, lang } = useLang();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [samlEnabled, setSamlEnabled] = useState(false);

  useEffect(() => {
    api<{ samlEnabled: boolean }>('/api/auth/platform/saml/status')
      .then((result) => setSamlEnabled(result.samlEnabled))
      .catch((ex) => setError(errorText(ex, lang)));

    const code = new URLSearchParams(window.location.search).get('error');
    const errors: Record<string, [string, string]> = {
      sso_failed: ['ההתחברות דרך Entra נכשלה. נסו שוב או פנו למנהל הפלטפורמה.', 'Entra sign-in failed. Try again or contact the platform administrator.'],
      sso_unavailable: ['שירות ההתחברות אינו זמין כרגע.', 'The sign-in service is temporarily unavailable.'],
      sso_not_configured: ['כניסת SAML לא הוגדרה עדיין.', 'SAML sign-in has not been configured yet.'],
      account_not_provisioned: ['למשתמש Entra אין משתמש ותפקיד שהוגדרו בצוות הפלטפורמה.', 'This Entra user has no provisioned Platform account and role.'],
    };
    const message = code ? errors[code] : undefined;
    if (!message) return;
    const timer = window.setTimeout(() => setError(lang === 'he' ? message[0] : message[1]), 0);
    return () => window.clearTimeout(timer);
  }, [lang]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const email = username.trim().includes('@') ? username.trim() : `${username.trim()}@${PLATFORM_EMAIL_DOMAIN}`;
      await api('/api/platform/auth', { method: 'POST', json: { email, password } });
      router.replace('/platform');
      router.refresh();
    } catch (ex) { setError(errorText(ex, lang)); setBusy(false); }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-canvas p-4">
      <div className="absolute end-4 top-4"><LangSwitch /></div>
      <div className="w-full max-w-xl">
        <div className="mb-8 flex justify-center"><Brand size={68} large /></div>
        <div className="rounded-2xl border border-line bg-white p-8 shadow-sm sm:p-14">
          <h1 className="text-2xl font-bold">SmartQ Platform</h1>
          <p className="mt-1 text-sm text-ink-soft">{t('גישה לצוות SmartQ בלבד.', 'SmartQ staff only.')}</p>
          <form onSubmit={submit} className="mt-7 space-y-5">
            <Field label={t('אימייל או שם משתמש', 'Email or username')}>
              <div className="relative">
                <Mail className="pointer-events-none absolute start-3 top-2.5 h-4 w-4 text-slate-400" />
                <input type="text" required maxLength={254} dir="ltr" autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder={`name@${PLATFORM_EMAIL_DOMAIN}`} className={`${inputCls} ps-9`} value={username} onChange={(e) => setUsername(e.target.value)} />
              </div>
            </Field>
            <Field label={t('סיסמה', 'Password')}>
              <div className="relative"><Lock className="pointer-events-none absolute start-3 top-2.5 h-4 w-4 text-slate-400" />
                <input type="password" required autoComplete="current-password" className={`${inputCls} ps-9`} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
            </Field>
            {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</p>}
            <button type="submit" disabled={busy} className={`${btnPrimary} w-full`}>{busy && <Spinner />}{t('כניסה', 'Sign in')}</button>
          </form>
          {samlEnabled && (
            <div className="mt-5 border-t border-line pt-5">
              <a href="/api/auth/platform/saml/login" className={`${btnSecondary} w-full`}>
                <KeyRound className="h-4 w-4 text-brand" />{t('כניסה עם Microsoft Entra ID', 'Sign in with Microsoft Entra ID')}
              </a>
            </div>
          )}
          <p className="mt-4 text-center text-sm">
            <Link href="/platform/forgot-password" className="font-medium text-brand hover:underline">
              {t('שכחתם סיסמה?', 'Forgot your password?')}
            </Link>
          </p>
        </div>
        <p className="mt-5 text-center text-sm"><Link href="/home" className="text-ink-soft hover:text-ink">{t('לאתר SmartQ', 'SmartQ Website')}</Link></p>
      </div>
    </div>
  );
}
