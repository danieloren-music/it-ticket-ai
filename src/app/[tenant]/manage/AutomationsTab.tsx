'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, Copy, Pencil, Plus, Trash2 } from 'lucide-react';
import { Badge, EmptyState, Field, Modal, Spinner, btnPrimary, btnSecondary, cardCls, inputCls, useToast } from '@/components/ui';
import { api, errorText } from '@/lib/api';
import { useLang } from '@/lib/i18n';
import { CATEGORIES } from '@/lib/constants';

type AutomationType = 'category_routing' | 'auto_assignment' | 'sla_escalation' | 'idle_close' | 'webhook';
interface AutomationRule {
  id: string;
  name: string;
  trigger_type: AutomationType;
  config: Record<string, string | number>;
  enabled: boolean;
  hasSecret: boolean;
  lastRun: { status: string; detail: string; created_at: string } | null;
}
interface Draft {
  name: string;
  triggerType: AutomationType;
  enabled: boolean;
  category: string;
  team: string;
  minutesBeforeDue: number;
  idleHours: number;
  event: string;
  url: string;
  webhookSecret: string;
}

const emptyDraft: Draft = {
  name: '',
  triggerType: 'category_routing',
  enabled: true,
  category: CATEGORIES[0],
  team: '',
  minutesBeforeDue: 60,
  idleHours: 72,
  event: 'ticket.created',
  url: '',
  webhookSecret: '',
};

const types: [AutomationType, [string, string]][] = [
  ['category_routing', ['ניתוב לפי קטגוריה', 'Category routing']],
  ['auto_assignment', ['הקצאה אוטומטית לפי עומס', 'Automatic workload assignment']],
  ['sla_escalation', ['הסלמת SLA', 'SLA escalation']],
  ['idle_close', ['סגירת קריאה שקטה', 'Close idle resolved tickets']],
  ['webhook', ['Webhook לאינטגרציה', 'Integration webhook']],
];

