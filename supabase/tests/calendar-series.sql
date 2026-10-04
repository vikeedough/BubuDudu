-- Rollback-only fixtures: no accounts, delivery rows, cron or Telegram changes.
begin;
select set_config('calendar_test.space', gen_random_uuid()::text, true);
select set_config('calendar_test.creator', (select id::text from auth.users order by id limit 1), true);
select set_config('calendar_test.partner', (select id::text from auth.users order by id offset 1 limit 1), true);
select set_config('calendar_test.outsider', (select id::text from auth.users order by id offset 2 limit 1), true);
do $$ begin
    if current_setting('calendar_test.outsider',true) is null then raise exception 'Requires three existing Auth users'; end if;
end $$;
insert into public.spaces(id,name,created_by) values(current_setting('calendar_test.space')::uuid,'Calendar series rollback validation',current_setting('calendar_test.creator')::uuid);
insert into public.space_members(space_id,user_id) values
    (current_setting('calendar_test.space')::uuid,current_setting('calendar_test.creator')::uuid),
    (current_setting('calendar_test.space')::uuid,current_setting('calendar_test.partner')::uuid);
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('calendar_test.creator'),true);
do $$ declare
    s uuid := current_setting('calendar_test.space')::uuid;
    e public.calendar_events; n public.calendar_events; old_copy public.calendar_events;
    next_id uuid; prior_id uuid; selected_id uuid; later_id uuid; cancel_id uuid; count_before integer;
    draft jsonb; freq text;
