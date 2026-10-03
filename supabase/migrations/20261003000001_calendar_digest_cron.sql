-- Same extensions, Vault values, and authentication header as Finance.
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
select cron.schedule(
    'bubududu-daily-calendar-digest',
    '0 21 * * *', -- 05:00 Asia/Singapore (UTC+8), every day
    $job$
    select net.http_post(
        url := (select decrypted_secret from vault.decrypted_secrets where name='expense_report_project_url') || '/functions/v1/calendar-digest',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'apikey', (select decrypted_secret from vault.decrypted_secrets where name='expense_report_publishable_key'),
            'x-expense-report-secret', (select decrypted_secret from vault.decrypted_secrets where name='expense_report_cron_secret')
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 10000
    );
    $job$
);
-- Operator enables after setting the Calendar topic ID and deploying the function.
select cron.alter_job(jobid, active := false) from cron.job where jobname='bubududu-daily-calendar-digest';
