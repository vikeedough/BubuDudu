-- Non-destructive integration checks against the existing application baseline.
-- Execute with supabase db query --linked --file supabase/tests/calendar.sql.
begin;
select set_config('calendar_test.space', gen_random_uuid()::text, true);
select set_config('calendar_test.event', gen_random_uuid()::text, true);
select set_config('calendar_test.creator', (select id::text from auth.users order by id limit 1), true);
select set_config('calendar_test.partner', (select id::text from auth.users order by id offset 1 limit 1), true);
select set_config('calendar_test.outsider', (select id::text from auth.users order by id offset 2 limit 1), true);
do $$ begin
    if current_setting('calendar_test.outsider',true) is null then raise exception 'Requires three existing Auth users; no accounts are created'; end if;
end $$;
insert into public.spaces(id,name,created_by) values(current_setting('calendar_test.space')::uuid,'Calendar rollback-only validation',current_setting('calendar_test.creator')::uuid);
insert into public.space_members(space_id,user_id) values
    (current_setting('calendar_test.space')::uuid,current_setting('calendar_test.creator')::uuid),
    (current_setting('calendar_test.space')::uuid,current_setting('calendar_test.partner')::uuid);
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('calendar_test.creator'),true);
insert into public.calendar_events(id,space_id,title,is_all_day,start_date,end_date,recurrence_rule)
values(current_setting('calendar_test.event')::uuid,current_setting('calendar_test.space')::uuid,'Original',true,'2026-10-03','2026-10-03','FREQ=WEEKLY');
do $$ declare s uuid := current_setting('calendar_test.space')::uuid; begin
    begin insert into public.calendar_events(space_id,title,is_all_day,start_date,end_date) values(s,' ',true,'2026-10-03','2026-10-03'); raise exception 'Empty title accepted'; exception when check_violation then null; end;
    begin insert into public.calendar_events(space_id,title,starts_at,ends_at) values(s,'Missing end','2026-10-03 01:00Z',null); raise exception 'Missing timed end accepted'; exception when check_violation then null; end;
    begin insert into public.calendar_events(space_id,title,starts_at,ends_at) values(s,'Reverse time','2026-10-03 02:00Z','2026-10-03 01:00Z'); raise exception 'Reverse time accepted'; exception when check_violation then null; end;
    begin insert into public.calendar_events(space_id,title,is_all_day,start_date,end_date) values(s,'Reverse dates',true,'2026-10-04','2026-10-03'); raise exception 'Reverse dates accepted'; exception when check_violation then null; end;
    begin insert into public.calendar_events(space_id,title,is_all_day,start_date,end_date,starts_at) values(s,'Mixed',true,'2026-10-03','2026-10-03',now()); raise exception 'Mixed dates accepted'; exception when check_violation then null; end;
    begin insert into public.calendar_events(space_id,title,is_all_day,start_date,end_date,reminder_days_before) values(s,'Negative',true,'2026-10-03','2026-10-03',-1); raise exception 'Negative reminder accepted'; exception when check_violation then null; end;
    begin insert into public.calendar_events(space_id,title,is_all_day,start_date,end_date,colour) values(s,'Hex colour',true,'2026-10-03','2026-10-03','#FFFFFF'); raise exception 'Arbitrary colour accepted'; exception when check_violation then null; end;
    begin insert into public.calendar_events(space_id,title,is_all_day,start_date,end_date,recurrence_rule) values(s,'Unsupported rule',true,'2026-10-03','2026-10-03','FREQ=HOURLY'); raise exception 'Unsupported recurrence accepted'; exception when check_violation then null; end;
    insert into public.calendar_events(space_id,title,starts_at,ends_at) values(s,'Valid timed','2026-10-03 01:00Z','2026-10-03 02:00Z');
