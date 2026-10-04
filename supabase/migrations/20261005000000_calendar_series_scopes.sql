-- Existing series remain indefinite: no backfill/default for recurrence_end_date.
alter table public.calendar_events add column recurrence_end_date date;
alter table public.calendar_events add constraint calendar_recurrence_end check (
    recurrence_end_date is null or (recurrence_rule is not null and recurrence_end_date >=
        coalesce(start_date, (starts_at at time zone 'Asia/Singapore')::date))
);

-- Same bounded RRULE subset as _shared/calendar.ts. Tests cover parity (including
-- invalid monthly/yearly dates). Identity always uses the ORIGINAL Singapore day.
create function public.calendar_occurs_on(e public.calendar_events, p_date date)
returns boolean language plpgsql immutable security invoker set search_path = public as $$
declare
    anchor date := coalesce(e.start_date, (e.starts_at at time zone 'Asia/Singapore')::date);
    frequency text := split_part(split_part(e.recurrence_rule, ';', 1), '=', 2);
    cadence integer := coalesce(nullif(split_part(e.recurrence_rule, 'INTERVAL=', 2), ''), '1')::integer;
    months integer;
begin
    if p_date is null or anchor is null or p_date < anchor or (e.recurrence_end_date is not null and p_date > e.recurrence_end_date) then return false; end if;
    if e.recurrence_rule is null then return p_date = anchor; end if;
    if frequency = 'DAILY' then return (p_date - anchor) % cadence = 0; end if;
    if frequency = 'WEEKLY' then return (p_date - anchor) % (cadence * 7) = 0; end if;
    months := (extract(year from p_date)::integer - extract(year from anchor)::integer) * 12 +
        extract(month from p_date)::integer - extract(month from anchor)::integer;
    return extract(day from p_date) = extract(day from anchor) and
        months % (cadence * case when frequency = 'YEARLY' then 12 else 1 end) = 0;
end;
$$;
revoke all on function public.calendar_occurs_on(public.calendar_events,date) from public, anon;
grant execute on function public.calendar_occurs_on(public.calendar_events,date) to authenticated, service_role;

-- Serialize exception writes against splits/truncations of their parent. An old
-- client cannot recreate a future override on a now-truncated/deleted series.
create function public.calendar_lock_exception_parent() returns trigger
language plpgsql security invoker set search_path = public as $$
declare parent public.calendar_events;
begin
    if auth.uid() is not null and not public.is_member_of_space(new.space_id) then
        raise exception 'Calendar membership required' using errcode='42501';
    end if;
    select * into parent from public.calendar_events where id=new.event_id and space_id=new.space_id and deleted_at is null for update;
    if not found or parent.recurrence_rule is null or not public.calendar_occurs_on(parent,new.original_date) then
        raise exception 'This recurring occurrence has changed. Refresh Calendar.';
    end if;
    return new;
end;
$$;
create trigger calendar_lock_exception_parent before insert or update on public.calendar_event_exceptions
for each row execute function public.calendar_lock_exception_parent();

-- A null draft means truncate/delete. Edits create a new master; the first-
-- occurrence path soft-deletes/replaces the old master instead of making an
-- invalid zero-length predecessor. No series/exception history is hard deleted.
create function public.change_calendar_future(p_space_id uuid, p_event_id uuid, p_original_date date,
    p_expected_updated_at timestamptz, p_draft jsonb default null)
returns uuid language plpgsql security invoker set search_path = public as $$
declare
    old_event public.calendar_events;
    next_event public.calendar_events;
    new_id uuid;
    anchor date;
