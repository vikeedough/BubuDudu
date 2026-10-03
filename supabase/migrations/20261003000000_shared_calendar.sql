-- Existing application baseline: spaces, space_members, auth.users,
-- is_member_of_space(uuid), set_updated_at(), and lists.
create table public.calendar_events (
    id uuid primary key default gen_random_uuid(),
    space_id uuid not null references public.spaces(id),
    created_by uuid not null default auth.uid() references auth.users(id),
    title text not null check (length(btrim(title)) between 1 and 200),
    description text,
    colour text not null default 'pink' check (colour in ('pink','orange','yellow','green','lightBlue','darkBlue')),
    is_all_day boolean not null default false,
    starts_at timestamptz,
    ends_at timestamptz,
    start_date date,
    end_date date,
    timezone text not null default 'Asia/Singapore' check (timezone = 'Asia/Singapore'),
    recurrence_rule text check (recurrence_rule ~ '^FREQ=(DAILY|WEEKLY|MONTHLY|YEARLY)(;INTERVAL=[1-9][0-9]{0,3})?$'),
    reminder_days_before integer check (reminder_days_before >= 0),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz,
    unique (id, space_id),
    constraint calendar_events_dates check (
        (is_all_day and start_date is not null and end_date is not null and end_date >= start_date and starts_at is null and ends_at is null)
        or (not is_all_day and starts_at is not null and ends_at is not null and ends_at > starts_at and start_date is null and end_date is null)
    )
);
create index calendar_events_space_timed on public.calendar_events(space_id, starts_at, ends_at) where deleted_at is null;
create index calendar_events_space_dates on public.calendar_events(space_id, start_date, end_date) where deleted_at is null;
create index calendar_events_recurring on public.calendar_events(space_id) where recurrence_rule is not null and deleted_at is null;
create trigger set_calendar_events_updated_at before update on public.calendar_events for each row execute function public.set_updated_at();

-- Full typed snapshots for overrides distinguish a null reminder/description from inheritance.
-- A cancelled exception can leave all override fields null.
create table public.calendar_event_exceptions (
    id uuid primary key default gen_random_uuid(),
    event_id uuid not null,
    space_id uuid not null,
    original_date date not null,
    is_cancelled boolean not null default false,
    title text check (length(btrim(title)) between 1 and 200),
    description text,
    colour text check (colour in ('pink','orange','yellow','green','lightBlue','darkBlue')),
    is_all_day boolean,
    starts_at timestamptz,
    ends_at timestamptz,
    start_date date,
    end_date date,
    timezone text check (timezone = 'Asia/Singapore'),
    reminder_days_before integer check (reminder_days_before >= 0),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    foreign key (event_id, space_id) references public.calendar_events(id, space_id),
    unique (event_id, original_date),
    constraint calendar_exceptions_dates check (is_cancelled or (
        title is not null and colour is not null and timezone is not null and is_all_day is not null and (
            (is_all_day and start_date is not null and end_date is not null and end_date >= start_date and starts_at is null and ends_at is null)
            or (not is_all_day and starts_at is not null and ends_at is not null and ends_at > starts_at and start_date is null and end_date is null)
        )
    ))
);
create index calendar_exceptions_space on public.calendar_event_exceptions(space_id);
create trigger set_calendar_exceptions_updated_at before update on public.calendar_event_exceptions for each row execute function public.set_updated_at();

-- Preserve the creator and ownership while allowing every member to edit.
create function public.calendar_protect_identity() returns trigger language plpgsql set search_path = public as $$
begin
    if new.id <> old.id or new.space_id <> old.space_id or new.created_by <> old.created_by or new.created_at <> old.created_at then
        raise exception 'Calendar ownership and creator are immutable';
    end if;
    return new;
end;
$$;
create trigger calendar_protect_identity before update on public.calendar_events for each row execute function public.calendar_protect_identity();

