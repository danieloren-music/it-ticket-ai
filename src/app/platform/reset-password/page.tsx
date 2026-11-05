'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Lock } from 'lucide-react';
import { api, errorText } from '@/lib/api';
import { useLang } from '@/lib/i18n';
import { Brand, Field, LangSwitch, Spinner, btnPrimary, inputCls } from '@/components/ui';

export default function ResetPlatformPasswordPage() {
  const { t, lang } = useLang();
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    setToken(fragment.get('token') ?? '');
    window.history.replaceState(null, '', '/platform/reset-password');
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (password !== confirmation) {
      setError(t('הסיסמאות אינן תואמות', 'Passwords do not match'));
      return;
    }
    setBusy(true);
    try {
      await api('/api/platform/password-reset/reset', { method: 'POST', json: { token, password } });
      setComplete(true);
    } catch (ex) {
      setError(errorText(ex, lang));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-canvas p-4">
      <div className="absolute end-4 top-4"><LangSwitch /></div>
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center"><Brand size={44} /></div>
        <div className="rounded-2xl border border-line bg-white p-8 shadow-sm sm:p-10">
          <h1 className="text-2xl font-bold">{t('בחירת סיסמה חדשה', 'Choose a new password')}</h1>
          {complete ? (
            <>
              <p role="status" className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                {t('הסיסמה עודכנה. התחברו עם הסיסמה החדשה.', 'Your password was updated. Sign in with your new password.')}
              </p>
              <Link href="/platform/login" className={`${btnPrimary} mt-5 w-full`}>{t('מעבר לכניסה', 'Go to sign in')}</Link>
            </>
          ) : (
            <form onSubmit={submit} className="mt-7 space-y-5">
              <Field label={t('סיסמה חדשה', 'New password')} hint={t('לפחות 10 תווים, כולל אותיות וספרות', 'At least 10 characters, including letters and digits')}>
                <div className="relative">
                  <Lock className="pointer-events-none absolute start-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input type="password" required minLength={10} maxLength={128} autoComplete="new-password" className={`${inputCls} ps-9`} value={password} onChange={(event) => setPassword(event.target.value)} />
                </div>
              </Field>
              <Field label={t('אימות סיסמה', 'Confirm password')}>
                <div className="relative">
                  <Lock className="pointer-events-none absolute start-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input type="password" required minLength={10} maxLength={128} autoComplete="new-password" className={`${inputCls} ps-9`} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
                </div>
              </Field>
              {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</p>}
              <button type="submit" disabled={busy || !token} className={`${btnPrimary} w-full`}>{busy && <Spinner />}{t('עדכון סיסמה', 'Update password')}</button>
              {!token && <p role="alert" className="text-sm text-rose-700">{t('קישור האיפוס חסר או שאינו תקף. בקשו קישור חדש.', 'The reset link is missing or invalid. Request a new link.')}</p>}
            </form>
          )}
        </div>
        <p className="mt-5 text-center text-sm">
          <Link href="/platform/forgot-password" className="text-ink-soft hover:text-ink">{t('בקשת קישור חדש', 'Request a new link')}</Link>
        </p>
      </div>
    </div>
  );
}