end $$;
select set_config('request.jwt.claim.sub',current_setting('calendar_test.partner'),true);
update public.calendar_events set title='Partner edit' where id=current_setting('calendar_test.event')::uuid;
insert into public.calendar_event_exceptions(event_id,space_id,original_date,title,is_all_day,start_date,end_date,colour,timezone,reminder_days_before)
values(current_setting('calendar_test.event')::uuid,current_setting('calendar_test.space')::uuid,'2026-10-03','Moved occurrence',true,'2026-11-05','2026-11-05','green','Asia/Singapore',null);
do $$ declare s uuid := current_setting('calendar_test.space')::uuid; begin
    if (select title from public.calendar_events where id=current_setting('calendar_test.event')::uuid) <> 'Partner edit' then raise exception 'Partner edit denied'; end if;
    if (select count(*) from public.calendar_exceptions_in_range(s,'2026-11-01','2026-11-30')) <> 1 then raise exception 'Moved-in exception missing'; end if;
    if (select count(*) from public.calendar_exceptions_in_range(s,'2026-10-01','2026-10-31')) <> 1 then raise exception 'Moved-out exception missing'; end if;
    begin update public.calendar_events set created_by=current_setting('calendar_test.partner')::uuid where id=current_setting('calendar_test.event')::uuid; raise exception 'Immutable creator changed'; exception when raise_exception then if sqlerrm = 'Immutable creator changed' then raise; end if; end;
    begin select count(*) from public.lists; raise exception 'Lists readable'; exception when insufficient_privilege then null; end;
    begin select count(*) from public.calendar_digest_deliveries; raise exception 'Ledger readable'; exception when insufficient_privilege then null; end;
    begin perform public.claim_calendar_digest(s,'2026-10-03','test','[]'); raise exception 'Claim RPC available'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub',current_setting('calendar_test.outsider'),true);
do $$ declare s uuid := current_setting('calendar_test.space')::uuid; changed integer; begin
    if exists(select 1 from public.calendar_events where space_id=s) then raise exception 'Outsider can read events'; end if;
    if exists(select 1 from public.calendar_event_exceptions where space_id=s) then raise exception 'Outsider can read exceptions'; end if;
    if exists(select 1 from public.calendar_events_in_range(s,'2026-10-01','2026-10-31')) then raise exception 'RPC bypasses RLS'; end if;
    begin insert into public.calendar_events(space_id,title,is_all_day,start_date,end_date) values(s,'Intrusion',true,'2026-10-03','2026-10-03'); raise exception 'Outsider inserted event'; exception when insufficient_privilege then null; end;
    begin insert into public.calendar_event_exceptions(event_id,space_id,original_date,is_cancelled) values(current_setting('calendar_test.event')::uuid,s,'2026-10-10',true); raise exception 'Outsider inserted exception'; exception when insufficient_privilege then null; end;
    update public.calendar_events set title='Intrusion' where space_id=s; get diagnostics changed = row_count;
    if changed <> 0 then raise exception 'Outsider updated event'; end if;
    update public.calendar_event_exceptions set is_cancelled=true where space_id=s; get diagnostics changed = row_count;
    if changed <> 0 then raise exception 'Outsider updated exception'; end if;
end $$;
select set_config('request.jwt.claim.sub',current_setting('calendar_test.partner'),true);
update public.calendar_event_exceptions set is_cancelled=true where event_id=current_setting('calendar_test.event')::uuid;
update public.calendar_events set deleted_at=now() where id=current_setting('calendar_test.event')::uuid;
do $$ begin
    if not exists(select 1 from public.calendar_events where id=current_setting('calendar_test.event')::uuid and deleted_at is not null) then raise exception 'Soft deletion removed row'; end if;
    if exists(select 1 from public.calendar_events_in_range(current_setting('calendar_test.space')::uuid,'2026-10-01','2026-10-31') where id=current_setting('calendar_test.event')::uuid) then raise exception 'Soft deleted event still in range'; end if;
    begin delete from public.calendar_events where id=current_setting('calendar_test.event')::uuid; raise exception 'Hard deletion allowed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role service_role;
do $$ declare first_id uuid; second_id uuid; s uuid := current_setting('calendar_test.space')::uuid; manifest jsonb := jsonb_build_array(jsonb_build_object('event_id',current_setting('calendar_test.event'),'original_date','2026-10-03')); begin
    first_id := public.claim_calendar_digest(s,'2026-10-03','Test',manifest);
    if first_id is null then raise exception 'Initial claim failed'; end if;
    second_id := public.claim_calendar_digest(s,'2026-10-03','Test',manifest);
    if second_id is not null then raise exception 'Duplicate sending claim'; end if;
    if (select count(*) from public.calendar_reminder_deliveries where digest_id=first_id) <> 1 then raise exception 'Manifest not persisted'; end if;
    update public.calendar_digest_deliveries set status='failed' where id=first_id;
    second_id := public.claim_calendar_digest(s,'2026-10-03','Retry',manifest);
    if second_id <> first_id then raise exception 'Retry claim mismatch'; end if;
    update public.calendar_digest_deliveries set status='sent',telegram_message_id=123 where id=first_id;
    if public.claim_calendar_digest(s,'2026-10-03','Duplicate',manifest) is not null then raise exception 'Sent digest reclaimed'; end if;
    begin select count(*) from public.lists; raise exception 'Service can access Lists'; exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
select 'Calendar constraints, member/outsider RLS, exceptions, soft deletes, Lists retirement, and delivery claims passed; all fixtures rolled back' as validation;
