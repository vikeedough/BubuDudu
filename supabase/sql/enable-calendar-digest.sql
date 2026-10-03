-- Run after deploying calendar-digest and setting TELEGRAM_CALENDAR_THREAD_ID.
-- Reuses Finance Vault entries; never creates/replaces operator secrets.
do $$ begin
    if (select count(*) from vault.secrets where name in ('expense_report_project_url','expense_report_publishable_key','expense_report_cron_secret')) <> 3 then
        raise exception 'Configure the three existing Finance Vault entries first';
    end if;
    if not exists (select 1 from cron.job where jobname='bubududu-daily-calendar-digest') then
        raise exception 'Apply the Calendar cron migration first';
    end if;
end $$;
select cron.alter_job(jobid, active := true) from cron.job where jobname='bubududu-daily-calendar-digest';
