# Expense Tracker

The expense tracker is an offline-first tab for logging shared-space expenses. It tracks expenses and monthly spending budgets only: no income, transfers, splitting, or settlement flows.

## Product Behavior

- The tab appears third in the bottom tab bar, between Gallery and Lists.
- Expenses can be viewed for both partners together or filtered to expenses paid by the current user from the header scope control. The scope control shows Me on the left and Both on the right, with each option colored from the current user or partner avatar border color.
- Controls appear in this order: period navigator, Day/Week/Month selector, Log/Breakdown switcher, then content. Breakdown retains its Year option and its own selected period/date.
- The main view switcher supports Log and Breakdown. Budget opens in a modal from the floating action menu, above Categories and Add expense.
- Each expense has an amount, currency, title, category, paid date, and keyed-in creation timestamp.
- Each expense stores the creator and the payer. The payer can be the current user or partner.
- The partner payer option is disabled until a partner profile exists in the active space.
- The payer selector sits at the bottom of the expense form so the entry starts with expense details first. Payer buttons use each person's avatar border color, and the partner option shows the partner's profile name when available.
- Add expense, category management, and Budget live in the existing bottom-right expandable floating action menu. Budget keeps its month navigation, Me/Both scope, progress rows, automatic previous-month copying, refresh, and add/edit/delete actions inside one modal. Its editor replaces the summary within that modal; Save, Delete, and Cancel return to the summary.
- The expense form starts with Amount (currency beside it), then Title and the existing remaining fields. A calculator button expands a keypad inline; manual amount entry remains available, and closing/reopening the expense resets the keypad.
- Calculator keys support digits, decimal, addition, subtraction, multiplication, division, equals, clear, and backspace. The visible expression is evaluated with multiplication/division precedence, without `eval`. Equals writes only the positive finite numeric result into Amount, using the existing four-decimal money precision and at least two displayed decimals. Empty/incomplete expressions, divide-by-zero, zero/negative results, and overflow leave Amount unchanged and show an inline error. Repeated operators replace the last operator, duplicate decimals are ignored, and empty backspace is safe. Expression/visibility state is never persisted.
- The log opens to the day view by default. When adding an expense from a selected log day, the expense form's date picker starts on that selected day.
- The expense form date picker is date-only, labels the current day as Today, and stores the selected local day in `paid_at`.
- The expense form pauses the surrounding modal scroll while a date wheel is active so iOS can settle wheel selections reliably.
- Expenses sort newest first by paid date, then by creation timestamp so same-day entries show in the order they were keyed in.
- The expense form category field is a dropdown beside the Category label.
- Category management opens from the floating action menu, outside the add-expense modal, to avoid nested modal/dropdown issues on iOS.
- Expense titles suggest up to three previous titles created by the current user once at least two characters are typed. Prefix matches appear before contains matches.
- Default currency is SGD.
- The expense form keeps currency beside amount, with currency choices shown in a single scrollable overlay dropdown list.
- Foreign-currency expenses store both the original amount and a converted SGD snapshot.
- If the app is offline and no cached exchange rate exists, the expense is saved with pending conversion and retried when online.
- Categories start with Food, Health, Medical, Bills, and Transport.
- Categories opens a clean list of icon/colour/name rows sorted case-insensitively by name for display only. Persisted `sort_order` is unchanged. A fixed Add Category button sits below the list; tapping it or a category row opens the shared Add/Edit Category editor. Name, colour, and icon controls appear only in the editor, with Delete Category available only when editing.
- The category editor and list share one native modal host. The list stays mounted with its scroll position and is hidden/inaccessible while editing. Android back, backdrop, and Cancel dismiss the editor first; Done or back from the list closes Categories. Selection stores the category ID and reads current category props; external removal closes a stale editor. Successful save/delete returns to the updated alphabetical list. Save failures show the existing Category failed alert and keep the draft; controls/dismissal are disabled during a write. Category deletes retain the existing destructive confirmation and soft-delete behavior; historical expenses keep their category label and color snapshot.
- The category editor uses keyboard avoidance on iOS and Android with one scrolling surface for fields and the icon grid, so no nested scroll gesture competes with the form. Footer actions stay outside the scroll content.
- The curated MaterialCommunityIcons catalogue contains 112 unique entries covering common spending, family, health, work, travel, hobbies, and finance categories. Each entry has a stable icon key, friendly label, and search keywords. Search is case-insensitive, requires every entered term, prefers complete words, and allows prefixes while typing (for example, `cof`). Tags make searches such as food, plane, game, health, and money useful; `car` avoids unrelated card/care results. The selected tile has a check and colour-aware background/foreground, with a live colour preview independent of icon selection. All existing icon keys and fallbacks remain supported.
- Category icons use stable MaterialCommunityIcons keys from Expo's existing `@expo/vector-icons` package; no extra dependency is required. Expense rows use the active category icon in a category-coloured container with a contrast-aware foreground. Deleted categories use their stored label/colour and a name-based default icon. The Breakdown pie chart continues using category colours.
- The log can switch between day, week, and month views and move to previous/next periods, using consistent spacing across the log/breakdown, period, and date controls. The current day is labeled as Today.
- The log Day/Week/Month selector uses the same yellow selected state as the Breakdown period selector.
- Expense breakdown can switch between daily, weekly, monthly, and yearly periods and move to previous/next periods. Weeks start on Monday.
- Pressing a Breakdown category opens a modal with all expenses in that category for the selected period and Me/Both scope, sorted newest first.
- Budgets are monthly and SGD-only. Shared budgets live under Both, while personal budgets live under Me and are scoped to the current user.
- Budget rows show only categories with budgets, plus spent amount, budget amount, remaining/over amount, percentage used, and a visual progress bar.
- When a month has no budgets for the selected scope, the app automatically copies the previous month's budgets for that same scope.

