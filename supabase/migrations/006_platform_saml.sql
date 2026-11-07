create table if not exists platform_auth_settings (
  id text primary key default 'default' check (id = 'default'),
  saml_enabled boolean not null default false,
  saml_login_url text,
  saml_idp_cert text,
  updated_at timestamptz not null default now()
);

alter table platform_auth_settings enable row level security;
revoke all on platform_auth_settings from anon, authenticated;

alter table public.platform_admins
  add column if not exists sso_only boolean not null default false;
