'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, Copy, Pencil, Plus, Trash2 } from 'lucide-react';
import { api, errorText } from '@/lib/api';
import { useLang } from '@/lib/i18n';
import { API_KEY_SCOPES, type ApiKeyScope } from '@/lib/constants';
import { Badge, EmptyState, Field, Modal, Spinner, btnPrimary, btnSecondary, cardCls, inputCls, useToast } from '@/components/ui';

interface ApiKeyRow {
  id: string;
  name: string;
  key_prefix: string;
  scopes: ApiKeyScope[];
  expires_at: string | null;
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
}
interface Draft { name: string; scopes: ApiKeyScope[]; expiresAt: string }

const emptyDraft: Draft = { name: '', scopes: ['tickets:read'], expiresAt: '' };
const scopeLabels: Record<ApiKeyScope, [string, string]> = {
  'tickets:read': ['קריאת קריאות', 'Read tickets'],
  'tickets:create': ['יצירת קריאות', 'Create tickets'],
  'tickets:update': ['עדכון קריאות', 'Update tickets'],
};

export function PlatformTenantApiKeysDialog({ tenantId, tenantName, onClose }: {
  tenantId: string;
  tenantName: string;
  onClose: () => void;
}) {
  const { t, lang } = useLang();
  const { toast, confirm } = useToast();
  const endpoint = `/api/platform/tenant-api-keys?tenantId=${encodeURIComponent(tenantId)}`;
  const [keys, setKeys] = useState<ApiKeyRow[] | null>(null);
  const [editing, setEditing] = useState<ApiKeyRow | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [issuedSecret, setIssuedSecret] = useState('');
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try { setKeys((await api<{ keys: ApiKeyRow[] }>(endpoint)).keys); }
    catch (error) { toast(errorText(error, lang), 'error'); setKeys([]); }
  }, [endpoint, lang, toast]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- Load keys for the selected organization.
  useEffect(() => { void load(); }, [load]);

  const openNew = () => { setEditing(null); setDraft(emptyDraft); setFormOpen(true); };
  const openEdit = (key: ApiKeyRow) => {
    setEditing(key);
    setDraft({ name: key.name, scopes: key.scopes, expiresAt: key.expires_at ? new Date(key.expires_at).toISOString().slice(0, 16) : '' });
    setFormOpen(true);
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const expiresAt = draft.expiresAt ? new Date(draft.expiresAt).toISOString() : null;
    try {
      if (editing) {
        await api(`${endpoint}&id=${encodeURIComponent(editing.id)}`, { method: 'PATCH', json: { name: draft.name, scopes: draft.scopes, expiresAt } });
        toast(t('מפתח ה-API עודכן', 'API key updated'));
      } else {
        const result = await api<{ secret: string }>(endpoint, { method: 'POST', json: { name: draft.name, scopes: draft.scopes, expiresAt } });
        setIssuedSecret(result.secret);
      }
      setFormOpen(false);
      await load();
    } catch (error) { toast(errorText(error, lang), 'error'); }
    finally { setSaving(false); }
  };
  const revoke = async (key: ApiKeyRow) => {
    const accepted = await confirm({
      title: t('ביטול מפתח API', 'Revoke API key'),
      message: t(`כל אינטגרציה שמשתמשת ב-"${key.name}" תפסיק לעבוד.`, `Any integration using "${key.name}" will stop working.`),
      confirmLabel: t('ביטול מפתח', 'Revoke key'),
      danger: true,
    });
    if (!accepted) return;
    try {
      await api(`${endpoint}&id=${encodeURIComponent(key.id)}`, { method: 'DELETE' });
      toast(t('המפתח בוטל', 'API key revoked'));
      await load();
    } catch (error) { toast(errorText(error, lang), 'error'); }
  };
  const toggleScope = (scope: ApiKeyScope) => setDraft((current) => ({
    ...current,
    scopes: current.scopes.includes(scope) ? current.scopes.filter((item) => item !== scope) : [...current.scopes, scope],
  }));

  return (
    <>
      <Modal open onClose={onClose} wide title={`${t('מפתחות API', 'API keys')} · ${tenantName}`}>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-ink-soft">{t('המפתחות מוגבלים לארגון, ונשמרים במסד כ-hash בלבד. הערך המלא מוצג רק ביצירה.', 'Keys are scoped to this organization and stored only as hashes. The full value is shown only once.')}</p>
            <button type="button" className={btnPrimary} onClick={openNew}><Plus className="h-4 w-4" />{t('מפתח חדש', 'New API key')}</button>
          </div>
          <div className={`${cardCls} overflow-hidden`}>
            {!keys ? <div className="py-10 text-center text-brand"><Spinner className="h-5 w-5" /></div>
              : keys.length === 0 ? <EmptyState title={t('אין מפתחות API', 'No API keys')} hint={t('צרו מפתח נפרד לכל אינטגרציה.', 'Create a separate key for each integration.')} />
                : <div className="overflow-x-auto"><table className="w-full text-sm">
                  <thead className="border-b border-line bg-canvas text-xs text-ink-soft"><tr>{[t('שם', 'Name'), t('תחילית', 'Prefix'), t('הרשאות', 'Scopes'), t('שימוש אחרון', 'Last used'), t('תפוגה', 'Expires'), t('סטטוס', 'Status'), ''].map((heading) => <th key={heading} className="px-3 py-2.5 text-start font-semibold">{heading}</th>)}</tr></thead>
                  <tbody className="divide-y divide-line">{keys.map((key) => (
                    <tr key={key.id}>
                      <td className="px-3 py-3 font-medium">{key.name}</td>
                      <td className="px-3 py-3 font-mono text-xs" dir="ltr">{key.key_prefix}…</td>
                      <td className="px-3 py-3 text-xs">{key.scopes.join(', ')}</td>
                      <td className="px-3 py-3 text-xs text-ink-soft">{key.last_used_at ? new Date(key.last_used_at).toLocaleString(lang === 'he' ? 'he-IL' : 'en-US') : '–'}</td>
                      <td className="px-3 py-3 text-xs text-ink-soft">{key.expires_at ? new Date(key.expires_at).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-US') : t('ללא תפוגה', 'Never')}</td>
                      <td className="px-3 py-3"><Badge tone={key.revoked_at ? 'bg-slate-100 text-slate-600 ring-slate-200' : 'bg-emerald-50 text-emerald-700 ring-emerald-200'}>{key.revoked_at ? t('בוטל', 'Revoked') : t('פעיל', 'Active')}</Badge></td>
                      <td className="px-3 py-3"><div className="flex justify-end gap-1">
                        {!key.revoked_at && <>
                          <button type="button" aria-label={t('עריכה', 'Edit')} onClick={() => openEdit(key)} className="rounded-lg border border-line p-1.5 hover:bg-slate-50"><Pencil className="h-4 w-4" /></button>
                          <button type="button" aria-label={t('ביטול', 'Revoke')} onClick={() => void revoke(key)} className="rounded-lg border border-rose-200 p-1.5 text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
                        </>}
                      </div></td>
                    </tr>
                  ))}</tbody>
                </table></div>}
          </div>
        </div>
      </Modal>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? t('עריכת מפתח API', 'Edit API key') : t('מפתח API חדש', 'New API key')}>
        <form onSubmit={save} className="space-y-4">
          <Field label={t('שם לאינטגרציה', 'Integration name')}><input required minLength={2} maxLength={120} className={inputCls} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></Field>
          <fieldset className="space-y-2"><legend className="mb-2 text-sm font-medium">{t('הרשאות', 'Scopes')}</legend>
            {API_KEY_SCOPES.map((scope) => <label key={scope} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.scopes.includes(scope)} onChange={() => toggleScope(scope)} />{t(...scopeLabels[scope])}</label>)}
          </fieldset>
          <Field label={t('תפוגה (אופציונלי)', 'Expiration (optional)')}><input type="datetime-local" className={inputCls} value={draft.expiresAt} onChange={(event) => setDraft({ ...draft, expiresAt: event.target.value })} /></Field>
          <div className="flex justify-end gap-2"><button type="button" className={btnSecondary} onClick={() => setFormOpen(false)}>{t('ביטול', 'Cancel')}</button><button type="submit" disabled={saving || !draft.scopes.length} className={btnPrimary}>{saving && <Spinner />}{t('שמירה', 'Save')}</button></div>
        </form>
      </Modal>

      <Modal open={Boolean(issuedSecret)} onClose={() => setIssuedSecret('')} title={t('שמרו את מפתח ה-API', 'Save your API key')}>
        <p className="text-sm text-ink-soft">{t('המפתח מוצג פעם אחת בלבד. העתיקו ושמרו אותו במקום בטוח.', 'The key is shown once only. Copy and store it securely.')}</p>
        <div className="my-4 flex items-center gap-2 rounded-xl bg-canvas p-3">
          <code className="min-w-0 flex-1 break-all text-xs" dir="ltr">{issuedSecret}</code>
          <button type="button" aria-label={t('העתקה', 'Copy')} className="rounded-lg border border-line bg-white p-2" onClick={() => { void navigator.clipboard.writeText(issuedSecret); setCopied(true); setTimeout(() => setCopied(false), 1800); }}>{copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}</button>
        </div>
        <button type="button" className={`${btnPrimary} w-full`} onClick={() => setIssuedSecret('')}>{t('סיימתי', 'Done')}</button>
      </Modal>
    </>
  );
}