export function AutomationsTab() {
  const { t, lang } = useLang();
  const { toast, confirm } = useToast();
  const [rules, setRules] = useState<AutomationRule[] | null>(null);
  const [teams, setTeams] = useState<string[]>([]);
  const [editing, setEditing] = useState<AutomationRule | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [issuedSecret, setIssuedSecret] = useState('');
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api<{ rules: AutomationRule[]; teams: string[] }>('/api/tenant/automations');
      setRules(data.rules);
      setTeams(data.teams);
    } catch (error) {
      toast(errorText(error, lang), 'error');
      setRules([]);
    }
  }, [lang, toast]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- Initialize automation rules from the tenant API.
  useEffect(() => { void load(); }, [load]);

  const editRule = (rule: AutomationRule) => {
    const config = rule.config;
    setEditing(rule);
    setDraft({
      ...emptyDraft,
      name: rule.name,
      triggerType: rule.trigger_type,
      enabled: rule.enabled,
      category: String(config.category ?? CATEGORIES[0]),
      team: String(config.team ?? ''),
      minutesBeforeDue: Number(config.minutesBeforeDue ?? 60),
      idleHours: Number(config.idleHours ?? 72),
      event: String(config.event ?? 'ticket.created'),
      url: String(config.url ?? ''),
    });
    setOpen(true);
  };
  const createRule = () => { setEditing(null); setDraft(emptyDraft); setOpen(true); };
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    let config: Record<string, string | number>;
    if (draft.triggerType === 'category_routing') config = { category: draft.category, team: draft.team };
    else if (draft.triggerType === 'auto_assignment') config = { team: draft.team };
    else if (draft.triggerType === 'sla_escalation') config = { minutesBeforeDue: draft.minutesBeforeDue, team: draft.team };
    else if (draft.triggerType === 'idle_close') config = { idleHours: draft.idleHours };
    else config = { event: draft.event, url: draft.url };
    try {
      const result = await api<{ issuedSecret?: string }>('/api/tenant/automations', {
        method: 'POST',
        json: { id: editing?.id, name: draft.name, triggerType: draft.triggerType, enabled: draft.enabled, config, webhookSecret: draft.webhookSecret },
      });
      setOpen(false);
      setDraft(emptyDraft);
      if (result.issuedSecret) setIssuedSecret(result.issuedSecret);
      else toast(t('האוטומציה נשמרה', 'Automation saved'));
      await load();
    } catch (error) { toast(errorText(error, lang), 'error'); }
    finally { setSaving(false); }
  };
  const remove = async (rule: AutomationRule) => {
    const accepted = await confirm({
      title: t('מחיקת אוטומציה', 'Delete automation'),
      message: t(`למחוק את "${rule.name}" ואת היסטוריית ההרצות שלה?`, `Delete "${rule.name}" and its run history?`),
      confirmLabel: t('מחיקה', 'Delete'),
      danger: true,
    });
    if (!accepted) return;
    try {
      await api(`/api/tenant/automations?id=${encodeURIComponent(rule.id)}`, { method: 'DELETE' });
      toast(t('האוטומציה נמחקה', 'Automation deleted'));
      await load();
    } catch (error) { toast(errorText(error, lang), 'error'); }
  };
  const ruleLabel = (type: AutomationType) => t(...(types.find(([key]) => key === type)?.[1] ?? ['אוטומציה', 'Automation']));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-3xl text-sm text-ink-soft">{t('ניתוב והקצאה פועלים בעת פתיחת קריאה. הסלמת SLA וסגירה שקטה דורשות מתזמן שרת שמפעיל את נקודת הקצה המתועדת.', 'Routing and assignment run when a ticket is created. SLA escalation and idle close require a server scheduler to call the documented endpoint.')}</p>
        <button type="button" className={btnPrimary} onClick={createRule}><Plus className="h-4 w-4" />{t('אוטומציה חדשה', 'New automation')}</button>
      </div>
      <div className={`${cardCls} overflow-hidden`}>
        {!rules ? <div className="py-12 text-center text-brand"><Spinner className="h-5 w-5" /></div>
          : rules.length === 0 ? <EmptyState title={t('אין אוטומציות', 'No automations yet')} hint={t('צרו כלל כדי לנתב, להקצות או לעדכן קריאות באופן אוטומטי.', 'Create a rule to route, assign, or update tickets automatically.')} />
            : <ul className="divide-y divide-line">{rules.map((rule) => (
              <li key={rule.id} className="flex flex-wrap items-start justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{rule.name}</h3><Badge tone="bg-violet-50 text-violet-700 ring-violet-200">{ruleLabel(rule.trigger_type)}</Badge><Badge tone={rule.enabled ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-slate-100 text-slate-600 ring-slate-200'}>{rule.enabled ? t('פעילה', 'Enabled') : t('מושהית', 'Paused')}</Badge></div>
                  <p className="mt-1 text-xs text-ink-soft">{rule.lastRun
                    ? `${t('הרצה אחרונה', 'Last run')}: ${new Date(rule.lastRun.created_at).toLocaleString(lang === 'he' ? 'he-IL' : 'en-US')} · ${rule.lastRun.status} · ${rule.lastRun.detail}`
                    : t('טרם הורצה', 'Not run yet')}</p>
                </div>
                <div className="flex gap-1.5">
                  <button type="button" aria-label={t('עריכה', 'Edit')} onClick={() => editRule(rule)} className="rounded-lg border border-line p-1.5 hover:bg-slate-50"><Pencil className="h-4 w-4" /></button>
                  <button type="button" aria-label={t('מחיקה', 'Delete')} onClick={() => void remove(rule)} className="rounded-lg border border-rose-200 p-1.5 text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
                </div>
              </li>
            ))}</ul>}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} wide title={editing ? t('עריכת אוטומציה', 'Edit automation') : t('אוטומציה חדשה', 'New automation')}>
        <form onSubmit={save} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t('שם', 'Name')}><input required minLength={2} maxLength={120} className={inputCls} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></Field>
            <Field label={t('סוג', 'Type')}><select disabled={Boolean(editing)} className={inputCls} value={draft.triggerType} onChange={(event) => setDraft({ ...draft, triggerType: event.target.value as AutomationType })}>{types.map(([value, label]) => <option key={value} value={value}>{t(...label)}</option>)}</select></Field>
          </div>
          {draft.triggerType === 'category_routing' && <>
            <Field label={t('קטגוריה', 'Category')}><select className={inputCls} value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })}>{CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></Field>
            <Field label={t('צוות יעד', 'Destination team')}><select required className={inputCls} value={draft.team} onChange={(event) => setDraft({ ...draft, team: event.target.value })}><option value="">{t('בחרו צוות', 'Choose a team')}</option>{teams.map((team) => <option key={team}>{team}</option>)}</select></Field>
          </>}
          {draft.triggerType === 'auto_assignment' && <Field label={t('צוות (ריק = כל הצוותים)', 'Team (blank = all teams)')}><select className={inputCls} value={draft.team} onChange={(event) => setDraft({ ...draft, team: event.target.value })}><option value="">{t('כל הצוותים', 'All teams')}</option>{teams.map((team) => <option key={team}>{team}</option>)}</select></Field>}
          {draft.triggerType === 'sla_escalation' && <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t('דקות לפני/אחרי יעד ה-SLA', 'Minutes before/after SLA due')}><input type="number" min={0} max={10080} required className={inputCls} value={draft.minutesBeforeDue} onChange={(event) => setDraft({ ...draft, minutesBeforeDue: Number(event.target.value) })} /></Field>
            <Field label={t('העבר לצוות (אופציונלי)', 'Escalate to team (optional)')}><select className={inputCls} value={draft.team} onChange={(event) => setDraft({ ...draft, team: event.target.value })}><option value="">{t('רק תיעוד ביומן', 'Record escalation only')}</option>{teams.map((team) => <option key={team}>{team}</option>)}</select></Field>
          </div>}
          {draft.triggerType === 'idle_close' && <Field label={t('שעות ללא פעילות לפני סגירה', 'Idle hours before closing')}><input type="number" min={1} max={720} required className={inputCls} value={draft.idleHours} onChange={(event) => setDraft({ ...draft, idleHours: Number(event.target.value) })} /></Field>}
          {draft.triggerType === 'webhook' && <>
            <Field label={t('אירוע', 'Event')}><select className={inputCls} value={draft.event} onChange={(event) => setDraft({ ...draft, event: event.target.value })}><option value="ticket.created">ticket.created</option><option value="ticket.sla_escalated">ticket.sla_escalated</option><option value="ticket.auto_closed">ticket.auto_closed</option></select></Field>
            <Field label="HTTPS URL" hint={t('היעד חייב להיות ציבורי. בקשות נחתמות ב-HMAC SHA-256 בכותרת x-smartq-signature.', 'Must be a public endpoint. Requests are signed with HMAC SHA-256 in x-smartq-signature.')}>
              <input required type="url" dir="ltr" className={inputCls} value={draft.url} onChange={(event) => setDraft({ ...draft, url: event.target.value })} placeholder="https://hooks.example.com/smartq" />
            </Field>
            <Field label={t('סוד חתימה חדש (ריק = השארת הסוד הקיים)', 'New signing secret (blank = keep existing)')}>
              <input type="password" autoComplete="new-password" className={inputCls} value={draft.webhookSecret} onChange={(event) => setDraft({ ...draft, webhookSecret: event.target.value })} />
            </Field>
            {!editing?.hasSecret && <p className="text-xs text-ink-soft">{t('בסוד חדש, העתיקו ושמרו אותו מיד. הוא יוצג פעם אחת בלבד.', 'A new secret is shown once; copy and store it immediately.')}</p>}
          </>}
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.enabled} onChange={(event) => setDraft({ ...draft, enabled: event.target.checked })} />{t('האוטומציה פעילה', 'Automation enabled')}</label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className={btnSecondary} onClick={() => setOpen(false)}>{t('ביטול', 'Cancel')}</button>
            <button type="submit" disabled={saving} className={btnPrimary}>{saving && <Spinner />}{t('שמירה', 'Save')}</button>
          </div>
        </form>
      </Modal>

      <Modal open={Boolean(issuedSecret)} onClose={() => setIssuedSecret('')} title={t('שמרו את סוד ה-Webhook', 'Save the webhook secret')}>
        <p className="text-sm text-ink-soft">{t('הסוד לא נשמר שוב בטקסט גלוי ולא ניתן לצפות בו מחדש.', 'The secret is not stored in readable form and cannot be viewed again.')}</p>
        <div className="my-4 flex items-center gap-2 rounded-lg bg-canvas p-3" dir="ltr"><code className="min-w-0 flex-1 break-all text-sm">{issuedSecret}</code><button type="button" aria-label={t('העתקה', 'Copy')} className="rounded-lg border border-line bg-white p-2" onClick={() => { void navigator.clipboard.writeText(issuedSecret); setCopied(true); setTimeout(() => setCopied(false), 1800); }}>{copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}</button></div>
        <button type="button" className={`${btnPrimary} w-full`} onClick={() => setIssuedSecret('')}>{t('שמרתי', 'Saved')}</button>
      </Modal>
    </div>
  );
}
