'use client';

import { useState } from 'react';
import { api, errorText } from '@/lib/api';
import { useLang } from '@/lib/i18n';
import { Field, Modal, btnPrimary, btnSecondary, inputCls, useToast } from './ui';

export function ChangePasswordDialog({ open, forced, onClose, onDone }: { open: boolean; forced?: boolean; onClose: () => void; onDone: () => void }) {
  const { t, lang } = useLang();
  const { toast } = useToast();
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      await api('/api/auth/change-password', { method: 'POST', json: { currentPassword: cur, newPassword: next } });
      toast(t('הסיסמה עודכנה', 'Password updated'));
      setCur(''); setNext('');
      onDone();
    } catch (ex) { setErr(errorText(ex, lang)); } finally { setBusy(false); }
  };

  return (
    <Modal open={open} onClose={forced ? () => undefined : onClose} title={forced ? t('נדרשת החלפת סיסמה', 'Choose a new password') : t('שינוי סיסמה', 'Change password')}>
      <form onSubmit={submit} className="space-y-3">
        {forced && <p className="text-sm text-ink-soft">{t('נכנסתם עם סיסמה זמנית. בחרו סיסמה אישית כדי להמשיך.', 'You signed in with a temporary password. Choose your own to continue.')}</p>}
        <Field label={t('סיסמה נוכחית', 'Current password')}><input type="password" required autoComplete="current-password" className={inputCls} value={cur} onChange={(e) => setCur(e.target.value)} /></Field>
        <Field label={t('סיסמה חדשה', 'New password')} hint={t('לפחות 10 תווים, כולל אותיות וספרות', 'At least 10 characters, with letters and digits')}>
          <input type="password" required minLength={10} autoComplete="new-password" className={inputCls} value={next} onChange={(e) => setNext(e.target.value)} />
        </Field>
        {err && <p role="alert" className="text-sm font-medium text-rose-600">{err}</p>}
        <div className="flex justify-end gap-2 pt-2">
          {!forced && <button type="button" className={btnSecondary} onClick={onClose}>{t('ביטול', 'Cancel')}</button>}
          <button type="submit" disabled={busy} className={btnPrimary}>{t('עדכון סיסמה', 'Update password')}</button>
        </div>
      </form>
    </Modal>
  );
}
