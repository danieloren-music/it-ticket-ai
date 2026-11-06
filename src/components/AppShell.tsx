'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { ExternalLink, Inbox, MessageSquare, Settings2 } from 'lucide-react';
import { useLang } from '@/lib/i18n';
import { ROLE_LABELS, label } from '@/lib/constants';
import type { SessionInfo } from '@/hooks/useSession';
import { ConsoleSidebar, type ConsoleNavGroup } from './ConsoleSidebar';
import { A11yWidget } from './A11yWidget';
import { TenantProfileDialog } from './TenantProfileDialog';
import { ChangePasswordDialog } from './ChangePasswordDialog';
import { Spinner } from './ui';

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

export function AppShell({ tenant, tenantName, session, active, onLogout, onReload, actions, children }: Props) {
  const { t, lang } = useLang();
  const [pwOpen, setPwOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const canManage = ['directory:manage', 'settings:manage', 'audit:read', 'groups:manage', 'automations:manage', 'api_keys:manage']
    .some((permission) => session?.permissions.includes(permission));
  const groups: ConsoleNavGroup[] = [
    {
      key: 'requests',
      label: t('קריאות שירות', 'Service requests'),
      icon: MessageSquare,
      items: [
        { key: 'self-service', href: `/${tenant}/self-service`, label: t('פתיחת קריאה', 'New request'), icon: MessageSquare, active: active === 'self-service' },
        { key: 'admins', href: `/${tenant}/admins`, label: t('תור קריאות', 'Service queue'), icon: Inbox, active: active === 'admins' },
      ].filter((item) => item.key !== 'admins' || session?.role !== 'user' || session.permissions.includes('tickets:read_all')),
    },
    ...(canManage || session?.role === 'manager' ? [{
      key: 'administration',
      label: t('ניהול', 'Administration'),
      icon: Settings2,
      items: [{ key: 'manage', href: `/${tenant}/manage`, label: t('ניהול הארגון', 'Organization administration'), icon: Settings2, active: active === 'manage' }],
    }] : []),
    {
      key: 'website',
      label: t('SmartQ', 'SmartQ'),
      icon: ExternalLink,
      items: [{ key: 'website', href: '/home', label: t('לאתר SmartQ', 'SmartQ Website'), icon: ExternalLink }],
    },
  ];

  if (!session) return <div className="grid min-h-screen place-items-center text-brand"><Spinner className="h-6 w-6" /></div>;

  return (
    <div className="min-h-screen">
      <a href="#main" className="skip-link">{t('דלג לתוכן', 'Skip to content')}</a>
      <ConsoleSidebar
        workspace={tenantName}
        identity={session.name}
        secondaryIdentity={label(ROLE_LABELS, session.role === 'manager' ? 'Manager' : session.role === 'admin' ? 'Admin' : 'User', lang)}
        groups={groups}
        onProfile={() => setProfileOpen(true)}
        onChangePassword={session.demo ? undefined : () => setPwOpen(true)}
        onLogout={onLogout}
        suffix={<span className="rounded-md bg-ink px-1.5 py-0.5 text-[10px] font-medium text-white">IT</span>}
      />
      <main id="main" className="min-h-screen pt-14 lg:ml-14 lg:pt-0">
        {session.demo && (
          <div className="bg-ink px-4 py-1.5 text-center text-xs text-white">
            {t('סביבת הדגמה ציבורית – הנתונים מתאפסים כל 24 שעות ופעולות ניהול משתמשים מושבתות. ', 'Public demo – data resets every 24 hours and user administration is disabled. ')}
            <Link href="/home" className="font-semibold underline underline-offset-2">{t('חזרה לאתר', 'SmartQ Website')}</Link>
          </div>
        )}
        {actions && <div className="mx-auto flex max-w-7xl justify-end px-4 pt-4 sm:px-6">{actions}</div>}
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">{children}</div>
      </main>
      {profileOpen && <TenantProfileDialog open name={session.name} email={session.email} onClose={() => setProfileOpen(false)} onSaved={onReload} />}
      <ChangePasswordDialog open={pwOpen || session.mustChangePassword} forced={session.mustChangePassword} onClose={() => setPwOpen(false)} onDone={() => { setPwOpen(false); onReload(); }} />
      <A11yWidget />
    </div>
  );
}
