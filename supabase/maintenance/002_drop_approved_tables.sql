-- SmartQ guarded cleanup template.
--
-- This file does nothing unless BOTH execute_cleanup and confirmation are
-- deliberately changed below. It only considers explicitly listed ordinary
-- tables in the public schema, never uses CASCADE, and protects SmartQ tables.
--
-- Before enabling:
--   1. Run 001_review_database.sql and inspect all results.
--   2. Take and verify a restorable Supabase backup.
--   3. Confirm each table is not used by client code, SQL functions, triggers,
--      views, reports, integrations, scheduled jobs, or customer data.
--   4. Add only the exact approved table names to approved_tables.
--   5. Set execute_cleanup = true and type the exact confirmation phrase.
--
-- Run in a maintenance window. DROP TABLE is irreversible without a backup.

begin;

do $cleanup$
declare
  protected_tables constant text[] := array[
    'tenants',
    'tenant_users',
    'tickets',
    'ticket_events',
    'tenant_settings',
    'platform_admins',
    'audit_log',
    'contact_requests'
  ];
  approved_tables text[] := array[]::text[];
  execute_cleanup boolean := false;
  confirmation text := '';
  target_table text;
  exists_as_table boolean;
begin
  if not execute_cleanup then
    raise notice 'Dry run: no tables were dropped. Review the inventory and explicitly approve tables before cleanup.';
    return;
  end if;

  if confirmation <> 'DROP_APPROVED_PUBLIC_TABLES' then
    raise exception 'Cleanup stopped: confirmation phrase is missing or incorrect.';
  end if;

  if cardinality(approved_tables) = 0 then
    raise notice 'No approved tables were listed. Nothing was dropped.';
    return;
  end if;

  foreach target_table in array approved_tables loop
    if target_table = any(protected_tables) then
      raise exception 'Refusing to drop protected SmartQ table: %', target_table;
    end if;

    if target_table !~ '^[a-zA-Z_][a-zA-Z0-9_]*$' then
      raise exception 'Invalid public table name: %', target_table;
    end if;

    select exists (
      select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = target_table
        and c.relkind in ('r', 'p')
    ) into exists_as_table;

    if not exists_as_table then
      raise exception 'Not an ordinary or partitioned table in public: %', target_table;
    end if;

    execute format('drop table public.%I restrict', target_table);
    raise notice 'Dropped explicitly approved table public.%', target_table;
  end loop;
end
$cleanup$;

commit;
