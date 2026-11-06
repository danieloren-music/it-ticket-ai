'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Building2, KeyRound, Languages, LogOut, Menu, Moon, Sun, UserRound, X } from 'lucide-react';
import { useLang } from '@/lib/i18n';
import { useTheme } from './ThemeProvider';
import { LangSwitch } from './ui';

export interface ConsoleNavItem {
  key: string;
  label: string;
  icon: LucideIcon;
  href?: string;
  active?: boolean;
  onClick?: () => void;
}

export interface ConsoleNavGroup {
  key: string;
  label: string;
  icon: LucideIcon;
  items: ConsoleNavItem[];
}

interface Props {
  workspace: string;
  identity: string;
  secondaryIdentity: string;
  groups: ConsoleNavGroup[];
  onProfile: () => void;
  onChangePassword?: () => void;
  onLogout: () => void;
  suffix?: ReactNode;
}

export function ConsoleSidebar({ workspace, identity, secondaryIdentity, groups, onProfile, onChangePassword, onLogout, suffix }: Props) {
  const { t } = useLang();
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const closeMobile = () => setMobileOpen(false);
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileOpen(false);
        setActiveGroup(null);
      }
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, []);

  const renderItem = (item: ConsoleNavItem) => {
    const Icon = item.icon;
    const className = `flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start text-sm font-medium transition ${
      item.active ? 'bg-brand-soft text-brand' : 'text-ink-soft hover:bg-canvas hover:text-ink'
    }`;
    const content = <><Icon className="h-4 w-4 shrink-0" /><span className="truncate">{item.label}</span></>;
    const onClick = () => {
      item.onClick?.();
      closeMobile();
      setActiveGroup(null);
    };

    return item.href
      ? <Link key={item.key} href={item.href} aria-current={item.active ? 'page' : undefined} onClick={onClick} className={className}>{content}</Link>
      : <button key={item.key} type="button" aria-current={item.active ? 'page' : undefined} onClick={onClick} className={className}>{content}</button>;
  };

  const renderAccountActions = (compact = false) => (
    <div className={compact ? 'space-y-1' : 'flex flex-col items-center gap-2'}>
      <button type="button" onClick={() => { toggleTheme(); setActiveGroup(null); }} title={theme === 'dark' ? t('מצב בהיר', 'Light mode') : t('מצב כהה', 'Dark mode')} aria-label={theme === 'dark' ? t('מצב בהיר', 'Light mode') : t('מצב כהה', 'Dark mode')} className={compact ? 'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start text-sm font-medium text-ink-soft hover:bg-canvas hover:text-ink' : 'grid h-10 w-10 place-items-center rounded-xl text-white/75 transition hover:bg-white/10 hover:text-white'}>
        {theme === 'dark' ? <Sun className="h-4 w-4 shrink-0" /> : <Moon className="h-4 w-4 shrink-0" />}
        {compact && <span>{theme === 'dark' ? t('מצב בהיר', 'Light mode') : t('מצב כהה', 'Dark mode')}</span>}
      </button>
      {onChangePassword && (
        <button type="button" onClick={() => { onChangePassword(); closeMobile(); setActiveGroup(null); }} title={t('שינוי סיסמה', 'Change password')} aria-label={t('שינוי סיסמה', 'Change password')} className={compact ? 'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start text-sm font-medium text-ink-soft hover:bg-canvas hover:text-ink' : 'grid h-10 w-10 place-items-center rounded-xl text-white/75 transition hover:bg-white/10 hover:text-white'}>
          <KeyRound className="h-4 w-4 shrink-0" />
          {compact && <span>{t('שינוי סיסמה', 'Change password')}</span>}
        </button>
      )}
      <button type="button" onClick={() => { onProfile(); closeMobile(); setActiveGroup(null); }} title={t('הפרופיל שלי', 'My profile')} aria-label={t('הפרופיל שלי', 'My profile')} className={compact ? 'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start text-sm font-medium text-ink-soft hover:bg-canvas hover:text-ink' : 'grid h-10 w-10 place-items-center rounded-xl text-white/75 transition hover:bg-white/10 hover:text-white'}>
        <UserRound className="h-4 w-4 shrink-0" />
        {compact && <span>{t('הפרופיל שלי', 'My profile')}</span>}
      </button>
      <button type="button" onClick={() => { onLogout(); closeMobile(); setActiveGroup(null); }} title={t('התנתקות', 'Sign out')} aria-label={t('התנתקות', 'Sign out')} className={compact ? 'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start text-sm font-medium text-rose-600 hover:bg-rose-50' : 'grid h-10 w-10 place-items-center rounded-xl text-rose-200 transition hover:bg-rose-500/20 hover:text-white'}>
        <LogOut className="h-4 w-4 shrink-0" />
        {compact && <span>{t('התנתקות', 'Sign out')}</span>}
      </button>
    </div>
  );

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-white px-4 shadow-sm lg:hidden">
        <button type="button" aria-label={t('פתיחת תפריט', 'Open menu')} aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)} className="rounded-lg p-2 hover:bg-canvas">
          <Menu className="h-5 w-5" />
        </button>
        <span className="inline-flex items-center gap-2">
          <Image src="/smartq-brand-mark.png" alt="" width={28} height={28} className="rounded-md" />
          <span className="text-xl font-bold tracking-tight text-ink">SmartQ</span>
          {suffix}
        </span>
        <span className="w-9" />
      </header>

      <aside aria-label={t('תפריט ראשי', 'Main menu')} className="fixed inset-y-0 left-0 z-40 hidden w-14 flex-col items-center bg-[#173b5b] text-white shadow-lg lg:flex">
        <Link href="/home" aria-label={workspace} title={workspace} className="grid h-14 w-full shrink-0 place-items-center border-b border-white/10">
          <Image src="/smartq-brand-mark.png" alt="" width={30} height={30} className="rounded-md bg-white p-0.5" />
        </Link>
        <nav className="flex w-full flex-1 flex-col items-center gap-2 py-3">
          {groups.map((group) => {
            const Icon = group.icon;
            const expanded = activeGroup === group.key;
            const isActive = group.items.some((item) => item.active);
            return (
              <div
                key={group.key}
                className="group/nav relative w-full px-1.5"
                onMouseEnter={() => setActiveGroup(group.key)}
                onMouseLeave={() => setActiveGroup((current) => current === group.key ? null : current)}
              >
                <button
                  type="button"
                  aria-label={group.label}
                  aria-haspopup="true"
                  aria-expanded={expanded}
                  title={group.label}
                  onFocus={() => setActiveGroup(group.key)}
                  onClick={() => setActiveGroup((current) => current === group.key ? null : group.key)}
                  className={`grid h-11 w-11 place-items-center rounded-xl transition ${isActive || expanded ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
                >
                  <Icon className="h-5 w-5" />
                </button>
                <div className={`invisible absolute left-full top-0 z-50 w-56 -translate-x-1 rounded-xl border border-line bg-white p-2 text-ink opacity-0 shadow-xl transition duration-150 group-hover/nav:visible group-hover/nav:translate-x-0 group-hover/nav:opacity-100 group-focus-within/nav:visible group-focus-within/nav:translate-x-0 group-focus-within/nav:opacity-100 ${expanded ? '!visible !translate-x-0 !opacity-100' : ''}`}>
                  <p className="px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">{group.label}</p>
                  <div className="space-y-1">{group.items.map((item) => renderItem(item))}</div>
                </div>
              </div>
            );
          })}
        </nav>
        <div className="flex w-full flex-col items-center gap-2 border-t border-white/10 py-3">
          <div className="group/lang relative">
            <button type="button" title={t('שפה', 'Language')} aria-label={t('שפה', 'Language')} className="grid h-10 w-10 place-items-center rounded-xl text-white/75 hover:bg-white/10 hover:text-white"><Languages className="h-4 w-4" /></button>
            <div className="invisible absolute bottom-0 left-full z-50 translate-x-1 rounded-xl border border-line bg-white p-2 opacity-0 shadow-xl transition group-hover/lang:visible group-hover/lang:translate-x-0 group-hover/lang:opacity-100 group-focus-within/lang:visible group-focus-within/lang:translate-x-0 group-focus-within/lang:opacity-100">
              <LangSwitch />
            </div>
          </div>
          {renderAccountActions()}
          <div className="mt-1 grid h-10 w-10 place-items-center rounded-full bg-white/15 text-xs font-bold" title={`${identity} · ${secondaryIdentity}`}>
            {identity.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || '?'}
          </div>
        </div>
      </aside>

      {mobileOpen && <button type="button" aria-label={t('סגירת תפריט', 'Close menu')} onClick={closeMobile} className="fixed inset-0 z-40 bg-ink/40 lg:hidden" />}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-line bg-white shadow-xl transition-transform duration-200 lg:hidden ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-16 items-center justify-between border-b border-line px-5">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">{t('סביבת עבודה', 'WORKSPACE')}</p>
            <p className="mt-1 flex items-center gap-2 truncate text-sm font-semibold"><Building2 className="h-4 w-4 shrink-0 text-brand" />{workspace}{suffix}</p>
          </div>
          <button type="button" aria-label={t('סגירה', 'Close')} onClick={closeMobile} className="rounded-lg p-2 hover:bg-canvas"><X className="h-4 w-4" /></button>
        </div>
        <nav aria-label={t('תפריט ראשי', 'Main menu')} className="flex-1 space-y-4 overflow-y-auto p-3">
          {groups.map((group) => (
            <section key={group.key}>
              <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wide text-ink-soft">{group.label}</p>
              <div className="space-y-1">{group.items.map(renderItem)}</div>
            </section>
          ))}
        </nav>
        <div className="border-t border-line p-3">
          <LangSwitch />
          <div className="mt-2 space-y-1">{renderAccountActions(true)}</div>
          <div className="mt-3 flex items-center gap-3 rounded-xl bg-canvas p-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink text-xs font-bold text-white">{identity.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || '?'}</span>
            <div className="min-w-0"><p className="truncate text-sm font-semibold text-ink">{identity}</p><p className="truncate text-xs text-ink-soft">{secondaryIdentity}</p></div>
          </div>
        </div>
      </aside>
    </>
  );
}
