-- ════════════════════════════════════════════════════════════════════════════
-- SmartQ - migration 002: lock the database behind the server
--
-- RUN THIS ONLY AFTER:
--   1. SUPABASE_SERVICE_ROLE_KEY is set in Vercel (Settings → Environment Variables)
--   2. the app has been redeployed and you verified you can sign in
--
-- Why: until now the browser held the public "anon" key and talked to the tables directly,
-- so anyone could read every tenant's tickets and users. After this script the anon key has
-- NO access; only the server (service role key, which bypasses RLS) can read or write.
-- ════════════════════════════════════════════════════════════════════════════

alter table tenants           enable row level security;
alter table tenant_users      enable row level security;
alter table tenant_settings   enable row level security;
alter table tickets           enable row level security;
alter table platform_admins   enable row level security;
alter table ticket_events     enable row level security;
alter table audit_log         enable row level security;
alter table contact_requests  enable row level security;

-- Remove any permissive policies that were created before (they would re-open access to the anon key).
do $$
declare p record;
begin
  for p in
    select schemaname, tablename, policyname from pg_policies
    where schemaname = 'public'
      and tablename in ('tenants','tenant_users','tenant_settings','tickets','platform_admins','ticket_events','audit_log','contact_requests')
  loop
    execute format('drop policy if exists %I on %I.%I', p.policyname, p.schemaname, p.tablename);
  end loop;
end $$;

-- No policies = deny-all for anon/authenticated roles. The service role bypasses RLS.
revoke all on tenants, tenant_users, tenant_settings, tickets, platform_admins, ticket_events, audit_log, contact_requests from anon, authenticated;

-- Verify (every row should show rowsecurity = true and no policies):
-- select tablename, rowsecurity from pg_tables where schemaname = 'public';
-- select tablename, policyname from pg_policies where schemaname = 'public';
