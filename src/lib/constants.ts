/** Client + server safe domain constants. */

export const ROLES = ['User', 'Admin', 'Manager'] as const;
export type DbRole = (typeof ROLES)[number];

export const URGENCIES = ['Low', 'Medium', 'High', 'Critical'] as const;
export type Urgency = (typeof URGENCIES)[number];

export const STATUSES = ['Open', 'In Progress', 'Pending User', 'Resolved', 'Closed'] as const;
export type TicketStatus = (typeof STATUSES)[number];

export const TEAMS = [
  'Helpdesk Tier 1',
  'System & Cloud Team',
  'Network & Security',
  'IT Applications & BI',
  'Identity & Access',
] as const;
export type Team = (typeof TEAMS)[number];

export const CATEGORIES = [
  'Hardware',
  'Software & SaaS',
  'Network & Connectivity',
  'Access & IAM',
  'Cloud & Infrastructure',
  'Cyber Security',
  'Workstation & Peripherals',
  'Database & BI',
  'General IT Request',
] as const;
export type Category = (typeof CATEGORIES)[number];

/** Resolution targets in hours, by urgency. */
export const SLA_HOURS: Record<Urgency, number> = { Critical: 4, High: 8, Medium: 24, Low: 72 };

export const RESERVED_SLUGS = new Set([
  'home', 'platform', 'api', 'login', 'logout', 'admin', 'admins', 'manage', 'self-service', 'selfservice',
  'www', 'app', 'static', 'assets', 'public', 'docs', 'status', 'support', 'privacy', 'terms', 'contact',
  'demo-admin', 'icon', 'apple-icon', 'opengraph-image', 'robots', 'sitemap',
]);

export const DEMO_TENANT = 'demo';

export const PLATFORM_ROLES = [
  'Super Admin',
  'Global IT Director',
  'SecOps Lead',
  'Cloud Infrastructure Architect',
  'Lead Support Engineer',
  'Compliance & IAM Auditor',
  'Read-Only Viewer',
] as const;

/** Platform roles that are not allowed to change anything. */
export const PLATFORM_READONLY_ROLES = new Set<string>(['Read-Only Viewer', 'Compliance & IAM Auditor']);

type Label = { he: string; en: string };

export const CATEGORY_LABELS: Record<Category, Label> = {
  Hardware: { he: 'חומרה', en: 'Hardware' },
  'Software & SaaS': { he: 'תוכנה ו-SaaS', en: 'Software & SaaS' },
  'Network & Connectivity': { he: 'רשת ותקשורת', en: 'Network & Connectivity' },
  'Access & IAM': { he: 'הרשאות וזהויות', en: 'Access & Identity' },
  'Cloud & Infrastructure': { he: 'ענן ותשתיות', en: 'Cloud & Infrastructure' },
  'Cyber Security': { he: 'אבטחת מידע', en: 'Cyber Security' },
  'Workstation & Peripherals': { he: 'עמדות וציוד היקפי', en: 'Workstation & Peripherals' },
  'Database & BI': { he: 'מסדי נתונים ו-BI', en: 'Database & BI' },
  'General IT Request': { he: 'בקשת IT כללית', en: 'General IT request' },
};

export const URGENCY_LABELS: Record<Urgency, Label> = {
  Low: { he: 'נמוכה', en: 'Low' },
  Medium: { he: 'בינונית', en: 'Medium' },
  High: { he: 'גבוהה', en: 'High' },
  Critical: { he: 'קריטית', en: 'Critical' },
};

export const STATUS_LABELS: Record<TicketStatus, Label> = {
  Open: { he: 'פתוחה', en: 'Open' },
  'In Progress': { he: 'בטיפול', en: 'In progress' },
  'Pending User': { he: 'ממתינה לפונה', en: 'Pending user' },
  Resolved: { he: 'נפתרה', en: 'Resolved' },
  Closed: { he: 'סגורה', en: 'Closed' },
};

export const TEAM_LABELS: Record<Team, Label> = {
  'Helpdesk Tier 1': { he: 'מוקד תמיכה שכבה 1', en: 'Helpdesk Tier 1' },
  'System & Cloud Team': { he: 'צוות מערכות וענן', en: 'System & Cloud Team' },
  'Network & Security': { he: 'רשתות ואבטחה', en: 'Network & Security' },
  'IT Applications & BI': { he: 'יישומים ו-BI', en: 'IT Applications & BI' },
  'Identity & Access': { he: 'זהויות והרשאות', en: 'Identity & Access' },
};

export const ROLE_LABELS: Record<DbRole, Label> = {
  User: { he: 'עובד', en: 'Employee' },
  Admin: { he: 'טכנאי IT', en: 'IT technician' },
  Manager: { he: 'מנהל מערכת', en: 'Administrator' },
};

export function label<T extends string>(map: Record<T, Label>, key: string, lang: 'he' | 'en'): string {
  const entry = (map as Record<string, Label>)[key];
  return entry ? entry[lang] : key;
}

export function isOneOf<T extends readonly string[]>(list: T, v: unknown): v is T[number] {
  return typeof v === 'string' && (list as readonly string[]).includes(v);
}

export function slaDueAt(createdAt: Date, urgency: Urgency): Date {
  return new Date(createdAt.getTime() + SLA_HOURS[urgency] * 3600_000);
}
