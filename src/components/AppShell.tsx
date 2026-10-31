'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { ChevronDown, KeyRound, LogOut } from 'lucide-react';
import { useLang } from '@/lib/i18n';
import { ROLE_LABELS, label } from '@/lib/constants';
import type { SessionInfo } from '@/hooks/useSession';
import { A11yWidget } from './A11yWidget';
import { ChangePasswordDialog } from './ChangePasswordDialog';
import { Brand, LangSwitch, Spinner } from './ui';

export type NavKey = 'self-service' | 'admins' | 'manage';

interface Props {
  tenant: string;
  tenantName: string;
  session: SessionInfo | null;
  active: NavKey;
  onLogout: () => void;
  onReload: () => void;
  actions?: ReactNode;
  children: ReactNode;
}

const initials = (n: string) => n.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?';

export function AppShell({ tenant, tenantName, session, active, onLogout, onReload, actions, children }: Props) {
  const { t, lang } = useLang();
  const [menu, setMenu] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);

  const tabs: { key: NavKey; href: string; label: string; roles: string[] }[] = [
    { key: 'self-service', href: `/${tenant}/self-service`, label: t('פתיחת קריאה', 'New request'), roles: ['user', 'admin', 'manager'] },
    { key: 'admins', href: `/${tenant}/admins`, label: t('תור קריאות', 'Service queue'), roles: ['admin', 'manager'] },
    { key: 'manage', href: `/${tenant}/manage`, label: t('ניהול', 'Administration'), roles: ['manager'] },
  ];

  if (!session) return <div className="grid min-h-screen place-items-center text-brand"><Spinner className="h-6 w-6" /></div>;

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="skip-link">{t('דלג לתוכן', 'Skip to content')}</a>

      {session.demo && (
        <div className="bg-ink px-4 py-1.5 text-center text-xs text-white">
          {t('סביבת הדגמה ציבורית – הנתונים מתאפסים כל 24 שעות ופעולות ניהול משתמשים מושבתות. ', 'Public demo – data resets every 24 hours and user administration is disabled. ')}
          <Link href="/home" className="font-semibold underline underline-offset-2">{t('חזרה לאתר', 'Back to site')}</Link>
        </div>
      )}

      <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4 sm:px-6">
          <Brand size={28} />
          <span className="hidden rounded-md bg-canvas px-2 py-1 text-xs font-medium text-ink-soft sm:inline">{tenantName}</span>

          <nav aria-label="Main" className="flex flex-1 items-center gap-1">
            {tabs.filter((x) => x.roles.includes(session.role)).map((x) => (
              <Link key={x.key} href={x.href} aria-current={active === x.key ? 'page' : undefined}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${active === x.key ? 'bg-brand-soft text-brand' : 'text-ink-soft hover:bg-slate-100 hover:text-ink'}`}>
                {x.label}
              </Link>
            ))}
          </nav>

          {actions}
          <LangSwitch />

          <div className="relative">
            <button type="button" onClick={() => setMenu(!menu)} aria-expanded={menu} aria-haspopup="menu" className="flex items-center gap-2 rounded-lg p-1 hover:bg-slate-100">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-ink text-xs font-bold text-white">{initials(session.name)}</span>
              <span className="hidden text-start leading-tight md:block">
                <span className="block text-sm font-semibold">{session.name}</span>
                <span className="block text-xs text-ink-soft">{label(ROLE_LABELS, session.role === 'manager' ? 'Manager' : session.role === 'admin' ? 'Admin' : 'User', lang)}</span>
              </span>
              <ChevronDown className="h-4 w-4 text-ink-soft" />
            </button>
            {menu && (
              <div role="menu" className="rise absolute end-0 mt-2 w-60 rounded-xl border border-line bg-white p-1.5 shadow-lg" onMouseLeave={() => setMenu(false)}>
                <div className="border-b border-line px-3 py-2 text-xs text-ink-soft"><span className="block truncate font-medium text-ink">{session.email}</span></div>
                {!session.demo && (
                  <button role="menuitem" type="button" onClick={() => { setMenu(false); setPwOpen(true); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-slate-100"><KeyRound className="h-4 w-4" />{t('שינוי סיסמה', 'Change password')}</button>
                )}
                <button role="menuitem" type="button" onClick={onLogout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-rose-600 hover:bg-rose-50"><LogOut className="h-4 w-4" />{t('התנתקות', 'Sign out')}</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">{children}</main>

      <A11yWidget />
      <ChangePasswordDialog open={pwOpen || session.mustChangePassword} forced={session.mustChangePassword} onClose={() => setPwOpen(false)} onDone={() => { setPwOpen(false); onReload(); }} />
    </div>
  );
}
