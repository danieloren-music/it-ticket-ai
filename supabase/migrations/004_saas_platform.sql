-- SmartQ - migration 004: tenant groups, automations, and public API credentials.
-- Safe to run more than once. All application access is through the server role.

create table if not exists tenant_groups (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   text not null references tenants(id) on delete cascade,
  name        text not null,
  kind        text not null check (kind in ('access', 'team')),
  description text not null default '',
  permissions text[] not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (tenant_id, id)
);
create unique index if not exists tenant_groups_name_key
  on tenant_groups (tenant_id, kind, lower(name));
create index if not exists tenant_groups_tenant_kind_idx
  on tenant_groups (tenant_id, kind);

create table if not exists tenant_group_members (
  tenant_id   text not null references tenants(id) on delete cascade,
  group_id    uuid not null,
  user_email  text not null,
  created_at  timestamptz not null default now(),
  primary key (tenant_id, group_id, user_email),
  foreign key (tenant_id, group_id) references tenant_groups(tenant_id, id) on delete cascade
);
create index if not exists tenant_group_members_user_idx
  on tenant_group_members (tenant_id, lower(user_email));

create table if not exists tenant_automation_rules (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       text not null references tenants(id) on delete cascade,
  name            text not null,
  trigger_type    text not null check (trigger_type in ('category_routing', 'auto_assignment', 'sla_escalation', 'idle_close', 'webhook')),
  config          jsonb not null default '{}'::jsonb,
  secret_ciphertext text,
  enabled         boolean not null default true,
  created_by      text not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (tenant_id, id)
);
create unique index if not exists tenant_automation_rules_name_key
  on tenant_automation_rules (tenant_id, lower(name));
create index if not exists tenant_automation_rules_enabled_idx
  on tenant_automation_rules (tenant_id, enabled, trigger_type);

create table if not exists automation_runs (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   text not null references tenants(id) on delete cascade,
  rule_id     uuid not null,
  ticket_id   text,
  run_key     text not null,
  status      text not null check (status in ('succeeded', 'failed', 'skipped')),
  detail      text not null default '',
  created_at  timestamptz not null default now(),
  foreign key (tenant_id, rule_id) references tenant_automation_rules(tenant_id, id) on delete cascade,
  unique (rule_id, ticket_id, run_key)
);
create index if not exists automation_runs_tenant_created_idx
  on automation_runs (tenant_id, created_at desc);

create table if not exists tenant_api_keys (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     text not null references tenants(id) on delete cascade,
  name          text not null,
  key_prefix    text not null,
  key_hash      text not null unique,
  scopes        text[] not null,
  expires_at    timestamptz,
  last_used_at  timestamptz,
  revoked_at    timestamptz,
  created_by    text not null,
  created_at    timestamptz not null default now()
);
create index if not exists tenant_api_keys_tenant_idx
  on tenant_api_keys (tenant_id, created_at desc);

alter table tenant_groups enable row level security;
alter table tenant_group_members enable row level security;
alter table tenant_automation_rules enable row level security;
alter table automation_runs enable row level security;
alter table tenant_api_keys enable row level security;

revoke all on tenant_groups, tenant_group_members, tenant_automation_rules, automation_runs, tenant_api_keys
  from anon, authenticated;