## App Files

- `app/(tabs)/(expenses)/expenses.tsx`
  Main tab screen with log and breakdown views.
- `components/expenses/ExpenseModal.tsx`
  Add/edit/detail modal for expense amount, currency, title, category, paid date, and payer.
- `components/expenses/ExpenseDatePicker.tsx`
  Expense-only day wheel that labels the current day as Today.
- `components/expenses/CategoryManagerModal.tsx`
  Alphabetical category list and single native modal host.
- `components/expenses/CategoryEditorModal.tsx`
  Shared add/edit dialog with name, colour, searchable icons, and confirmed deletion.
- `components/expenses/ExpenseRow.tsx`
  Expense log row inspired by the provided sample layout. Shows the partner's profile name for partner-paid expenses when available.
- `components/expenses/ExpenseBreakdownView.tsx`
  Period controls, metrics, pie chart, and category legend.
- `components/expenses/ExpenseBudgetView.tsx`
  Monthly budget summary and category progress rows.
- `components/expenses/BudgetModal.tsx`
  Budget summary and add/edit/delete monthly category budgets in the same native modal.
- `components/expenses/ExpenseAmountCalculator.tsx` and `utils/expense-calculator.ts`
  Inline keypad and safe precedence-based arithmetic evaluation.
- `components/expenses/CategoryIconPicker.tsx` and `utils/expense-category-icons.ts`
  Inline icon grid, stable supported keys, and deterministic defaults.
- `stores/ExpenseStore.ts`
  Offline-first state, CRUD actions, category seeding, exchange-rate conversion, and pending conversion retry.
- `utils/expenses.ts`
  Currency constants, default categories, period math, formatting, and analytics helpers.

## Offline Model

The feature follows the same pattern as Lists and Wheel:

1. Read cached SQLite rows first.
2. If offline, show cached data and queue writes.
3. If online, flush outbox writes, fetch Supabase rows, replace cache, and refresh Zustand.

Local tables:

- `expense_categories_cache`
- `expenses_cache`
- `expense_exchange_rates_cache`
- `expense_budgets_cache`

Outbox entities:

- `expense_categories`
- `expenses`
- `expense_budgets`

Expense and category deletes are soft deletes using `deleted_at`.

Category icons are included in SQLite cache rows and insert/update outbox payloads. SQLite schema version 5 adds a nullable `icon TEXT` column to existing installations without discarding cached rows or queued operations; the version advances only after upgrades succeed.

## Category Icon Deployment

Apply `supabase/migrations/20261005000001_expense_category_icons.sql` to the existing backend **before releasing this client**. It adds nullable `public.expense_categories.icon TEXT`; existing RLS, user/space scoping, triggers, and colours are unchanged. There are no tracked generated Supabase types; the local `ExpenseCategory` interface accepts missing/null values for older rows and clients.

No SQL backfill is required. The client resolves missing, null, unsupported, or legacy keys by trimmed case-insensitive category name: Food/Dining, Transport, Shopping, Groceries, Bills/Utilities, Entertainment, Travel, Health/Medical, Education, Gifts, Housing/Rent, and Salary/Income have matching defaults. Unknown categories use `tag-outline`. New/default categories and category edits persist the selected valid key. Old clients can still omit `icon`; clients deployed before the migration cannot persist the new field. Icon choices are restricted to the installed library's supported picker keys, and invalid values never reach the renderer.