begin
    insert into public.calendar_events(space_id,title,is_all_day,start_date,end_date,recurrence_rule)
    values(s,'Weekly',true,'2026-10-05','2026-10-05','FREQ=WEEKLY') returning * into e;
    if e.recurrence_end_date is not null then raise exception 'Legacy series changed'; end if;
    if not public.calendar_occurs_on(e,'2030-10-07') then raise exception 'Null end stopped indefinite series'; end if;
    begin update public.calendar_events set recurrence_end_date='2026-10-04' where id=e.id; raise exception 'Invalid end accepted'; exception when check_violation then null; end;
    begin insert into public.calendar_events(space_id,title,is_all_day,start_date,end_date,recurrence_end_date) values(s,'Not recurring',true,'2026-10-05','2026-10-05','2027-10-05'); raise exception 'Nonrecurring end accepted'; exception when check_violation then null; end;
    begin insert into public.calendar_events(space_id,title,starts_at,ends_at) values(s,'Missing end','2026-10-05 01:00Z',null); raise exception 'Missing timed end accepted'; exception when check_violation then null; end;
    begin insert into public.calendar_events(space_id,title,is_all_day,start_date,end_date) values(s,'Reverse',true,'2026-10-05','2026-10-04'); raise exception 'Reverse all-day accepted'; exception when check_violation then null; end;
    begin insert into public.calendar_events(space_id,title,is_all_day,start_date,end_date,reminder_days_before) values(s,'Negative reminder',true,'2026-10-05','2026-10-05',-1); raise exception 'Negative reminder accepted'; exception when check_violation then null; end;
    -- SQL cadence helper parity with the shared engine, including leap/month skips.
    foreach freq in array array['FREQ=DAILY','FREQ=WEEKLY','FREQ=WEEKLY;INTERVAL=2','FREQ=MONTHLY','FREQ=YEARLY','FREQ=DAILY;INTERVAL=3'] loop
        n := e; n.recurrence_rule := freq; n.recurrence_end_date := '2027-10-05';
        if not public.calendar_occurs_on(n,'2026-10-05') or public.calendar_occurs_on(n,'2027-10-06') then raise exception 'Cadence cutoff failed: %',freq; end if;
    end loop;
    n := e; n.start_date := '2026-01-31'; n.recurrence_rule := 'FREQ=MONTHLY';
    if public.calendar_occurs_on(n,'2026-02-28') or not public.calendar_occurs_on(n,'2026-03-31') then raise exception 'Monthly parity'; end if;
    n.start_date := '2024-02-29'; n.recurrence_rule := 'FREQ=YEARLY';
    if public.calendar_occurs_on(n,'2025-02-28') or not public.calendar_occurs_on(n,'2028-02-29') then raise exception 'Yearly parity'; end if;
    n := e; n.recurrence_rule := 'FREQ=WEEKLY;INTERVAL=2';
    if public.calendar_occurs_on(n,'2026-10-12') or not public.calendar_occurs_on(n,'2026-10-19') then raise exception 'Biweekly parity'; end if;
    -- Prior moved override, selected override, later override and later cancellation.
    insert into public.calendar_event_exceptions(event_id,space_id,original_date,title,is_all_day,start_date,end_date,colour,timezone,reminder_days_before)
    values(e.id,s,'2026-10-12','Prior moved',true,'2026-11-20','2026-11-20','green','Asia/Singapore',2) returning id into prior_id;
    insert into public.calendar_event_exceptions(event_id,space_id,original_date,title,is_all_day,start_date,end_date,colour,timezone)
    values(e.id,s,'2026-10-19','Selected override',true,'2026-10-19','2026-10-19','green','Asia/Singapore') returning id into selected_id;
    insert into public.calendar_event_exceptions(event_id,space_id,original_date,title,is_all_day,start_date,end_date,colour,timezone,reminder_days_before)
    values(e.id,s,'2026-10-26','Later moved',true,'2026-11-22','2026-11-22','green','Asia/Singapore',3) returning id into later_id;
    insert into public.calendar_event_exceptions(event_id,space_id,original_date,is_cancelled)
    values(e.id,s,'2026-11-02',true) returning id into cancel_id;
    draft := jsonb_build_object('title','New weekly','is_all_day',true,'start_date','2026-10-19','end_date','2026-10-19','colour','pink','timezone','Asia/Singapore','recurrence_rule','FREQ=WEEKLY','recurrence_end_date','2026-11-02','reminder_days_before',2);
    count_before := (select count(*) from public.calendar_events where space_id=s);
    -- Constraint error after RPC insert must roll the entire statement back.
    begin perform public.change_calendar_future(s,e.id,'2026-10-19',e.updated_at,draft || '{"recurrence_end_date":"2026-10-18"}'); raise exception 'Invalid split accepted'; exception when check_violation then null; end;
    if (select count(*) from public.calendar_events where space_id=s) <> count_before or (select recurrence_end_date from public.calendar_events where id=e.id) is not null then raise exception 'Failed split partially persisted'; end if;
    begin perform public.change_calendar_future(s,e.id,'2026-10-19',e.updated_at,draft || '{"created_by":"00000000-0000-0000-0000-000000000000"}'); raise exception 'Ownership payload accepted'; exception when raise_exception then if sqlerrm='Ownership payload accepted' then raise; end if; end;
    -- A partner may split a series authored by the other member.
    perform set_config('request.jwt.claim.sub',current_setting('calendar_test.partner'),true);
    next_id := public.change_calendar_future(s,e.id,'2026-10-19',e.updated_at,draft);
    select * into old_copy from public.calendar_events where id=e.id;
    select * into n from public.calendar_events where id=next_id;
    if old_copy.recurrence_end_date <> '2026-10-18' or old_copy.deleted_at is not null then raise exception 'Old series not truncated'; end if;
    if not public.calendar_occurs_on(old_copy,'2026-10-05') or not public.calendar_occurs_on(old_copy,'2026-10-12') or public.calendar_occurs_on(old_copy,'2026-10-19') then raise exception 'Old 5/12 cadence failed'; end if;
    if n.start_date <> '2026-10-19' or n.recurrence_end_date <> '2026-11-02' or n.created_by <> current_setting('calendar_test.partner')::uuid or not public.calendar_occurs_on(n,'2026-10-26') then raise exception 'New 19/26 cadence failed'; end if;
    if (select event_id from public.calendar_event_exceptions where id=prior_id) <> e.id or (select event_id from public.calendar_event_exceptions where id=selected_id) <> e.id then raise exception 'Prior/selected history lost'; end if;
    if not exists(select 1 from public.calendar_event_exceptions where id=later_id and event_id=next_id and original_date='2026-10-26' and title='Later moved' and reminder_days_before=3) then raise exception 'Later override lost'; end if;
    if not exists(select 1 from public.calendar_event_exceptions where id=cancel_id and event_id=next_id and original_date='2026-11-02' and is_cancelled) then raise exception 'Later cancellation lost'; end if;
    if not exists(select 1 from public.calendar_events_in_range(s,'2026-11-20','2026-11-20') where id=e.id) or not exists(select 1 from public.calendar_exceptions_in_range(s,'2026-11-20','2026-11-20') where id=prior_id) then raise exception 'Valid prior moved override lost after split'; end if;
    if exists(select 1 from public.calendar_exceptions_in_range(s,'2026-10-19','2026-10-19') where id=selected_id) then raise exception 'Selected exception shadows new master'; end if;
    begin perform public.change_calendar_future(s,e.id,'2026-10-12',e.updated_at - interval '1 second',draft); raise exception 'Stale split accepted'; exception when raise_exception then if sqlerrm not like 'This series has changed.%' then raise; end if; end;
    -- Truncation ignores retained later exception history.
    perform public.change_calendar_future(s,n.id,'2026-10-26',n.updated_at,null);
    select * into n from public.calendar_events where id=next_id;
    if n.recurrence_end_date <> '2026-10-25' or public.calendar_occurs_on(n,'2026-10-26') then raise exception 'Future delete failed'; end if;
    if not exists(select 1 from public.calendar_event_exceptions where id=later_id) or exists(select 1 from public.calendar_exceptions_in_range(s,'2026-11-22','2026-11-22') where id=later_id) then raise exception 'Truncated exception not retained/ignored'; end if;
    begin insert into public.calendar_event_exceptions(event_id,space_id,original_date,is_cancelled) values(n.id,s,'2026-11-09',true); raise exception 'Truncated exception write accepted'; exception when raise_exception then if sqlerrm not like 'This recurring occurrence has changed.%' then raise; end if; end;
    -- First occurrence replaces via soft delete, and first delete soft-deletes.
    next_id := public.change_calendar_future(s,n.id,'2026-10-19',n.updated_at,draft);
    if (select deleted_at from public.calendar_events where id=n.id) is null then raise exception 'First edit retained invalid predecessor'; end if;
    select * into n from public.calendar_events where id=next_id;
    perform public.change_calendar_future(s,n.id,'2026-10-19',n.updated_at,null);
    if (select deleted_at from public.calendar_events where id=n.id) is null then raise exception 'First delete failed'; end if;
    -- Changed cadence moves applicable later dates only; incompatible history retained.
    insert into public.calendar_events(space_id,title,is_all_day,start_date,end_date,recurrence_rule) values(s,'Cadence',true,'2026-10-05','2026-10-05','FREQ=WEEKLY') returning * into e;
    insert into public.calendar_event_exceptions(event_id,space_id,original_date,is_cancelled) values(e.id,s,'2026-10-26',true),(e.id,s,'2026-11-02',true);
    next_id := public.change_calendar_future(s,e.id,'2026-10-19',e.updated_at,draft || '{"recurrence_rule":"FREQ=WEEKLY;INTERVAL=2"}');
    if not exists(select 1 from public.calendar_event_exceptions where event_id=next_id and original_date='2026-11-02') or not exists(select 1 from public.calendar_event_exceptions where event_id=e.id and original_date='2026-10-26') then raise exception 'Changed cadence reassignment failed'; end if;
    -- Final multi-day occurrence still overlaps later days; expired masters filtered.
    insert into public.calendar_events(space_id,title,is_all_day,start_date,end_date,recurrence_rule,recurrence_end_date) values(s,'Long',true,'2026-10-05','2026-10-07','FREQ=WEEKLY','2026-10-05') returning * into e;
    if not exists(select 1 from public.calendar_events_in_range(s,'2026-10-07','2026-10-07') where id=e.id) or exists(select 1 from public.calendar_events_in_range(s,'2026-10-08','2026-10-08') where id=e.id) then raise exception 'All-day overlap cutoff failed'; end if;
    insert into public.calendar_events(space_id,title,starts_at,ends_at,recurrence_rule,recurrence_end_date) values(s,'Timed long','2026-10-05 15:00Z','2026-10-06 16:00Z','FREQ=WEEKLY','2026-10-05') returning * into e;
    if not exists(select 1 from public.calendar_events_in_range(s,'2026-10-06','2026-10-06') where id=e.id) or exists(select 1 from public.calendar_events_in_range(s,'2026-10-07','2026-10-07') where id=e.id) then raise exception 'Timed exclusive overlap cutoff failed'; end if;
    perform set_config('calendar_test.event',e.id::text,true);
end $$;
select set_config('request.jwt.claim.sub',current_setting('calendar_test.outsider'),true);
do $$ declare s uuid := current_setting('calendar_test.space')::uuid; begin
    if exists(select 1 from public.calendar_events where space_id=s) or exists(select 1 from public.calendar_event_exceptions where space_id=s) or exists(select 1 from public.calendar_events_in_range(s,'2026-10-01','2026-10-31')) then raise exception 'Outsider can read'; end if;
    begin perform public.change_calendar_future(s,current_setting('calendar_test.event')::uuid,'2026-10-05',now(),null); raise exception 'Outsider split allowed'; exception when insufficient_privilege then null; end;
    begin insert into public.calendar_event_exceptions(event_id,space_id,original_date,is_cancelled) values(current_setting('calendar_test.event')::uuid,s,'2026-10-05',true); raise exception 'Outsider exception allowed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
select 'Calendar recurrence cutoff, split/truncate, exception preservation, constraints, RLS and rollback checks passed' as validation;
