-- SmartQ - migration 007: seed a default SAML settings row so the platform
-- login page renders without a 500 even when migration 006 hasn't been applied.
-- The code paths treat this as "disabled" — it stays opt-in until an admin
-- enables SAML via environment configuration. Safe to run multiple times.

insert into platform_auth_settings (id, saml_enabled, saml_login_url, saml_idp_cert, updated_at)
values ('default', false, '', '', now())
on conflict (id) do update set saml_enabled = false, saml_login_url = '', saml_idp_cert = '';