alter table public.calendar_events enable row level security;
alter table public.calendar_event_exceptions enable row level security;
revoke all on public.calendar_events, public.calendar_event_exceptions from anon, authenticated;
grant select, insert, update on public.calendar_events, public.calendar_event_exceptions to authenticated;
grant all on public.calendar_events, public.calendar_event_exceptions to service_role;
-- Tombstones remain visible to members for realtime invalidation; API/UI exclude them.
create policy calendar_events_select on public.calendar_events for select to authenticated using (public.is_member_of_space(space_id));
create policy calendar_events_insert on public.calendar_events for insert to authenticated with check (public.is_member_of_space(space_id) and created_by = auth.uid() and deleted_at is null);
create policy calendar_events_update on public.calendar_events for update to authenticated using (public.is_member_of_space(space_id) and deleted_at is null) with check (public.is_member_of_space(space_id));
create policy calendar_exceptions_select on public.calendar_event_exceptions for select to authenticated using (public.is_member_of_space(space_id));
create policy calendar_exceptions_insert on public.calendar_event_exceptions for insert to authenticated with check (
    public.is_member_of_space(space_id) and exists (select 1 from public.calendar_events e where e.id = event_id and e.space_id = calendar_event_exceptions.space_id and e.deleted_at is null and e.recurrence_rule is not null)
);
create policy calendar_exceptions_update on public.calendar_event_exceptions for update to authenticated using (public.is_member_of_space(space_id)) with check (
    public.is_member_of_space(space_id) and exists (select 1 from public.calendar_events e where e.id = event_id and e.space_id = calendar_event_exceptions.space_id and e.deleted_at is null and e.recurrence_rule is not null)
);

-- Windowed master selection includes masters whose exceptions have moved INTO the window.
-- Invoker security means both branches retain the same RLS boundary as direct table access.
create function public.calendar_events_in_range(p_space_id uuid, p_from date, p_to date)
returns setof public.calendar_events language plpgsql stable security invoker set search_path = public as $$
begin
    if p_to < p_from or p_to - p_from > 93 then raise exception 'Calendar range must be 0–93 days'; end if;
    return query select e.* from public.calendar_events e where e.space_id = p_space_id and e.deleted_at is null and (
        (e.recurrence_rule is not null and (coalesce(e.start_date, (e.starts_at at time zone 'Asia/Singapore')::date) <= p_to
            or exists (select 1 from public.calendar_event_exceptions x where x.event_id=e.id and not x.is_cancelled and (
                (x.is_all_day and x.start_date <= p_to and x.end_date >= p_from)
                or (not x.is_all_day and x.starts_at < ((p_to + 1)::timestamp at time zone 'Asia/Singapore') and x.ends_at > (p_from::timestamp at time zone 'Asia/Singapore'))
            ))))
        or (e.is_all_day and e.start_date <= p_to and e.end_date >= p_from)
        or (not e.is_all_day and e.starts_at < ((p_to + 1)::timestamp at time zone 'Asia/Singapore') and e.ends_at > (p_from::timestamp at time zone 'Asia/Singapore'))
    );
end;
$$;
revoke all on function public.calendar_events_in_range(uuid,date,date) from public, anon;
grant execute on function public.calendar_events_in_range(uuid,date,date) to authenticated, service_role;

create function public.calendar_exceptions_in_range(p_space_id uuid, p_from date, p_to date)
returns setof public.calendar_event_exceptions language plpgsql stable security invoker set search_path = public as $$
begin
    if p_to < p_from or p_to - p_from > 93 then raise exception 'Calendar range must be 0–93 days'; end if;
    return query select x.* from public.calendar_event_exceptions x join public.calendar_events e on e.id=x.event_id
    where x.space_id=p_space_id and e.deleted_at is null and (
        (x.original_date <= p_to and x.original_date >= p_from - (
            coalesce(e.end_date, ((e.ends_at - interval '1 microsecond') at time zone 'Asia/Singapore')::date) -
            coalesce(e.start_date, (e.starts_at at time zone 'Asia/Singapore')::date)))
        or (not x.is_cancelled and x.is_all_day and x.start_date <= p_to and x.end_date >= p_from)
        or (not x.is_cancelled and not x.is_all_day and x.starts_at < ((p_to + 1)::timestamp at time zone 'Asia/Singapore') and x.ends_at > (p_from::timestamp at time zone 'Asia/Singapore'))
    );
