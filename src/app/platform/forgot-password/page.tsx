'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Mail } from 'lucide-react';
import { api, errorText } from '@/lib/api';
import { useLang } from '@/lib/i18n';
import { Brand, Field, LangSwitch, Spinner, btnPrimary, inputCls } from '@/components/ui';

export default function ForgotPlatformPasswordPage() {
  const { t, lang } = useLang();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/api/platform/password-reset/request', { method: 'POST', json: { email } });
      setSent(true);
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
          <h1 className="text-2xl font-bold">{t('איפוס סיסמה', 'Reset password')}</h1>
          <p className="mt-2 text-sm text-ink-soft">
            {t('נשלח קישור איפוס לכתובת האימייל של מנהל SmartQ, אם החשבון קיים.', 'We will send a reset link to the SmartQ admin email if an account exists.')}
          </p>
          {sent ? (
            <p role="status" className="mt-6 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {t('אם קיים חשבון לכתובת הזו, נשלח אליו קישור איפוס. בדקו גם את תיקיית הספאם.', 'If an account exists for that email, a reset link has been sent. Check your spam folder too.')}
            </p>
          ) : (
            <form onSubmit={submit} className="mt-7 space-y-5">
              <Field label={t('אימייל', 'Email')}>
                <div className="relative">
                  <Mail className="pointer-events-none absolute start-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input type="email" required dir="ltr" autoComplete="username" className={`${inputCls} ps-9`} value={email} onChange={(event) => setEmail(event.target.value)} />
                </div>
              </Field>
              {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</p>}
              <button type="submit" disabled={busy} className={`${btnPrimary} w-full`}>{busy && <Spinner />}{t('שליחת קישור איפוס', 'Send reset link')}</button>
            </form>
          )}
        </div>
        <p className="mt-5 text-center text-sm">
          <Link href="/platform/login" className="text-ink-soft hover:text-ink">{t('חזרה לכניסה', 'Back to sign in')}</Link>
        </p>
      </div>
    </div>
  );
}
