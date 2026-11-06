'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Building2, KeyRound, LogOut, Menu, Moon, Sun, UserRound, X } from 'lucide-react';
import { useLang } from '@/lib/i18n';
import { useTheme } from './ThemeProvider';
import { Brand, LangSwitch } from './ui';

export interface ConsoleNavItem {
  key: string;
  label: string;
  icon: LucideIcon;
  href?: string;
  active?: boolean;
  visible?: boolean;
  onClick?: () => void;
}

interface Props {
  workspace: string;
  identity: string;
  secondaryIdentity: string;
  items: ConsoleNavItem[];
  onProfile: () => void;
  onChangePassword?: () => void;
  onLogout: () => void;
  suffix?: ReactNode;
}

export function ConsoleSidebar({ workspace, identity, secondaryIdentity, items, onProfile, onChangePassword, onLogout, suffix }: Props) {
  const { t } = useLang();
  const { theme, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-white px-4 shadow-sm lg:hidden">
        <button type="button" aria-label={t('פתיחת תפריט', 'Open menu')} onClick={() => setOpen(true)} className="rounded-lg p-2 hover:bg-canvas">
          <Menu className="h-5 w-5" />
        </button>
        <Brand size={30} large />
        <span className="w-9" />
      </header>

      {open && <button type="button" aria-label={t('סגירת תפריט', 'Close menu')} onClick={close} className="fixed inset-0 z-40 bg-ink/40 lg:hidden" />}
      <aside className={`fixed inset-y-0 start-0 z-50 flex w-64 flex-col border-e border-line bg-white shadow-xl transition-transform duration-200 lg:translate-x-0 lg:shadow-none ${open ? 'translate-x-0' : '-translate-x-full rtl:translate-x-full'}`}>
        <div className="flex h-16 items-center justify-between border-b border-line px-5">
          <Brand size={34} suffix={suffix} />
          <button type="button" aria-label={t('סגירה', 'Close')} onClick={close} className="rounded-lg p-2 hover:bg-canvas lg:hidden"><X className="h-4 w-4" /></button>
        </div>
        <div className="border-b border-line px-5 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">{t('סביבת עבודה', 'WORKSPACE')}</p>
          <p className="mt-1 flex items-center gap-2 truncate text-sm font-semibold"><Building2 className="h-4 w-4 shrink-0 text-brand" />{workspace}</p>
        </div>
        <nav aria-label={t('תפריט ראשי', 'Main menu')} className="flex-1 space-y-1 overflow-y-auto p-3">
          {items.map(({ key, label, icon: Icon, href, active, onClick }) => {
            const className = `flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start text-sm font-medium transition ${active ? 'bg-brand-soft text-brand' : 'text-ink-soft hover:bg-canvas hover:text-ink'}`;
            const content = <><Icon className="h-4 w-4 shrink-0" /><span className="truncate">{label}</span></>;
            return href
              ? <Link key={key} href={href} aria-current={active ? 'page' : undefined} onClick={close} className={className}>{content}</Link>
              : <button key={key} type="button" aria-current={active ? 'page' : undefined} onClick={() => { onClick?.(); close(); }} className={className}>{content}</button>;
          })}
        </nav>
        <div className="border-t border-line p-3">
          <LangSwitch />
          <button type="button" onClick={toggleTheme} className="mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-soft hover:bg-canvas hover:text-ink">
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {theme === 'dark' ? t('מצב בהיר', 'Light mode') : t('מצב כהה', 'Dark mode')}
          </button>
          {onChangePassword && (
            <button type="button" onClick={onChangePassword} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-soft hover:bg-canvas hover:text-ink">
              <KeyRound className="h-4 w-4" />{t('שינוי סיסמה', 'Change password')}
            </button>
          )}
          <div className="mt-2 flex items-center gap-2 rounded-xl bg-canvas p-2.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink text-xs font-bold text-white">{identity.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || '?'}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">{identity}</p>
              <p className="truncate text-xs text-ink-soft">{secondaryIdentity}</p>
            </div>
            <button type="button" title={t('הפרופיל שלי', 'My profile')} aria-label={t('הפרופיל שלי', 'My profile')} onClick={onProfile} className="rounded-lg p-2 text-ink-soft hover:bg-white hover:text-brand"><UserRound className="h-4 w-4" /></button>
            <button type="button" title={t('התנתקות', 'Sign out')} aria-label={t('התנתקות', 'Sign out')} onClick={onLogout} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50"><LogOut className="h-4 w-4" /></button>
          </div>
        </div>
      </aside>
    </>
  );
}