Focused validation:

```sh
npm test -- --runInBand tests/stores/ExpenseStore.test.ts tests/integration/calendar.expenses-ui.test.tsx tests/integration/expenses-ui.test.tsx tests/integration/expense-categories-ui.test.tsx tests/utils/expense-calculator.test.ts tests/utils/expense-category-icons.test.ts
```

## Currency Conversion

The app uses `https://api.frankfurter.dev/v2/rate/{currency}/SGD` for online rates and caches successful rates locally.

Conversion fields:

- `amount` and `currency`: original user entry.
- `base_amount` and `base_currency`: SGD snapshot for analysis.
- `exchange_rate` and `exchange_rate_date`: conversion source data.
- `conversion_status`: `converted`, `pending`, or `failed`.

Analytics totals use only converted SGD amounts. Pending foreign-currency expenses remain visible in the log and are counted as conversion-pending in breakdown metrics.

## Backend Tables

The Supabase SQL adds:

- `public.expense_categories`
- `public.expenses`
- `public.expense_budgets`

These tables use member-scoped RLS through `public.is_member_of_space(space_id)`, `updated_at` triggers, `deleted_at` soft-delete columns, and indexes for space/time/sync queries.

Budget RLS allows space members to read and write shared budgets, while personal budgets can only be read and written by their `owner_user_id`.

## Automated Telegram Expense Reports

The server sends one weekly and one monthly finance report to the Finances forum topic in the configured Telegram group. Supabase Cron invokes the `expense-report` Edge Function; no React Native background task is involved. Weekly and monthly data use the same calculator and plain-text formatter.

Calendar now reuses this function's `telegram.ts` sender, bot/chat secrets, cron authentication and Vault values, with a separate `TELEGRAM_CALENDAR_THREAD_ID`. The sender's optional document fallback is enabled only by Calendar for oversized digests; Finance retains its existing plain-text behaviour and thread routing. See `docs/calendar.md`.

Report contents:

- Combined total and top five categories.
- Dudu and Bubu totals and top five categories.
- Five largest reportable expenses.
- Combined, Dudu, and Bubu comparison with the immediately previous period.
- Reportable transaction count, average per transaction, highest category, and highest-spending weekday.
- No debt, splitting, settlement, balance, repayment, or who-owes-whom calculation.

### Periods and Currency

All boundaries and weekday grouping explicitly use `Asia/Singapore`:

- Weekly reports cover the completed Monday 00:00 through the following Monday 00:00 half-open interval. The job runs Monday at 00:05 Singapore time (`5 16 * * 0` in UTC) and reports the week that just ended.
- Monthly reports cover the completed calendar month. The job runs on the last UTC calendar day at 16:10, which is the first Singapore calendar day at 00:10 (`10 16 $ * *` in `pg_cron`).

An expense is reportable in SGD when either:

1. `conversion_status = 'converted'` and `base_amount` is numeric, in which case `base_amount` is used; or
2. `currency = 'SGD'`, in which case `amount` is used.

Unconverted foreign-currency expenses and soft-deleted expenses are excluded from totals, category rankings, largest expenses, transaction count, and average per transaction. Money uses the app's four-decimal internal rounding helper and displays with two SGD decimal places. Ownership always uses `paid_by`; configured IDs are never inferred from creator or profile name.

Active categories are indexed by `category_id`. Their current name and data override the expense snapshot, matching app analytics after a rename. If there is no active category, the expense snapshot is used. Telegram symbols are defined only for the app's known default category names; custom and renamed categories use the safe fallback symbol.

### Edge Function Configuration

Required Edge Function secrets:

- `EXPENSE_REPORT_CRON_SECRET`
- `EXPENSE_REPORT_SPACE_ID`
- `DUDU_USER_ID`
- `BUBU_USER_ID`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `TELEGRAM_FINANCES_THREAD_ID`

Hosted Supabase also supplies `SUPABASE_URL` and `SUPABASE_SECRET_KEYS`. The function parses the `default` entry from `SUPABASE_SECRET_KEYS` for RLS-bypassing server access. `SUPABASE_SERVICE_ROLE_KEY` is accepted only as a compatibility fallback for environments without the new secret-key dictionary.

Set application secrets through the Dashboard or CLI without committing a secrets file. For example, from a locally ignored environment file:

