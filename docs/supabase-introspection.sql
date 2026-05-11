-- BubuDudu backend introspection script.
-- Paste this whole file into the Supabase SQL editor when a future chat needs
-- live backend details that are not visible from the app source.
--
-- This script is read-only. It intentionally returns metadata and counts, not
-- private row contents.
--
-- Supabase's SQL editor commonly displays only one result grid. This script is
-- therefore written as one combined query that returns:
--
--   section | payload
--
-- Copy/export the full result table and share it with the next chat.

with target_public_tables(table_name) as (
  values
    ('date_images'),
    ('galleries'),
    ('lists'),
    ('milestones'),
    ('profiles'),
    ('quotes'),
    ('space_invites'),
    ('space_members'),
    ('spaces'),
    ('wheel')
),
target_storage_tables(table_name) as (
  values
    ('buckets'),
    ('objects')
),
sections as (
  select
    0 as sort_order,
    '00_database_version' as section,
    jsonb_build_object('postgres_version', version()) as payload

  union all

  select
    1,
    '00_extensions',
    jsonb_build_object(
      'extension', e.extname,
      'version', e.extversion,
      'schema', n.nspname
    )
  from pg_extension e
  join pg_namespace n on n.oid = e.extnamespace

  union all

  select
    2,
    '01_public_columns',
    jsonb_build_object(
      'table_schema', c.table_schema,
      'table_name', c.table_name,
      'ordinal_position', c.ordinal_position,
      'column_name', c.column_name,
      'data_type', c.data_type,
      'udt_name', c.udt_name,
      'is_nullable', c.is_nullable,
      'column_default', c.column_default
    )
  from information_schema.columns c
  join target_public_tables t on t.table_name = c.table_name
  where c.table_schema = 'public'

  union all

  select
    3,
    '02_public_constraints',
    jsonb_build_object(
      'schema', n.nspname,
      'table_name', rel.relname,
      'constraint_name', con.conname,
      'constraint_type',
        case con.contype
          when 'p' then 'primary_key'
          when 'f' then 'foreign_key'
          when 'u' then 'unique'
          when 'c' then 'check'
          when 'x' then 'exclusion'
          else con.contype::text
        end,
      'definition', pg_get_constraintdef(con.oid, true)
    )
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace n on n.oid = rel.relnamespace
  join target_public_tables t on t.table_name = rel.relname
  where n.nspname = 'public'

  union all

  select
    4,
    '03_public_indexes',
    jsonb_build_object(
      'schema', schemaname,
      'table_name', tablename,
      'index_name', indexname,
      'definition', indexdef
    )
  from pg_indexes
  join target_public_tables t on t.table_name = pg_indexes.tablename
  where schemaname = 'public'

  union all

  select
    5,
    '04_rls_state',
    jsonb_build_object(
      'schema', n.nspname,
      'table_name', c.relname,
      'rls_enabled', c.relrowsecurity,
      'rls_forced', c.relforcerowsecurity
    )
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where c.relkind in ('r', 'p')
    and (
      (n.nspname = 'public' and c.relname in (select table_name from target_public_tables))
      or
      (n.nspname = 'storage' and c.relname in (select table_name from target_storage_tables))
    )

  union all

  select
    6,
    '05_policies',
    jsonb_build_object(
      'schema', schemaname,
      'table_name', tablename,
      'policy_name', policyname,
      'permissive', permissive,
      'roles', roles,
      'command', cmd,
      'using', qual,
      'with_check', with_check
    )
  from pg_policies
  where (
      schemaname = 'public'
      and tablename in (select table_name from target_public_tables)
    )
    or (
      schemaname = 'storage'
      and tablename in (select table_name from target_storage_tables)
    )

  union all

  select
    7,
    '06_table_grants',
    jsonb_build_object(
      'table_schema', table_schema,
      'table_name', table_name,
      'grantee', grantee,
      'privileges', string_agg(privilege_type, ', ' order by privilege_type)
    )
  from information_schema.table_privileges
  where table_schema in ('public', 'storage')
    and grantee in ('anon', 'authenticated', 'service_role')
    and (
      table_name in (select table_name from target_public_tables)
      or table_name in (select table_name from target_storage_tables)
    )
  group by table_schema, table_name, grantee

  union all

  select
    8,
    '07_public_triggers',
    jsonb_build_object(
      'event_object_schema', event_object_schema,
      'event_object_table', event_object_table,
      'trigger_name', trigger_name,
      'events', string_agg(event_manipulation, ', ' order by event_manipulation),
      'action_timing', action_timing,
      'action_orientation', action_orientation,
      'action_statement', action_statement
    )
  from information_schema.triggers
  where event_object_schema = 'public'
    and event_object_table in (select table_name from target_public_tables)
  group by
    event_object_schema,
    event_object_table,
    trigger_name,
    action_timing,
    action_orientation,
    action_statement

  union all

  select
    9,
    '08_public_functions',
    jsonb_build_object(
      'schema', n.nspname,
      'function_name', p.proname,
      'arguments', pg_get_function_arguments(p.oid),
      'returns', pg_get_function_result(p.oid),
      'language', l.lanname,
      'security_definer', p.prosecdef,
      'definition', pg_get_functiondef(p.oid)
    )
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  join pg_language l on l.oid = p.prolang
  where n.nspname = 'public'

  union all

  select
    10,
    '09_storage_buckets',
    to_jsonb(b)
  from storage.buckets b
  where b.id in ('avatars', 'gallery-private', 'gallery')

  union all

  select
    11,
    '10_storage_object_counts',
    jsonb_build_object(
      'bucket_id', o.bucket_id,
      'object_count', count(*)::bigint,
      'total_bytes',
        coalesce(
          sum(
            case
              when o.metadata ? 'size'
                and (o.metadata->>'size') ~ '^[0-9]+$'
              then (o.metadata->>'size')::bigint
              else 0
            end
          ),
          0
        )::bigint
    )
  from storage.objects o
  where o.bucket_id in ('avatars', 'gallery-private', 'gallery')
  group by o.bucket_id

  union all

  select
    12,
    '11_auth_triggers',
    jsonb_build_object(
      'event_object_schema', event_object_schema,
      'event_object_table', event_object_table,
      'trigger_name', trigger_name,
      'events', string_agg(event_manipulation, ', ' order by event_manipulation),
      'action_timing', action_timing,
      'action_orientation', action_orientation,
      'action_statement', action_statement
    )
  from information_schema.triggers
  where event_object_schema = 'auth'
    and event_object_table in ('users')
  group by
    event_object_schema,
    event_object_table,
    trigger_name,
    action_timing,
    action_orientation,
    action_statement

  union all

  select
    13,
    '12_realtime_publications',
    jsonb_build_object(
      'publication', pubname,
      'schema', schemaname,
      'table_name', tablename
    )
  from pg_publication_tables
  where schemaname = 'public'
    and tablename in (select table_name from target_public_tables)

  union all

  select
    14,
    '13_public_row_counts',
    jsonb_build_object('table_name', 'date_images', 'row_count', count(*)::bigint)
  from public.date_images

  union all

  select
    14,
    '13_public_row_counts',
    jsonb_build_object('table_name', 'galleries', 'row_count', count(*)::bigint)
  from public.galleries

  union all

  select
    14,
    '13_public_row_counts',
    jsonb_build_object('table_name', 'lists', 'row_count', count(*)::bigint)
  from public.lists

  union all

  select
    14,
    '13_public_row_counts',
    jsonb_build_object('table_name', 'milestones', 'row_count', count(*)::bigint)
  from public.milestones

  union all

  select
    14,
    '13_public_row_counts',
    jsonb_build_object('table_name', 'profiles', 'row_count', count(*)::bigint)
  from public.profiles

  union all

  select
    14,
    '13_public_row_counts',
    jsonb_build_object('table_name', 'quotes', 'row_count', count(*)::bigint)
  from public.quotes

  union all

  select
    14,
    '13_public_row_counts',
    jsonb_build_object('table_name', 'space_invites', 'row_count', count(*)::bigint)
  from public.space_invites

  union all

  select
    14,
    '13_public_row_counts',
    jsonb_build_object('table_name', 'space_members', 'row_count', count(*)::bigint)
  from public.space_members

  union all

  select
    14,
    '13_public_row_counts',
    jsonb_build_object('table_name', 'spaces', 'row_count', count(*)::bigint)
  from public.spaces

  union all

  select
    14,
    '13_public_row_counts',
    jsonb_build_object('table_name', 'wheel', 'row_count', count(*)::bigint)
  from public.wheel

  union all

  select
    15,
    '14_auth_summary',
    jsonb_build_object(
      'auth_user_count', count(*)::bigint,
      'confirmed_user_count', count(*) filter (where confirmed_at is not null)::bigint,
      'users_with_sign_in_count', count(*) filter (where last_sign_in_at is not null)::bigint
    )
  from auth.users
)
select section, payload
from sections
order by sort_order, section, payload::text;
