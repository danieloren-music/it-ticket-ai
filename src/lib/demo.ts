import { db } from './db';
import { DEMO_TENANT, slaDueAt, Urgency, TicketStatus } from './constants';
import { randomToken } from './password';

export const demoEnabled = () => process.env.DEMO_ENABLED !== 'false';

export const DEMO_USERS = {
  user: { email: 'employee@demo.smartq', name: 'Noa Levi', role: 'User', department: 'Finance', site: 'Tel Aviv HQ' },
  admin: { email: 'technician@demo.smartq', name: 'Daniel Cohen', role: 'Admin', department: 'IT Operations', site: 'Tel Aviv HQ' },
  manager: { email: 'manager@demo.smartq', name: 'Maya Shapira', role: 'Manager', department: 'IT Management', site: 'Tel Aviv HQ' },
} as const;

interface Seed {
  title: string;
  description: string;
  category: string;
  urgency: Urgency;
  status: TicketStatus;
  team: string;
  system: string;
  reporter: string;
  city: string;
  ageMinutes: number;
  tech?: string;
}

const SEED: Seed[] = [
  { title: 'Wi-Fi down on floor 4, Finance cannot reach SAP', description: 'Since 09:10 nobody on floor 4 can connect to the wireless network. The Finance team cannot access SAP and month-end closing is blocked.', category: 'Network & Connectivity', urgency: 'Critical', status: 'In Progress', team: 'Network & Security', system: 'Cisco AP / Corporate Wi-Fi / SAP', reporter: 'Avi Mizrahi', city: 'Tel Aviv HQ', ageMinutes: 55, tech: 'Daniel Cohen' },
  { title: 'Cannot connect to VPN - Entra authorization error', description: 'New employee gets an authorization error when signing in to the VPN client from home.', category: 'Access & IAM', urgency: 'High', status: 'Open', team: 'Identity & Access', system: 'Entra ID / VPN gateway', reporter: 'Noa Levi', city: 'Remote', ageMinutes: 140 },
  { title: 'Coffee spilled on laptop keyboard', description: 'Several keys are stuck after a spill. Laptop still boots but typing is unreliable.', category: 'Workstation & Peripherals', urgency: 'Medium', status: 'Open', team: 'Helpdesk Tier 1', system: 'Laptop keyboard', reporter: 'Yael Barak', city: 'Haifa Campus', ageMinutes: 210 },
  { title: 'Request: access to the shared Legal folder', description: 'Need read access to \\\\fileserver\\Legal\\Contracts for the new vendor review.', category: 'Access & IAM', urgency: 'Low', status: 'Pending User', team: 'Identity & Access', system: 'File server', reporter: 'Omer Katz', city: 'Tel Aviv HQ', ageMinutes: 60 * 20, tech: 'Daniel Cohen' },
  { title: 'External monitor flickers with horizontal lines', description: 'Docking station monitor flickers every few minutes, replaced the HDMI cable already.', category: 'Hardware', urgency: 'Medium', status: 'In Progress', team: 'Helpdesk Tier 1', system: 'External monitor / dock', reporter: 'Shira Peled', city: 'Tel Aviv HQ', ageMinutes: 60 * 7, tech: 'Daniel Cohen' },
  { title: 'Monthly sales report is empty in BI dashboard', description: 'The regional sales dashboard shows no data since this morning refresh.', category: 'Database & BI', urgency: 'High', status: 'Open', team: 'IT Applications & BI', system: 'BI dashboard / data warehouse', reporter: 'Ron Ben-David', city: 'Tel Aviv HQ', ageMinutes: 95 },
  { title: 'Backup job failed on file server for two nights', description: 'Backup monitoring reports failure for the last two nightly runs on FS-02.', category: 'Cloud & Infrastructure', urgency: 'High', status: 'In Progress', team: 'System & Cloud Team', system: 'FS-02 backup', reporter: 'Lior Azulay', city: 'Data center', ageMinutes: 60 * 11, tech: 'Maya Shapira' },
  { title: 'Phishing email reported by three employees', description: 'Email impersonating HR asking to re-enter Microsoft credentials. Three employees reported it.', category: 'Cyber Security', urgency: 'Critical', status: 'Resolved', team: 'Network & Security', system: 'Email gateway', reporter: 'Tamar Golan', city: 'Tel Aviv HQ', ageMinutes: 60 * 26, tech: 'Daniel Cohen' },
  { title: 'Install Zoom on new laptop', description: 'New joiner laptop is missing Zoom and the Office suite.', category: 'Software & SaaS', urgency: 'Low', status: 'Resolved', team: 'Helpdesk Tier 1', system: 'Laptop software', reporter: 'Eitan Rosen', city: 'Haifa Campus', ageMinutes: 60 * 22, tech: 'Daniel Cohen' },
  { title: 'Password reset for locked account', description: 'Account locked after too many sign-in attempts, cannot reach Outlook.', category: 'Access & IAM', urgency: 'Medium', status: 'Closed', team: 'Identity & Access', system: 'Entra ID', reporter: 'Noa Levi', city: 'Tel Aviv HQ', ageMinutes: 60 * 23, tech: 'Daniel Cohen' },
];

