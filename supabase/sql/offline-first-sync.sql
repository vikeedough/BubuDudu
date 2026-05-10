-- Run this in the Supabase SQL editor before enabling offline sync in production.
-- It adds server-side timestamps and soft-delete columns used by the local
-- outbox conflict strategy.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

alter table public.lists
add column if not exists updated_at timestamptz not null default now(),
add column if not exists deleted_at timestamptz;

update public.lists
set updated_at = coalesce(last_updated_at, updated_at, now());

alter table public.wheel
add column if not exists updated_at timestamptz not null default now(),
add column if not exists deleted_at timestamptz;

alter table public.milestones
add column if not exists updated_at timestamptz not null default now(),
add column if not exists deleted_at timestamptz;

alter table public.profiles
add column if not exists updated_at timestamptz not null default now();

drop trigger if exists set_lists_updated_at on public.lists;
create trigger set_lists_updated_at
before update on public.lists
for each row execute function public.set_updated_at();

drop trigger if exists set_wheel_updated_at on public.wheel;
create trigger set_wheel_updated_at
before update on public.wheel
for each row execute function public.set_updated_at();

drop trigger if exists set_milestones_updated_at on public.milestones;
create trigger set_milestones_updated_at
before update on public.milestones
for each row execute function public.set_updated_at();

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create index if not exists lists_space_sync_idx
on public.lists (space_id, updated_at, deleted_at);

create index if not exists wheel_space_sync_idx
on public.wheel (space_id, updated_at, deleted_at);

create index if not exists milestones_space_sync_idx
on public.milestones (space_id, updated_at, deleted_at);

create index if not exists profiles_updated_idx
on public.profiles (updated_at);
