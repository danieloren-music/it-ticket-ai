-- SmartQ - migration 003: tenant-managed OpenID Connect configuration
-- Run after 001_enterprise.sql and before 002_enable_rls.sql.
-- Safe to run more than once, including after 002_enable_rls.sql on existing deployments.

alter table tenant_settings add column if not exists saml_enabled boolean;
update tenant_settings
set saml_enabled = (coalesce(saml_login_url, '') <> '' and coalesce(saml_idp_cert, '') <> '')
where saml_enabled is null;
alter table tenant_settings alter column saml_enabled set default false;
alter table tenant_settings alter column saml_enabled set not null;

alter table tenant_settings add column if not exists oidc_enabled boolean not null default false;
alter table tenant_settings add column if not exists oidc_issuer text;
alter table tenant_settings add column if not exists oidc_client_id text;
alter table tenant_settings add column if not exists oidc_client_secret_ciphertext text;

alter table tenant_settings enable row level security;
revoke all on tenant_settings from anon, authenticated;

comment on column tenant_settings.oidc_client_secret_ciphertext is
  'AES-256-GCM encrypted by the application; encryption key is stored outside the database.';