let lastRefresh = 0;

/** Creates the sandbox tenant + users on first use and keeps its data fresh (24h rolling window). */
export async function ensureDemoTenant(): Promise<void> {
  const client = db();

  const { data: existing } = await client.from('tenants').select('id').eq('id', DEMO_TENANT).maybeSingle();
  if (!existing) {
    await client.from('tenants').upsert(
      {
        id: DEMO_TENANT,
        name: 'SmartQ Demo Co.',
        domain: 'demo.smartq',
        primary_domain: 'demo.smartq',
        admin_email: DEMO_USERS.manager.email,
        status: 'Active',
      },
      { onConflict: 'id' }
    );
    // Random, never-disclosed password hashes: demo accounts can only be entered through /api/demo/start.
    await client.from('tenant_users').upsert(
      Object.values(DEMO_USERS).map((u) => ({
        tenant_id: DEMO_TENANT,
        email: u.email,
        password_hash: `disabled-${randomToken(24)}`,
        full_name: u.name,
        role: u.role,
        job_title: u.role === 'User' ? 'Finance Analyst' : u.role === 'Admin' ? 'IT Technician' : 'IT Manager',
        department: u.department,
        site_location: u.site,
        phone_number: '',
        is_active: true,
      })),
      { onConflict: 'tenant_id,email' }
    );
  }

  if (Date.now() - lastRefresh < 10 * 60_000) return;
  lastRefresh = Date.now();

  // Drop anything older than 24h, then re-seed when the board looks empty.
  const cutoff = new Date(Date.now() - 24 * 3600_000).toISOString();
  await client.from('ticket_events').delete().eq('tenant_id', DEMO_TENANT).lt('created_at', cutoff);
  await client.from('tickets').delete().eq('tenant_id', DEMO_TENANT).lt('created_at', cutoff);

  const { count } = await client
    .from('tickets')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', DEMO_TENANT);
  if ((count ?? 0) >= 6) return;

  const now = Date.now();
  const rows = SEED.map((s, i) => {
    const created = new Date(now - Math.min(s.ageMinutes, 60 * 23) * 60_000);
    const done = s.status === 'Resolved' || s.status === 'Closed';
    return {
      tenant_id: DEMO_TENANT,
      ticket_number: String(480100 + i * 37),
      title: s.title,
      description: s.description,
      category: s.category,
      urgency: s.urgency,
      status: s.status,
      system_impacted: s.system,
      assigned_team: s.team,
      assigned_technician: s.tech ?? '',
      reporter_name: s.reporter,
      reporter_email: s.reporter === 'Noa Levi' ? DEMO_USERS.user.email : `${s.reporter.toLowerCase().replace(/[^a-z]+/g, '.')}@demo.smartq`,
      user_name: s.reporter,
      user_email: s.reporter === 'Noa Levi' ? DEMO_USERS.user.email : `${s.reporter.toLowerCase().replace(/[^a-z]+/g, '.')}@demo.smartq`,
      user_city: s.city,
      user_phone: '',
      created_at: created.toISOString(),
      updated_at: created.toISOString(),
      sla_due_at: slaDueAt(created, s.urgency).toISOString(),
      first_response_at: s.status === 'Open' ? null : new Date(created.getTime() + 12 * 60_000).toISOString(),
      resolved_at: done ? new Date(created.getTime() + 90 * 60_000).toISOString() : null,
      source: 'seed',
    };
  });

  const { data: inserted } = await client.from('tickets').insert(rows).select('id, created_at, status, assigned_team');
  if (inserted?.length) {
    await client.from('ticket_events').insert(
      inserted.flatMap((t: { id: string; created_at: string; status: string; assigned_team: string }) => [
        { tenant_id: DEMO_TENANT, ticket_id: t.id, actor: 'system', type: 'created', to_value: t.assigned_team, created_at: t.created_at },
        ...(t.status !== 'Open'
          ? [{ tenant_id: DEMO_TENANT, ticket_id: t.id, actor: DEMO_USERS.admin.email, type: 'status', from_value: 'Open', to_value: t.status, created_at: new Date(new Date(t.created_at).getTime() + 12 * 60_000).toISOString() }]
          : []),
      ])
    );
  }
}
