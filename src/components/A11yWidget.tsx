'use client';

import { useEffect, useState } from 'react';
import { Accessibility, RotateCcw, X } from 'lucide-react';
import { useLang } from '@/lib/i18n';

interface Prefs { fs: number; contrast: boolean; gray: boolean; links: boolean; motion: boolean }
const DEFAULTS: Prefs = { fs: 0, contrast: false, gray: false, links: false, motion: false };
const KEY = 'smartq_a11y';

/** Accessibility menu. Preferences are stored on <html> so they apply to every page. */
export function A11yWidget() {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [p, setP] = useState<Prefs>(DEFAULTS);

  useEffect(() => {
    try { const raw = localStorage.getItem(KEY); if (raw) setP({ ...DEFAULTS, ...JSON.parse(raw) }); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const el = document.documentElement;
    const set = (k: string, v: boolean | number) => (v ? el.setAttribute(k, String(v === true ? 1 : v)) : el.removeAttribute(k));
    set('data-fs', p.fs); set('data-contrast', p.contrast); set('data-gray', p.gray); set('data-links', p.links); set('data-motion', p.motion);
    try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* ignore */ }
  }, [p]);

  const toggles: [keyof Prefs, string][] = [
    ['contrast', t('ניגודיות גבוהה', 'High contrast')],
    ['gray', t('גווני אפור', 'Grayscale')],
    ['links', t('הדגשת קישורים', 'Underline links')],
    ['motion', t('עצירת אנימציות', 'Stop animations')],
  ];

  return (
    <div className="fixed bottom-4 start-4 z-40">
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} aria-label={t('תפריט נגישות', 'Accessibility menu')} className="grid h-11 w-11 place-items-center rounded-full bg-ink text-white shadow-lg ring-2 ring-white hover:bg-brand">
          <Accessibility className="h-5 w-5" />
        </button>
      ) : (
        <div role="dialog" aria-label={t('תפריט נגישות', 'Accessibility menu')} className="w-72 rounded-2xl border border-line bg-white p-4 shadow-xl">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-bold">{t('התאמות נגישות', 'Accessibility')}</span>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="rounded p-1 hover:bg-slate-100"><X className="h-4 w-4" /></button>
          </div>
          <div className="mb-3 grid grid-cols-3 gap-1.5 text-sm">
            {[[-1, 'A-'], [0, t('רגיל', 'Normal')], [1, 'A+'], ].map(([v, l]) => (
              <button key={String(v)} type="button" aria-pressed={p.fs === v} onClick={() => setP({ ...p, fs: v as number })} className={`rounded-lg border px-2 py-1.5 font-medium ${p.fs === v ? 'border-brand bg-brand-soft text-brand' : 'border-line'}`}>{l}</button>
            ))}
          </div>
          <div className="space-y-1.5">
            {toggles.map(([k, label]) => (
              <button key={k} type="button" aria-pressed={Boolean(p[k])} onClick={() => setP({ ...p, [k]: !p[k] })} className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm ${p[k] ? 'border-brand bg-brand-soft text-brand' : 'border-line'}`}>
                <span>{label}</span><span className="text-xs">{p[k] ? t('פעיל', 'On') : t('כבוי', 'Off')}</span>
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setP(DEFAULTS)} className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-100 py-2 text-sm font-medium hover:bg-slate-200">
            <RotateCcw className="h-3.5 w-3.5" />{t('איפוס', 'Reset')}
          </button>
        </div>
      )}
    </div>
  );
}