```sh
supabase secrets set --env-file ./supabase/functions/.env --project-ref YOUR_PROJECT_REF
```

The endpoint accepts only authenticated `POST` requests with `x-expense-report-secret` and one of these bodies:

```json
{"mode":"weekly"}
```

```json
{"mode":"monthly"}
```

There is no `force` option. A manual request for an already-sent period is a successful no-op. Use the same request for a controlled manual test or to retry a row currently marked `failed`.

After applying the migration, deploying the function, and setting its secrets, invoke a mode manually with non-secret local substitutions:

```sh
curl --request POST 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/expense-report' \
  --header 'Content-Type: application/json' \
  --header 'apikey: YOUR_PUBLISHABLE_KEY' \
  --header 'x-expense-report-secret: YOUR_LONG_RANDOM_CRON_SECRET' \
  --data '{"mode":"weekly"}'
```

Use `{"mode":"monthly"}` for the monthly path. Confirm the JSON result, the Finances topic message, and the matching `expense_report_deliveries` row before enabling Cron.

### Telegram IDs

Add the bot to the target forum-enabled group and grant it permission to post. Send a message in the Finances topic, then inspect the bot's `getUpdates` response:

- `message.chat.id` is `TELEGRAM_CHAT_ID` (group IDs are commonly negative).
- `message.message_thread_id` is `TELEGRAM_FINANCES_THREAD_ID`.

If the bot already uses a webhook, inspect the equivalent incoming webhook update instead of `getUpdates`. Do not put the token, IDs, or returned update payload into source control. The Edge Function sends plain text through Bot API `sendMessage` with `chat_id`, `message_thread_id`, and `text`, then saves the returned `message_id`.

### Delivery Ledger and Retries

`public.expense_report_deliveries` has one unique row per space, report type, and half-open period. A new invocation inserts `sending`. Existing states behave as follows:

- `sent`: return a successful no-op.
- `sending`: return a successful no-op so concurrent callers cannot send again.
- `failed`: one caller conditionally changes it to `sending`, increments `attempt_count`, clears the error, and retries. Concurrent reclaim attempts cannot both match `status = 'failed'`.

A definite Telegram rejection sets `failed`. A transport failure without a readable Telegram response is ambiguous, so the row stays `sending` and blocks automatic retries. Inspect the Telegram topic before manually changing such a row to `failed`. Telegram can accept a request while its HTTP response is lost, so strict mathematical exactly-once delivery cannot be guaranteed across that network boundary.

### Cron and Vault Setup

Cron definitions are intentionally environment-specific and are not in the migration. Enable `pg_cron` and `pg_net`, then create these Vault entries in the target project:

- `expense_report_project_url`: the project base URL, without a trailing slash.
- `expense_report_publishable_key`: a project publishable key used only for the scheduled gateway request's `apikey` header.
- `expense_report_cron_secret`: the exact value also configured as `EXPENSE_REPORT_CRON_SECRET`.

Create Vault values in the SQL editor using local values in place of the examples:

```sql
select vault.create_secret('YOUR_PROJECT_URL', 'expense_report_project_url');
select vault.create_secret('YOUR_PUBLISHABLE_KEY', 'expense_report_publishable_key');
select vault.create_secret('YOUR_LONG_RANDOM_CRON_SECRET', 'expense_report_cron_secret');
```

After the Vault entries exist, create the jobs:

```sql
select cron.schedule(
    'bubududu-weekly-expense-report',
    '5 16 * * 0',
    $weekly$
    select net.http_post(
        url := (select decrypted_secret from vault.decrypted_secrets where name = 'expense_report_project_url') || '/functions/v1/expense-report',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'expense_report_publishable_key'),
            'x-expense-report-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'expense_report_cron_secret')
        ),
        body := '{"mode":"weekly"}'::jsonb,
        timeout_milliseconds := 10000
    ) as request_id;
    $weekly$
);

select cron.schedule(
    'bubududu-monthly-expense-report',
    '10 16 $ * *',
    $monthly$
    select net.http_post(
        url := (select decrypted_secret from vault.decrypted_secrets where name = 'expense_report_project_url') || '/functions/v1/expense-report',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'expense_report_publishable_key'),
            'x-expense-report-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'expense_report_cron_secret')
        ),
        body := '{"mode":"monthly"}'::jsonb,
        timeout_milliseconds := 10000
    ) as request_id;
    $monthly$
);
```

Monitor `cron.job_run_details`, `net._http_response`, Edge Function logs, and `expense_report_deliveries` after the first manual and scheduled runs.
