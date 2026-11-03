-- Read-only: inspect required SmartQ columns. This does not alter the database.
select table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name in ('tenants','tenant_users','tenant_settings','tickets','platform_admins','ticket_events','audit_log','contact_requests')
order by table_name, ordinal_position;
