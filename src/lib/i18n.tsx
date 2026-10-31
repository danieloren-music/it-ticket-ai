'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Lang = 'he' | 'en';
const KEY = 'smartq_lang';

interface LangCtx {
  lang: Lang;
  isHe: boolean;
  dir: 'rtl' | 'ltr';
  setLang: (l: Lang) => void;
  /** t('עברית', 'English') */
  t: (he: string, en: string) => string;
}

const Ctx = createContext<LangCtx | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('he');

  useEffect(() => {
    try {
      const stored = localStorage.getItem(KEY);
      if (stored === 'en' || stored === 'he') setLangState(stored);
    } catch { /* storage unavailable */ }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { localStorage.setItem(KEY, l); } catch { /* ignore */ }
  }, []);

  const value = useMemo<LangCtx>(
    () => ({ lang, isHe: lang === 'he', dir: lang === 'he' ? 'rtl' : 'ltr', setLang, t: (he, en) => (lang === 'he' ? he : en) }),
    [lang, setLang]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLang(): LangCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useLang must be used inside <LangProvider>');
  return v;
}

export function fmtDateTime(iso: string | null | undefined, lang: Lang): string {
  if (!iso) return '–';
  return new Date(iso).toLocaleString(lang === 'he' ? 'he-IL' : 'en-GB', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

export function fmtDate(iso: string | null | undefined, lang: Lang): string {
  if (!iso) return '–';
  return new Date(iso).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function fmtDuration(minutes: number | null | undefined, lang: Lang): string {
  if (minutes === null || minutes === undefined) return '–';
  if (minutes < 60) return `${minutes} ${lang === 'he' ? 'דק׳' : 'min'}`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h < 48) return lang === 'he' ? `${h} שע׳${m ? ` ${m} דק׳` : ''}` : `${h}h${m ? ` ${m}m` : ''}`;
  return lang === 'he' ? `${Math.round(h / 24)} ימים` : `${Math.round(h / 24)} days`;
}