end;
$$;
revoke all on function public.calendar_exceptions_in_range(uuid,date,date) from public, anon;
grant execute on function public.calendar_exceptions_in_range(uuid,date,date) to authenticated, service_role;

create table public.calendar_digest_deliveries (
    id uuid primary key default gen_random_uuid(),
    space_id uuid not null references public.spaces(id),
    digest_date date not null,
    status text not null check (status in ('sending','sent','failed')),
    attempt_count integer not null default 1 check (attempt_count > 0),
    telegram_message_id bigint,
    message_text text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    sent_at timestamptz,
    error text,
    unique (space_id, digest_date)
);
create table public.calendar_reminder_deliveries (
    digest_id uuid not null references public.calendar_digest_deliveries(id),
    event_id uuid not null references public.calendar_events(id),
    original_date date not null,
    primary key (digest_id, event_id, original_date)
);
alter table public.calendar_digest_deliveries enable row level security;
alter table public.calendar_reminder_deliveries enable row level security;
revoke all on public.calendar_digest_deliveries, public.calendar_reminder_deliveries from public, anon, authenticated;
grant all on public.calendar_digest_deliveries, public.calendar_reminder_deliveries to service_role;
comment on table public.calendar_reminder_deliveries is 'Claimed occurrence manifest. Delivered ONLY when its parent digest status is sent. One occurrence may qualify on different days (advance reminder and event day).';

-- Claim, manifest, and payload are committed together before the external send.
create function public.claim_calendar_digest(p_space_id uuid, p_date date, p_text text, p_occurrences jsonb)
returns uuid language plpgsql security invoker set search_path = public as $$
declare delivery_id uuid;
begin
    if jsonb_array_length(p_occurrences) = 0 then return null; end if;
    insert into public.calendar_digest_deliveries(space_id,digest_date,status,message_text)
        values(p_space_id,p_date,'sending',p_text)
        on conflict (space_id,digest_date) do update set status='sending', attempt_count=calendar_digest_deliveries.attempt_count+1,
            updated_at=now(), error=null, message_text=excluded.message_text
        where calendar_digest_deliveries.status='failed'
        returning id into delivery_id;
    if delivery_id is null then return null; end if;
    delete from public.calendar_reminder_deliveries where digest_id=delivery_id;
    insert into public.calendar_reminder_deliveries(digest_id,event_id,original_date)
        select delivery_id, (item->>'event_id')::uuid, (item->>'original_date')::date
        from jsonb_array_elements(p_occurrences) item;
    return delivery_id;
end;
$$;
revoke all on function public.claim_calendar_digest(uuid,date,text,jsonb) from public, anon, authenticated;
grant execute on function public.claim_calendar_digest(uuid,date,text,jsonb) to service_role;

-- Preserve Lists rows and schema; no application/backend dependency requires access.
do $$ declare policy_name text; begin
    for policy_name in select policyname from pg_policies where schemaname='public' and tablename='lists' loop
        execute format('drop policy %I on public.lists', policy_name);
    end loop;
end $$;
alter table public.lists enable row level security;
revoke all on public.lists from public, anon, authenticated, service_role;

do $$ begin
    if not exists(select 1 from pg_publication where pubname='supabase_realtime') then
        create publication supabase_realtime;
    end if;
    alter publication supabase_realtime add table public.calendar_events, public.calendar_event_exceptions;
end $$;
