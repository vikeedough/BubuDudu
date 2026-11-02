-- Explicit rollout only, AFTER the additive migration and authenticated endpoint are verified.
-- Provision Vault separately; never paste live keys into this file.
begin;
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
do $$
begin
    if coalesce(nullif(current_setting('cron.timezone',true),''),'GMT') not in ('GMT','UTC','Etc/UTC') then
        raise exception 'Gallery schedule requires UTC Cron timezone; do not change unrelated jobs';
    end if;
    if (select count(*) from vault.decrypted_secrets where name='gallery_cleanup_project_url'
        and decrypted_secret='https://hcrezrypvkmtzxldvsvm.supabase.co') <> 1
        or (select count(*) from vault.decrypted_secrets where name='gallery_cleanup_secret_key'
            and decrypted_secret like 'sb_secret_%') <> 1 then
        raise exception 'Configure gallery cleanup Vault secrets before scheduling';
    end if;
    if (select count(*) from cron.job where jobname='bubududu-gallery-daily-cleanup') > 1 then
        raise exception 'Duplicate gallery jobs require operator review';
    end if;
    if exists(select 1 from cron.job where jobname='bubududu-gallery-daily-cleanup' and username<>current_user) then
        raise exception 'Gallery job owner differs; run setup as its original postgres owner';
    end if;
end $$;

create or replace function public.gallery_daily_cleanup_dispatch() returns bigint
language plpgsql security definer set search_path = public as $$
declare project_url text; secret_key text; request_id bigint;
begin
    select decrypted_secret into strict project_url from vault.decrypted_secrets where name='gallery_cleanup_project_url';
    select decrypted_secret into strict secret_key from vault.decrypted_secrets where name='gallery_cleanup_secret_key';
    if project_url<>'https://hcrezrypvkmtzxldvsvm.supabase.co' or secret_key not like 'sb_secret_%' then
        raise exception 'Invalid gallery cleanup scheduler configuration';
    end if;
    select net.http_post(url:=project_url||'/functions/v1/gallery-daily-cleanup',
        headers:=jsonb_build_object('Content-Type','application/json','apikey',secret_key),
        body:='{}'::jsonb,timeout_milliseconds:=90000) into request_id;
    raise log 'Gallery daily cleanup HTTP request_id=%',request_id;
    return request_id;
end $$;
revoke all on function public.gallery_daily_cleanup_dispatch() from public,anon,authenticated,service_role;

-- pg_cron updates a named job in place for its owner (run setup consistently as postgres).
select cron.schedule('bubududu-gallery-daily-cleanup','0 19 * * *',
    'select public.gallery_daily_cleanup_dispatch();');
commit;
