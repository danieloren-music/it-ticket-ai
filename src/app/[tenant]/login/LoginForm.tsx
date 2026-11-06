'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, KeyRound, Lock, Mail } from 'lucide-react';
import { api, errorText } from '@/lib/api';
import { useLang } from '@/lib/i18n';
import { Brand, Field, LangSwitch, Spinner, btnPrimary, btnSecondary, inputCls } from '@/components/ui';
import { A11yWidget } from '@/components/A11yWidget';

const SSO_ERRORS: Record<string, [string, string]> = {
  sso_failed: ['ההתחברות באמצעות SSO נכשלה. נסו שוב או פנו למנהל המערכת.', 'Single sign-on failed. Try again or contact your administrator.'],
  sso_unavailable: ['שירות ההתחברות הארגוני אינו זמין כרגע. נסו שוב או פנו למנהל המערכת.', 'Organization sign-in is unavailable. Try again or contact your administrator.'],
  sso_not_configured: ['SSO עדיין לא הוגדר לארגון זה.', 'SSO is not configured for this organization yet.'],
  account_disabled: ['החשבון הושבת. פנו למנהל המערכת.', 'This account is disabled. Contact your administrator.'],
  account_not_provisioned: ['החשבון אינו מוגדר בארגון. פנו למנהל המערכת.', 'Your account is not provisioned for this organization. Contact your administrator.'],
};

export default function LoginForm({ tenant, tenantName, tenantDomain, returnTo, initialError, isDemo, ssoProviders }: {
  tenant: string;
  tenantName: string;
  tenantDomain: string;
  returnTo: string;
  initialError?: string;
  isDemo: boolean;
  ssoProviders: { saml: boolean; oidc: boolean };
}) {
  const { t, lang } = useLang();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const sso = initialError ? SSO_ERRORS[initialError] : undefined;
  const [error, setError] = useState(sso ? (lang === 'he' ? sso[0] : sso[1]) : '');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      await api('/api/auth/local-login', { method: 'POST', json: { tenantSlug: tenant, email: `${username.trim()}@${tenantDomain}`, password } });
      router.replace(returnTo || `/${tenant}`);
      router.refresh();
    } catch (ex) { setError(errorText(ex, lang)); setBusy(false); }
  };

  const ssoQuery = `tenant=${encodeURIComponent(tenant)}${returnTo ? `&returnTo=${encodeURIComponent(returnTo)}` : ''}`;

  return (
    <div className="grid min-h-screen place-items-center bg-canvas p-4">
      <div className="absolute end-4 top-4"><LangSwitch /></div>
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center"><Brand size={44} /></div>
        <div className="rounded-2xl border border-line bg-white p-8 shadow-sm sm:p-10">
          <div className="mb-5">
            <h1 className="text-2xl font-bold">{t('כניסה למערכת', 'Sign in')}</h1>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-soft"><Building2 className="h-4 w-4" />{tenantName}</p>
          </div>

          {isDemo ? (
            <p className="text-sm text-ink-soft">{t('סביבת ההדגמה נפתחת מהאתר הראשי, בלי סיסמה.', 'The demo organization opens from the main site, no password needed.')}</p>
          ) : (
            <form onSubmit={submit} className="space-y-5">
              <Field label={t('שם משתמש', 'Username')}>
                <div className="relative flex" dir="ltr"><Mail className="pointer-events-none absolute start-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input type="text" required pattern="[^@\s]+" maxLength={64} dir="ltr" autoComplete="username" autoCapitalize="none" spellCheck={false} className={`${inputCls} rounded-e-none border-e-0 ps-9`} value={username} onChange={(e) => setUsername(e.target.value)} />
                  <span className="inline-flex items-center rounded-e-lg border border-line bg-slate-50 px-3 text-sm text-ink-soft">@{tenantDomain}</span>
                </div>
              </Field>
              <Field label={t('סיסמה', 'Password')}>
                <div className="relative"><Lock className="pointer-events-none absolute start-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input type="password" required autoComplete="current-password" className={`${inputCls} ps-9`} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
              </Field>
              {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</p>}
              <button type="submit" disabled={busy} className={`${btnPrimary} w-full`}>{busy && <Spinner />}{t('כניסה', 'Sign in')}</button>
            </form>
          )}

          {!isDemo && (ssoProviders.saml || ssoProviders.oidc) && (
            <div className="mt-5 border-t border-line pt-5">
              <p className="mb-3 text-sm font-semibold">{t('כניסה ארגונית', 'Organization sign-in')}</p>
              <div className="space-y-2">
                {ssoProviders.oidc && (
                  <a href={`/api/auth/oidc/login?${ssoQuery}`} className={`${btnSecondary} w-full`}>
                    <KeyRound className="h-4 w-4 text-brand" />{t('כניסה עם OpenID Connect', 'Sign in with OpenID Connect')}
                  </a>
                )}
                {ssoProviders.saml && (
                  <a href={`/api/auth/saml/login?${ssoQuery}`} className={`${btnSecondary} w-full`}>
                    <KeyRound className="h-4 w-4 text-brand" />{t('כניסה עם SAML 2.0', 'Sign in with SAML 2.0')}
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
        <p className="mt-5 text-center text-sm"><Link href="/home" className="text-ink-soft hover:text-ink">{t('לאתר SmartQ', 'Back to SmartQ')}</Link></p>
      </div>
      <A11yWidget />
    </div>
  );
}
