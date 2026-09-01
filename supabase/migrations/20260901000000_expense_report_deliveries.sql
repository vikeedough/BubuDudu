create table public.expense_report_deliveries (
    id uuid primary key default gen_random_uuid(),
    space_id uuid not null references public.spaces(id),
    report_type text not null
        constraint expense_report_deliveries_report_type_check
        check (report_type in ('weekly', 'monthly')),
    period_start date not null,
    period_end date not null,
    status text not null
        constraint expense_report_deliveries_status_check
        check (status in ('sending', 'sent', 'failed')),
    attempt_count integer not null default 1
        constraint expense_report_deliveries_attempt_count_check
        check (attempt_count > 0),
    telegram_message_id bigint,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    last_attempt_at timestamptz not null default now(),
    sent_at timestamptz,
    error text,
    constraint expense_report_deliveries_period_check
        check (period_end > period_start),
    constraint expense_report_deliveries_period_key
        unique (space_id, report_type, period_start, period_end)
);

alter table public.expense_report_deliveries enable row level security;

revoke all on table public.expense_report_deliveries from anon, authenticated;

comment on table public.expense_report_deliveries is
    'Idempotency and delivery status ledger for automated Telegram expense reports.';
comment on column public.expense_report_deliveries.period_end is
    'Exclusive Singapore calendar-date end of the report period.';
