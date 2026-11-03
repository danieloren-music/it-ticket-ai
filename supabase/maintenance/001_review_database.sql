-- SmartQ database inventory. Read-only; safe to run before planning cleanup.
-- Run in Supabase SQL Editor and review every result set before considering any DROP.

-- Public relations, estimated row counts, storage, and RLS.
select
  c.relname as object_name,
  case c.relkind
    when 'r' then 'table'
    when 'p' then 'partitioned table'
    when 'v' then 'view'
    when 'm' then 'materialized view'
    when 'f' then 'foreign table'
  end as object_type,
  greatest(c.reltuples, 0)::bigint as estimated_rows,
  pg_size_pretty(pg_total_relation_size(c.oid)) as total_size,
  c.relrowsecurity as rls_enabled,
  obj_description(c.oid, 'pg_class') as description
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind in ('r', 'p', 'v', 'm', 'f')
order by c.relkind, c.relname;

-- Tables directly used by the current SmartQ application and migrations.
select
  c.relname as table_name,
  greatest(c.reltuples, 0)::bigint as estimated_rows,
  pg_size_pretty(pg_total_relation_size(c.oid)) as total_size,
  c.relrowsecurity as rls_enabled,
  exists (
    select 1
    from pg_policies p
    where p.schemaname = n.nspname
      and p.tablename = c.relname
  ) as has_rls_policies
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind in ('r', 'p')
  and c.relname in (
    'tenants',
    'tenant_users',
    'tickets',
    'ticket_events',
    'tenant_settings',
    'platform_admins',
    'audit_log',
    'contact_requests'
  )
order by c.relname;

-- Foreign-key relationships involving public tables. DROP RESTRICT in the
-- companion cleanup script will refuse to remove tables with dependencies.
select
  con.conname as constraint_name,
  con.conrelid::regclass as source_table,
  con.confrelid::regclass as referenced_table
from pg_constraint con
join pg_class src on src.oid = con.conrelid
join pg_namespace src_ns on src_ns.oid = src.relnamespace
join pg_class dst on dst.oid = con.confrelid
join pg_namespace dst_ns on dst_ns.oid = dst.relnamespace
where con.contype = 'f'
  and (src_ns.nspname = 'public' or dst_ns.nspname = 'public')
order by 2, 1;
