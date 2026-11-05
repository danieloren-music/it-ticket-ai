-- SmartQ - migration 005: secure password recovery for platform admins.
-- Safe to run more than once. Application access is through the server role.

alter table public.platform_admins
  add column if not exists password_changed_at timestamptz not null default 'epoch'::timestamptz;

create table if not exists public.platform_password_resets (
  token_hash  text primary key check (token_hash ~ '^[0-9a-f]{64}$'),
  admin_email text not null,
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now()
);

create index if not exists platform_password_resets_admin_email_idx
  on public.platform_password_resets (admin_email);
create index if not exists platform_password_resets_expires_at_idx
  on public.platform_password_resets (expires_at);

alter table public.platform_password_resets enable row level security;
revoke all on public.platform_password_resets from anon, authenticated;
