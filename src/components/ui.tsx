'use client';

import Image from 'next/image';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';
import { useLang } from '@/lib/i18n';

/* ───────── class tokens ───────── */
export const inputCls =
  'w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:bg-slate-50 disabled:text-slate-500';
const btnBase =
  'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50';
export const btnPrimary = `${btnBase} bg-brand text-white hover:bg-brand-strong`;
export const btnSecondary = `${btnBase} border border-line bg-white text-ink hover:bg-slate-50`;
export const btnDanger = `${btnBase} bg-rose-600 text-white hover:bg-rose-700`;
export const cardCls = 'rounded-xl border border-line bg-white';

/* ───────── badges ───────── */
export const urgencyTone = (u: string) =>
  u === 'Critical' ? 'bg-rose-50 text-rose-700 ring-rose-200'
  : u === 'High' ? 'bg-orange-50 text-orange-700 ring-orange-200'
  : u === 'Medium' ? 'bg-blue-50 text-blue-700 ring-blue-200'
  : 'bg-slate-100 text-slate-600 ring-slate-200';

export const statusTone = (s: string) =>
  s === 'Resolved' || s === 'Closed' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
  : s === 'In Progress' ? 'bg-violet-50 text-violet-700 ring-violet-200'
  : s === 'Pending User' ? 'bg-amber-50 text-amber-700 ring-amber-200'
  : 'bg-slate-100 text-slate-700 ring-slate-200';

export function Badge({ tone, children }: { tone: string; children: ReactNode }) {
  return <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${tone}`}>{children}</span>;
}

/* ───────── brand ───────── */
export function Brand({ size = 32, suffix }: { size?: number; suffix?: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <Image src="/smartq-brand-mark.png" alt="" width={size} height={size} className="rounded-lg" priority />
      <span className="text-lg font-bold tracking-tight text-ink">SmartQ</span>
      {suffix}
    </span>
  );
}

export function LangSwitch() {
  const { lang, setLang } = useLang();
  return (
    <div role="group" aria-label="Language" className="flex rounded-lg border border-line bg-white p-0.5 text-xs font-semibold">
      {(['he', 'en'] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={`rounded-md px-2.5 py-1 transition ${lang === l ? 'bg-ink text-white' : 'text-ink-soft hover:text-ink'}`}
        >
          {l === 'he' ? 'עברית' : 'EN'}
        </button>
      ))}
    </div>
  );
}

/* ───────── form field ───────── */
export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-ink">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-soft">{hint}</span>}
    </label>
  );
}

/* ───────── modal ───────── */
export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    ref.current?.focus();
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/50 p-4 sm:items-center" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} className={`rise w-full ${wide ? 'max-w-2xl' : 'max-w-md'} rounded-2xl bg-white p-6 shadow-xl outline-none`}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-base font-bold text-ink">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-md p-1 text-ink-soft hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ───────── toasts + confirm ───────── */
interface ToastApi {
  toast: (message: string, type?: 'success' | 'error') => void;
  confirm: (opts: { title: string; message: string; confirmLabel: string; danger?: boolean }) => Promise<boolean>;
}
const ToastCtx = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const { t } = useLang();
  const [items, setItems] = useState<{ id: number; message: string; type: 'success' | 'error' }[]>([]);
  const [dlg, setDlg] = useState<{ title: string; message: string; confirmLabel: string; danger?: boolean; resolve: (v: boolean) => void } | null>(null);

  const toast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now() + Math.random();
    setItems((p) => [...p, { id, message, type }]);
    setTimeout(() => setItems((p) => p.filter((i) => i.id !== id)), 4500);
  }, []);
  const confirm = useCallback<ToastApi['confirm']>((opts) => new Promise((resolve) => setDlg({ ...opts, resolve })), []);
  const close = (v: boolean) => { dlg?.resolve(v); setDlg(null); };

  return (
    <ToastCtx.Provider value={{ toast, confirm }}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4">
        {items.map((i) => (
          <div key={i.id} className={`rise pointer-events-auto flex max-w-md items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white shadow-lg ${i.type === 'error' ? 'bg-rose-600' : 'bg-ink'}`}>
            {i.type === 'error' ? <AlertCircle className="h-4 w-4 shrink-0" /> : <CheckCircle2 className="h-4 w-4 shrink-0" />}
            {i.message}
          </div>
        ))}
      </div>
      <Modal open={!!dlg} onClose={() => close(false)} title={dlg?.title ?? ''}>
        <p className="text-sm text-ink-soft">{dlg?.message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className={btnSecondary} onClick={() => close(false)}>{t('ביטול', 'Cancel')}</button>
          <button type="button" className={dlg?.danger ? btnDanger : btnPrimary} onClick={() => close(true)}>{dlg?.confirmLabel}</button>
        </div>
      </Modal>
    </ToastCtx.Provider>
  );
}

export function useToast(): ToastApi {
  const v = useContext(ToastCtx);
  if (!v) throw new Error('useToast must be used inside <ToastProvider>');
  return v;
}

export function Spinner({ className = 'h-4 w-4' }: { className?: string }) {
  return <span className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent ${className}`} role="status" aria-label="Loading" />;
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="px-6 py-12 text-center">
      <p className="font-semibold text-ink">{title}</p>
      {hint && <p className="mx-auto mt-1 max-w-sm text-sm text-ink-soft">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