begin
    if auth.uid() is null or not public.is_member_of_space(p_space_id) then raise exception 'Calendar membership required' using errcode='42501'; end if;
    select * into old_event from public.calendar_events where id=p_event_id and space_id=p_space_id and deleted_at is null for update;
    if not found or old_event.recurrence_rule is null or not public.calendar_occurs_on(old_event,p_original_date) then
        raise exception 'This recurring occurrence has changed. Refresh Calendar.';
    end if;
    if p_expected_updated_at is null or old_event.updated_at <> p_expected_updated_at then
        raise exception 'This series has changed. Refresh Calendar before saving.';
    end if;
    -- Lock future exceptions BEFORE touching the master. Parent locking also
    -- prevents inserts/updates racing the snapshot/migration below.
    perform 1 from public.calendar_event_exceptions where event_id=p_event_id and original_date >= p_original_date order by original_date for update;
    anchor := coalesce(old_event.start_date, (old_event.starts_at at time zone 'Asia/Singapore')::date);
    if p_draft is not null then
        if jsonb_typeof(p_draft) <> 'object' or exists (
            select 1 from jsonb_object_keys(p_draft) k where k not in ('title','description','colour','is_all_day','starts_at','ends_at','start_date','end_date','timezone','recurrence_rule','recurrence_end_date','reminder_days_before')
        ) then raise exception 'Invalid Calendar draft'; end if;
        next_event := jsonb_populate_record(null::public.calendar_events,p_draft);
        insert into public.calendar_events(space_id,title,description,colour,is_all_day,starts_at,ends_at,start_date,end_date,timezone,recurrence_rule,recurrence_end_date,reminder_days_before)
        values(p_space_id,next_event.title,next_event.description,next_event.colour,next_event.is_all_day,next_event.starts_at,next_event.ends_at,next_event.start_date,next_event.end_date,next_event.timezone,next_event.recurrence_rule,next_event.recurrence_end_date,next_event.reminder_days_before)
        returning * into next_event;
        new_id := next_event.id;
        -- Selected exception is absorbed into the edited master values. Later
        -- overrides/cancellations move only if valid on BOTH old and new cadence.
        -- Keep original_date, id, fields and created_at unchanged.
        update public.calendar_event_exceptions x set event_id=new_id
        where x.event_id=p_event_id and x.original_date > p_original_date
            and next_event.recurrence_rule is not null
            and public.calendar_occurs_on(old_event,x.original_date)
            and public.calendar_occurs_on(next_event,x.original_date);
    end if;
    if p_original_date = anchor then
        update public.calendar_events set deleted_at=now() where id=p_event_id;
    else
        update public.calendar_events set recurrence_end_date=p_original_date - 1 where id=p_event_id;
    end if;
    return coalesce(new_id,p_event_id);
end;
$$;
revoke all on function public.change_calendar_future(uuid,uuid,date,timestamptz,jsonb) from public, anon, service_role;
grant execute on function public.change_calendar_future(uuid,uuid,date,timestamptz,jsonb) to authenticated;

create or replace function public.calendar_events_in_range(p_space_id uuid, p_from date, p_to date)
returns setof public.calendar_events language plpgsql stable security invoker set search_path = public as $$
begin
    if p_from is null or p_to is null or p_to < p_from or p_to - p_from > 93 then raise exception 'Calendar range must be 0–93 days'; end if;
    return query select e.* from public.calendar_events e where e.space_id=p_space_id and e.deleted_at is null and (
        (e.recurrence_rule is null and (
            (e.is_all_day and e.start_date <= p_to and e.end_date >= p_from)
            or (not e.is_all_day and e.starts_at < ((p_to + 1)::timestamp at time zone 'Asia/Singapore') and e.ends_at > (p_from::timestamp at time zone 'Asia/Singapore'))
        )) or (e.recurrence_rule is not null and (
            (coalesce(e.start_date,(e.starts_at at time zone 'Asia/Singapore')::date) <= p_to and
                (e.recurrence_end_date is null or e.recurrence_end_date >= p_from - (
                    coalesce(e.end_date,((e.ends_at - interval '1 microsecond') at time zone 'Asia/Singapore')::date) -
                    coalesce(e.start_date,(e.starts_at at time zone 'Asia/Singapore')::date))))
            or exists (select 1 from public.calendar_event_exceptions x where x.event_id=e.id and not x.is_cancelled and public.calendar_occurs_on(e,x.original_date) and (
                (x.is_all_day and x.start_date <= p_to and x.end_date >= p_from)
                or (not x.is_all_day and x.starts_at < ((p_to + 1)::timestamp at time zone 'Asia/Singapore') and x.ends_at > (p_from::timestamp at time zone 'Asia/Singapore'))
            ))
        ))
    );
end;
$$;
create or replace function public.calendar_exceptions_in_range(p_space_id uuid, p_from date, p_to date)
returns setof public.calendar_event_exceptions language plpgsql stable security invoker set search_path = public as $$
begin
    if p_from is null or p_to is null or p_to < p_from or p_to - p_from > 93 then raise exception 'Calendar range must be 0–93 days'; end if;
    return query select x.* from public.calendar_event_exceptions x join public.calendar_events e on e.id=x.event_id
    where x.space_id=p_space_id and e.deleted_at is null and e.recurrence_rule is not null and public.calendar_occurs_on(e,x.original_date) and (
        (x.original_date <= p_to and x.original_date >= p_from - (
            coalesce(e.end_date,((e.ends_at - interval '1 microsecond') at time zone 'Asia/Singapore')::date) -
            coalesce(e.start_date,(e.starts_at at time zone 'Asia/Singapore')::date)))
        or (not x.is_cancelled and x.is_all_day and x.start_date <= p_to and x.end_date >= p_from)
        or (not x.is_cancelled and not x.is_all_day and x.starts_at < ((p_to + 1)::timestamp at time zone 'Asia/Singapore') and x.ends_at > (p_from::timestamp at time zone 'Asia/Singapore'))
    );
end;
$$;
