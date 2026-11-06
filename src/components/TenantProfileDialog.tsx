'use client';

import { useState } from 'react';
import { api, errorText } from '@/lib/api';
import { useLang } from '@/lib/i18n';
import { Field, Modal, Spinner, btnPrimary, btnSecondary, inputCls, useToast } from './ui';

export function TenantProfileDialog({ open, name, email, onClose, onSaved }: {
  open: boolean;
  name: string;
  email: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t, lang } = useLang();
  const { toast } = useToast();
  const [fullName, setFullName] = useState(name);
  const [saving, setSaving] = useState(false);
  const close = () => {
    setFullName(name);
    onClose();
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await api('/api/auth/profile', { method: 'PATCH', json: { fullName } });
      toast(t('הפרופיל עודכן', 'Profile updated'));
      onSaved();
      onClose();
    } catch (error) {
      toast(errorText(error, lang), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={close} title={t('הפרופיל שלי', 'My profile')}>
      <form onSubmit={submit} className="space-y-4">
        <p dir="ltr" className="text-sm text-ink-soft">{email}</p>
        <Field label={t('שם מלא', 'Full name')}>
          <input required minLength={2} maxLength={120} className={inputCls} value={fullName} onChange={(event) => setFullName(event.target.value)} />
        </Field>
        <div className="flex justify-end gap-2">
          <button type="button" className={btnSecondary} onClick={close}>{t('ביטול', 'Cancel')}</button>
          <button type="submit" disabled={saving || fullName.trim().length < 2} className={btnPrimary}>{saving && <Spinner />}{t('שמירה', 'Save')}</button>
        </div>
      </form>
    </Modal>
  );
}
