'use client';

import { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Badge, EmptyState, Field, Modal, Spinner, btnPrimary, btnSecondary, cardCls, inputCls, useToast } from '@/components/ui';
import { api, errorText } from '@/lib/api';
import { useLang } from '@/lib/i18n';
import { TENANT_PERMISSIONS, type TenantPermission } from '@/lib/constants';

interface TenantGroup {
  id: string;
  name: string;
  kind: 'access' | 'team';
  description: string;
  permissions: TenantPermission[];
  members: string[];
}
interface DirectoryUser { email: string; full_name: string; role: string; is_active: boolean }
interface GroupForm { name: string; kind: 'access' | 'team'; description: string; permissions: TenantPermission[]; members: string[] }

const emptyForm: GroupForm = { name: '', kind: 'access', description: '', permissions: [], members: [] };
const permissionLabels: Record<TenantPermission, [string, string]> = {
  'tickets:read_all': ['צפייה בכל הקריאות', 'Read all tickets'],
  'tickets:update': ['עדכון והקצאת קריאות', 'Update and assign tickets'],
  'directory:manage': ['ניהול משתמשים', 'Manage users'],
  'settings:manage': ['ניהול חיבורי SSO', 'Manage SSO connections'],
  'audit:read': ['צפייה ביומן ביקורת', 'View audit log'],
  'groups:manage': ['ניהול קבוצות וצוותים', 'Manage groups and teams'],
  'automations:manage': ['ניהול אוטומציות', 'Manage automations'],
  'api_keys:manage': ['ניהול מפתחות API', 'Manage API keys'],
};

