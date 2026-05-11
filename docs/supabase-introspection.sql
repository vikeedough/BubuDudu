-- BubuDudu backend introspection script.
-- Paste this whole file into the Supabase SQL editor when a future chat needs
-- live backend details that are not visible from the app source.
--
-- This script is read-only. It does not create, update, or delete data.
-- It intentionally returns metadata and counts, not private row contents.

-- 00. Database version and installed extensions.
select
  '00_database_version' as section,
  version() as postgres_version;

select
  '00_extensions' as section,
  e.extname,
  e.extversion,
  n.nspname as schema_name
from pg_extension e
join pg_namespace n on n.oid = e.extnamespace
order by e.extname;

-- 01. Public table columns.
select
  '01_public_columns' as section,
  c.table_schema,
  c.table_name,
  c.ordinal_position,
  c.column_name,
  c.data_type,
  c.udt_name,
  c.is_nullable,
  c.column_default
from information_schema.columns c
where c.table_schema = 'public'
  and c.table_name in (
    'date_images',
    'galleries',
    'lists',
    'milestones',
    'profiles',
    'quotes',
    'space_invites',
    'space_members',
    'spaces',
    'wheel'
  )
order by c.table_name, c.ordinal_position;

-- 02. Primary keys, foreign keys, unique constraints, and checks.
select
  '02_public_constraints' as section,
  n.nspname as schema_name,
  rel.relname as table_name,
  con.conname as constraint_name,
  case con.contype
    when 'p' then 'primary_key'
    when 'f' then 'foreign_key'
    when 'u' then 'unique'
    when 'c' then 'check'
    when 'x' then 'exclusion'
    else con.contype::text
  end as constraint_type,
  pg_get_constraintdef(con.oid, true) as definition
from pg_constraint con
join pg_class rel on rel.oid = con.conrelid
join pg_namespace n on n.oid = rel.relnamespace
where n.nspname = 'public'
  and rel.relname in (
    'date_images',
    'galleries',
    'lists',
    'milestones',
    'profiles',
    'quotes',
    'space_invites',
    'space_members',
    'spaces',
    'wheel'
  )
order by rel.relname, con.contype, con.conname;

-- 03. Indexes.
select
  '03_public_indexes' as section,
  schemaname,
  tablename,
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in (
    'date_images',
    'galleries',
    'lists',
    'milestones',
    'profiles',
    'quotes',
    'space_invites',
    'space_members',
    'spaces',
    'wheel'
  )
order by tablename, indexname;

-- 04. RLS enabled/forced state for public and storage tables.
select
  '04_rls_state' as section,
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where c.relkind in ('r', 'p')
  and (
    (n.nspname = 'public' and c.relname in (
      'date_images',
      'galleries',
      'lists',
      'milestones',
      'profiles',
      'quotes',
      'space_invites',
      'space_members',
      'spaces',
      'wheel'
    ))
    or (n.nspname = 'storage' and c.relname in ('buckets', 'objects'))
  )
order by n.nspname, c.relname;

-- 05. RLS policies for public and storage tables.
select
  '05_policies' as section,
  schemaname,
  tablename,
  policyname,
  permissive,
  array_to_string(roles, ', ') as roles,
  cmd,
  qual,
  with_check
from pg_policies
where (
    schemaname = 'public'
    and tablename in (
      'date_images',
      'galleries',
      'lists',
      'milestones',
      'profiles',
      'quotes',
      'space_invites',
      'space_members',
      'spaces',
      'wheel'
    )
  )
  or (
    schemaname = 'storage'
    and tablename in ('buckets', 'objects')
  )
order by schemaname, tablename, policyname;

-- 06. Grants relevant to client access.
select
  '06_table_grants' as section,
  table_schema,
  table_name,
  grantee,
  string_agg(privilege_type, ', ' order by privilege_type) as privileges
from information_schema.table_privileges
where table_schema in ('public', 'storage')
  and grantee in ('anon', 'authenticated', 'service_role')
  and (
    table_name in (
      'date_images',
      'galleries',
      'lists',
      'milestones',
      'profiles',
      'quotes',
      'space_invites',
      'space_members',
      'spaces',
      'wheel',
      'buckets',
      'objects'
    )
  )
group by table_schema, table_name, grantee
order by table_schema, table_name, grantee;

-- 07. Triggers on public tables.
select
  '07_public_triggers' as section,
  event_object_schema,
  event_object_table,
  trigger_name,
  string_agg(event_manipulation, ', ' order by event_manipulation) as events,
  action_timing,
  action_orientation,
  action_statement
from information_schema.triggers
where event_object_schema = 'public'
  and event_object_table in (
    'date_images',
    'galleries',
    'lists',
    'milestones',
    'profiles',
    'quotes',
    'space_invites',
    'space_members',
    'spaces',
    'wheel'
  )
group by
  event_object_schema,
  event_object_table,
  trigger_name,
  action_timing,
  action_orientation,
  action_statement
order by event_object_table, trigger_name;

-- 08. Public database functions.
select
  '08_public_functions' as section,
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as returns,
  l.lanname as language,
  p.prosecdef as security_definer,
  pg_get_functiondef(p.oid) as definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
join pg_language l on l.oid = p.prolang
where n.nspname = 'public'
order by p.proname, pg_get_function_arguments(p.oid);

-- 09. Storage buckets.
select
  '09_storage_buckets' as section,
  to_jsonb(b) as bucket
from storage.buckets b
where b.id in ('avatars', 'gallery-private')
order by b.id;

-- 10. Storage object counts and total bytes by bucket.
select
  '10_storage_object_counts' as section,
  o.bucket_id,
  count(*)::bigint as object_count,
  coalesce(sum(nullif(o.metadata->>'size', '')::bigint), 0)::bigint as total_bytes
from storage.objects o
where o.bucket_id in ('avatars', 'gallery-private')
group by o.bucket_id
order by o.bucket_id;

-- 11. Realtime publication membership.
select
  '11_realtime_publications' as section,
  pubname,
  schemaname,
  tablename
from pg_publication_tables
where schemaname = 'public'
  and tablename in (
    'date_images',
    'galleries',
    'lists',
    'milestones',
    'profiles',
    'quotes',
    'space_invites',
    'space_members',
    'spaces',
    'wheel'
  )
order by pubname, schemaname, tablename;

-- 12. Row counts only. This avoids returning private row contents.
select '12_public_row_counts' as section, 'date_images' as table_name, count(*)::bigint as row_count from public.date_images
union all select '12_public_row_counts', 'galleries', count(*)::bigint from public.galleries
union all select '12_public_row_counts', 'lists', count(*)::bigint from public.lists
union all select '12_public_row_counts', 'milestones', count(*)::bigint from public.milestones
union all select '12_public_row_counts', 'profiles', count(*)::bigint from public.profiles
union all select '12_public_row_counts', 'quotes', count(*)::bigint from public.quotes
union all select '12_public_row_counts', 'space_invites', count(*)::bigint from public.space_invites
union all select '12_public_row_counts', 'space_members', count(*)::bigint from public.space_members
union all select '12_public_row_counts', 'spaces', count(*)::bigint from public.spaces
union all select '12_public_row_counts', 'wheel', count(*)::bigint from public.wheel
order by table_name;

-- 13. Auth user counts only. This avoids returning emails or identities.
select
  '13_auth_summary' as section,
  count(*)::bigint as auth_user_count,
  count(*) filter (where confirmed_at is not null)::bigint as confirmed_user_count,
  count(*) filter (where last_sign_in_at is not null)::bigint as users_with_sign_in_count
from auth.users;
