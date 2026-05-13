# Expense Tracker

The expense tracker is an offline-first tab for logging shared-space expenses. It tracks expenses and monthly spending budgets only: no income, transfers, splitting, or settlement flows.

## Product Behavior

- The tab appears third in the bottom tab bar, between Gallery and Lists.
- Expenses can be viewed for both partners together or filtered to expenses paid by the current user from the header scope control. The scope control shows Me on the left and Both on the right, with each option colored from the current user or partner avatar border color.
- The main view switcher supports Log, Breakdown, and Budget.
- Each expense has an amount, currency, title, category, and paid date.
- Each expense stores the creator and the payer. The payer can be the current user or partner.
- The partner payer option is disabled until a partner profile exists in the active space.
- The payer selector sits at the bottom of the expense form so the entry starts with expense details first. Payer buttons use each person's avatar border color, and the partner option shows the partner's profile name when available.
- The add expense action is a bottom-right floating button and always opens the expense form; category loading or empty states are handled inside the category section of that form.
- The log opens to the day view by default. When adding an expense from a selected log day, the expense form's date picker starts on that selected day.
- The expense form date picker uses a single day wheel. The current day is labeled Today, with neighboring rows shown as full dates.
- The expense form category field is a dropdown beside the Category label, with Manage Categories at the bottom of the dropdown.
- Expense titles suggest up to three previous titles created by the current user once at least two characters are typed. Prefix matches appear before contains matches.
- Default currency is SGD.
- The expense form keeps currency beside amount, with currency choices shown in a single scrollable overlay dropdown list.
- Foreign-currency expenses store both the original amount and a converted SGD snapshot.
- If the app is offline and no cached exchange rate exists, the expense is saved with pending conversion and retried when online.
- Categories start with Food, Health, Medical, Bills, and Transport.
- Users can add, rename, and delete categories. Category deletes are soft deletes; historical expenses keep their category label and color snapshot.
- The log can switch between day, week, and month views and move to previous/next periods, using consistent spacing across the log/breakdown, period, and date controls. The current day is labeled as Today.
- The log Day/Week/Month selector uses the same yellow selected state as the Breakdown period selector.
- Expense breakdown can switch between daily, weekly, monthly, and yearly periods and move to previous/next periods. Weeks start on Monday.
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
  Add, rename, recolor, and delete categories.
- `components/expenses/ExpenseRow.tsx`
  Expense log row inspired by the provided sample layout. Shows the partner's profile name for partner-paid expenses when available.
- `components/expenses/ExpenseBreakdownView.tsx`
  Period controls, metrics, pie chart, and category legend.
- `components/expenses/ExpenseBudgetView.tsx`
  Monthly budget summary and category progress rows.
- `components/expenses/BudgetModal.tsx`
  Add/edit/delete monthly category budgets.
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