export function GroupsTab() {
  const { t, lang } = useLang();
  const { toast, confirm } = useToast();
  const [groups, setGroups] = useState<TenantGroup[] | null>(null);
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [editing, setEditing] = useState<TenantGroup | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<GroupForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api<{ groups: TenantGroup[]; users: DirectoryUser[] }>('/api/tenant/groups');
      setGroups(data.groups);
      setUsers(data.users);
    } catch (error) {
      toast(errorText(error, lang), 'error');
      setGroups([]);
    }
  }, [lang, toast]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- Initialize groups from the tenant API.
  useEffect(() => { void load(); }, [load]);

  const openNew = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (group: TenantGroup) => {
    setEditing(group);
    setForm({ name: group.name, kind: group.kind, description: group.description, permissions: group.permissions, members: group.members });
    setOpen(true);
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await api('/api/tenant/groups', { method: 'POST', json: { ...form, id: editing?.id } });
      setOpen(false);
      toast(t('הקבוצה נשמרה', 'Group saved'));
      await load();
    } catch (error) {
      toast(errorText(error, lang), 'error');
    } finally { setSaving(false); }
  };
  const remove = async (group: TenantGroup) => {
    const accepted = await confirm({
      title: t('מחיקת קבוצה', 'Delete group'),
      message: t(`למחוק את "${group.name}"?`, `Delete "${group.name}"?`),
      confirmLabel: t('מחיקה', 'Delete'),
      danger: true,
    });
    if (!accepted) return;
    try {
      await api(`/api/tenant/groups?id=${encodeURIComponent(group.id)}`, { method: 'DELETE' });
      toast(t('הקבוצה נמחקה', 'Group deleted'));
      await load();
    } catch (error) { toast(errorText(error, lang), 'error'); }
  };
  const toggleMember = (email: string) => setForm((current) => ({
    ...current,
    members: current.members.includes(email) ? current.members.filter((value) => value !== email) : [...current.members, email],
  }));
  const togglePermission = (permission: TenantPermission) => setForm((current) => ({
    ...current,
    permissions: current.permissions.includes(permission)
      ? current.permissions.filter((value) => value !== permission)
      : [...current.permissions, permission],
  }));

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><button type="button" className={btnPrimary} onClick={openNew}><Plus className="h-4 w-4" />{t('קבוצה חדשה', 'New group')}</button></div>
      <div className={`${cardCls} overflow-hidden`}>
        {!groups ? <div className="py-12 text-center text-brand"><Spinner className="h-5 w-5" /></div>
          : groups.length === 0 ? <EmptyState title={t('אין קבוצות עדיין', 'No groups yet')} hint={t('צרו קבוצת הרשאות או צוות IT כדי לנהל גישה וניתוב.', 'Create an access group or IT team to manage permissions and routing.')} />
            : <ul className="divide-y divide-line">{groups.map((group) => (
              <li key={group.id} className="flex flex-wrap items-start justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{group.name}</h3><Badge tone={group.kind === 'access' ? 'bg-violet-50 text-violet-700 ring-violet-200' : 'bg-blue-50 text-blue-700 ring-blue-200'}>{group.kind === 'access' ? t('קבוצת הרשאות', 'Access group') : t('צוות IT', 'IT team')}</Badge></div>
                  {group.description && <p className="mt-1 text-sm text-ink-soft">{group.description}</p>}
                  <p className="mt-1 text-xs text-ink-soft">{t(`${group.members.length} חברים`, `${group.members.length} members`)}{group.kind === 'access' ? ` · ${group.permissions.length} ${t('הרשאות', 'permissions')}` : ''}</p>
                </div>
                <div className="flex gap-1.5">
                  <button type="button" aria-label={t('עריכה', 'Edit')} onClick={() => openEdit(group)} className="rounded-lg border border-line p-1.5 hover:bg-slate-50"><Pencil className="h-4 w-4" /></button>
                  <button type="button" aria-label={t('מחיקה', 'Delete')} onClick={() => void remove(group)} className="rounded-lg border border-rose-200 p-1.5 text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
                </div>
              </li>
            ))}</ul>}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} wide title={editing ? t('עריכת קבוצה', 'Edit group') : t('קבוצה חדשה', 'New group')}>
        <form onSubmit={save} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t('שם', 'Name')}><input required minLength={2} maxLength={120} className={inputCls} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
            <Field label={t('סוג', 'Type')}><select className={inputCls} value={form.kind} disabled={Boolean(editing)} onChange={(event) => setForm({ ...form, kind: event.target.value as GroupForm['kind'], permissions: [] })}><option value="access">{t('קבוצת הרשאות', 'Access group')}</option><option value="team">{t('צוות IT', 'IT team')}</option></select></Field>
          </div>
          <Field label={t('תיאור', 'Description')}><input maxLength={500} className={inputCls} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></Field>
          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-medium">{t('חברים פעילים בארגון', 'Active organization members')}</legend>
            {users.filter((user) => user.is_active && (form.kind !== 'team' || user.role !== 'User')).length === 0
              ? <p className="text-sm text-ink-soft">{t('אין משתמשים מתאימים. צוותי IT יכולים לכלול טכנאים ומנהלים בלבד.', 'No eligible users. IT teams can contain technicians and administrators only.')}</p>
              : <div className="grid max-h-44 gap-2 overflow-auto rounded-lg border border-line p-3 sm:grid-cols-2">
                {users.filter((user) => user.is_active && (form.kind !== 'team' || user.role !== 'User')).map((user) => (
                  <label key={user.email} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.members.includes(user.email)} onChange={() => toggleMember(user.email)} /><span>{user.full_name}</span><span className="text-xs text-ink-soft" dir="ltr">{user.email}</span></label>
                ))}
              </div>}
          </fieldset>
          {form.kind === 'access' && <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-medium">{t('הרשאות הקבוצה', 'Group permissions')}</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {TENANT_PERMISSIONS.map((permission) => <label key={permission} className="flex items-center gap-2 rounded-lg border border-line p-2 text-sm">
                <input type="checkbox" checked={form.permissions.includes(permission)} onChange={() => togglePermission(permission)} />
                {t(...permissionLabels[permission])}
              </label>)}
            </div>
          </fieldset>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className={btnSecondary} onClick={() => setOpen(false)}>{t('ביטול', 'Cancel')}</button>
            <button type="submit" disabled={saving} className={btnPrimary}>{saving && <Spinner />}{t('שמירה', 'Save')}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
