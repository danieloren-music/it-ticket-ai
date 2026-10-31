-- ════════════════════════════════════════════════════════════════════════════
-- SmartQ - migration 001: enterprise hardening
-- Safe to run more than once (idempotent). Run in: Supabase → SQL Editor.
-- Order: (1) this file  →  (2) set SUPABASE_SERVICE_ROLE_KEY in Vercel + redeploy
--        →  (3) 002_enable_rls.sql
-- ════════════════════════════════════════════════════════════════════════════

-- ── Normalise identifiers (the app now matches with exact, lower-case keys) ──
do $$ begin
  update tenants          set id = lower(id) where id <> lower(id);
  update tenant_users     set tenant_id = lower(tenant_id), email = lower(email) where tenant_id <> lower(tenant_id) or email <> lower(email);
  update tickets          set tenant_id = lower(tenant_id) where tenant_id <> lower(tenant_id);
  update platform_admins  set email = lower(email) where email <> lower(email);
exception when others then
  raise notice 'identifier normalisation skipped: %', sqlerrm;
end $$;

-- ── tenant_users: account security ──
alter table tenant_users add column if not exists must_change_password boolean not null default false;
alter table tenant_users add column if not exists failed_attempts      integer not null default 0;
alter table tenant_users add column if not exists locked_until         timestamptz;
alter table tenant_users add column if not exists last_login_at        timestamptz;
alter table tenant_users add column if not exists updated_at           timestamptz default now();
alter table tenant_users add column if not exists is_active            boolean not null default true;

-- ── platform_admins: account security ──
alter table platform_admins add column if not exists failed_attempts integer not null default 0;
alter table platform_admins add column if not exists locked_until    timestamptz;
alter table platform_admins add column if not exists last_login_at   timestamptz;
alter table platform_admins add column if not exists updated_at      timestamptz default now();

-- ── tenant_settings: SAML (signature validation needs the IdP certificate) ──
create table if not exists tenant_settings (
  tenant_id text primary key,
  created_at timestamptz default now()
);
alter table tenant_settings add column if not exists saml_login_url         text;
alter table tenant_settings add column if not exists saml_idp_cert          text;
alter table tenant_settings add column if not exists saml_group_managers_id text;
alter table tenant_settings add column if not exists saml_group_admins_id   text;
alter table tenant_settings add column if not exists saml_group_users_id    text;
alter table tenant_settings add column if not exists updated_at             timestamptz default now();
do $$ begin
  create unique index if not exists tenant_settings_tenant_id_key on tenant_settings (tenant_id);
exception when others then
  raise notice 'tenant_settings(tenant_id) unique index skipped: %', sqlerrm;
end $$;

-- ── tickets: lifecycle + SLA ──
alter table tickets add column if not exists system_impacted   text;
alter table tickets add column if not exists updated_at        timestamptz default now();
alter table tickets add column if not exists resolved_at       timestamptz;
alter table tickets add column if not exists first_response_at timestamptz;
alter table tickets add column if not exists sla_due_at        timestamptz;
alter table tickets add column if not exists source            text default 'manual';
alter table tickets add column if not exists reporter_name     text;
alter table tickets add column if not exists reporter_email    text;
alter table tickets add column if not exists assigned_technician text;
alter table tickets add column if not exists admin_internal_notes text;

-- back-fill reporter columns from the legacy user_* columns
update tickets set reporter_email = lower(coalesce(reporter_email, user_email)) where reporter_email is null and user_email is not null;
update tickets set reporter_name  = coalesce(reporter_name, user_name)          where reporter_name  is null and user_name  is not null;

-- unique ticket numbers per tenant (skipped with a notice if legacy duplicates exist)
do $$ begin
  create unique index if not exists tickets_tenant_number_key on tickets (tenant_id, ticket_number);
exception when others then
  raise notice 'tickets(tenant_id, ticket_number) unique index skipped (duplicates exist): %', sqlerrm;
end $$;

create index if not exists tickets_tenant_created_idx  on tickets (tenant_id, created_at desc);
create index if not exists tickets_tenant_reporter_idx on tickets (tenant_id, reporter_email);
create index if not exists tickets_tenant_status_idx   on tickets (tenant_id, status);
create index if not exists tenant_users_tenant_idx     on tenant_users (tenant_id);

do $$ begin
  create unique index if not exists tenant_users_tenant_email_key on tenant_users (tenant_id, email);
exception when others then
  raise notice 'tenant_users(tenant_id, email) unique index skipped: %', sqlerrm;
end $$;

-- ── ticket timeline (status changes, replies, internal notes) ──
create table if not exists ticket_events (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   text not null,
  ticket_id   text not null,
  actor       text not null,
  type        text not null,
  from_value  text,
  to_value    text,
  body        text,
  internal    boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists ticket_events_ticket_idx on ticket_events (tenant_id, ticket_id, created_at);

-- ── audit trail (who did what, from where) ──
create table if not exists audit_log (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   text,
  actor_email text not null,
  actor_role  text,
  action      text not null,
  target      text,
  meta        jsonb not null default '{}'::jsonb,
  ip          text,
  created_at  timestamptz not null default now()
);
create index if not exists audit_log_tenant_idx on audit_log (tenant_id, created_at desc);
create index if not exists audit_log_created_idx on audit_log (created_at desc);

-- ── inbound leads from the marketing site ──
create table if not exists contact_requests (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text not null,
  company    text not null,
  phone      text,
  message    text,
  ip         text,
  created_at timestamptz not null default now()
);

-- ── Passwords: existing plaintext values are upgraded to scrypt hashes automatically on each user's next login ──
-- (nothing to run here - see src/lib/password.ts)

-- ── Check: should return 0 rows once everything is consistent ──
-- select tenant_id, ticket_number, count(*) from tickets group by 1,2 having count(*) > 1;
