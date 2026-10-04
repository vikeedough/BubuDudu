# Shared Calendar

Calendar replaces Lists in the fourth tab. Implementation and deployment details are maintained here as part of the feature.

## Investigated baseline

The linked project's `space_members(space_id, user_id)` has no status/deleted column: row existence is active membership. `public.is_member_of_space(uuid)` implements this check. Profiles reference Auth users. Existing base tables predate repository migrations; the only recorded migration before Calendar is `20260901000000_expense_report_deliveries.sql`. Calendar migrations require this existing baseline and never recreate or drop it.

The deployed Finance function is `expense-report`. Its `telegram.ts` sends plain text using `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, and a forum `message_thread_id`. Weekly/monthly jobs use pg_cron, pg_net, and Vault entries `expense_report_project_url`, `expense_report_publishable_key`, `expense_report_cron_secret`. Calendar reuses that infrastructure and Singapore time. No existing app Postgres realtime subscriber or publication tables were found.

Calendar colours are semantic keys into `constants/colors.ts`, not user-entered hex values. Forms follow `docs/ui-styling.md`.

## Architecture and UI

- `app/(tabs)/(calendar)/calendar.tsx`: fourth tab, month navigation, a 42-day grid, selected-day agenda, event detail, and edit/delete scope selection.
- `components/calendar/`: month grid, Singapore-today header and compact event editor using CustomText, the existing Expenses date wheel, shared time wheels, CenteredModal and ModalActionButtons, colour tokens, radii, and shadows.
- `api/endpoints/calendar.ts`: paginated Supabase queries and writes. `stores/CalendarStore.ts`: Zustand session window cache, loading/errors, stale-request protection, and mutations.
- `hooks/useCalendarRealtime.ts`: space-filtered subscriptions on both Calendar tables. Refresh on subscription/reconnection, app foreground, network recovery, and pull-to-refresh. Auth cleanup clears the store and removes subscriptions.
- `supabase/functions/_shared/calendar.ts`: dependency-free types, validation, Singapore date arithmetic, RRULE expansion and digest selection, shared by Expo and Deno. `types/calendar.ts` and `utils/calendar.ts` expose it to the app.

`CalendarEvent` is the persisted master. `CalendarOccurrence` is derived for a date range after exceptions. A day may show multiple occurrences of a long recurring event; these are distinct logical occurrences, not duplicate rows. All-day end dates are inclusive; timed ends are exclusive. Timed events always need an end later than the start.

Calendar V1 uses `Asia/Singapore` throughout (including when the device is abroad). Timezone is stored and constrained. It is online-writeable; there is no Calendar outbox or persistent offline cache. Existing features' offline behaviour is unchanged. Failed writes keep the editor open. Valid cached windows can be revisited offline without a request. Uncached/stale windows need a connection; failed refreshes retain cached content and show an explicit connection message.

The Calendar header follows Expenses spacing/type and shows today's Singapore date as `Sunday, 4th October 2026`, independent of the selected day; it updates at Singapore midnight and on app foreground. The same shared `FloatingAddButton` drives Calendar's direct add action and Expenses' existing budget/menu controls. Empty days say `No events planned!`.

The white `CalendarEventDetails` modal groups the title, weekday/ordinal English date (or multi-day range), 24-hour times/All day, repeat/end metadata and advance reminder. It exposes Edit/Delete, with no colour, description or Close control. Backdrop and Android Back dismiss; the backdrop is a sibling behind the content so inside taps do not dismiss. Other `CenteredModal` callers keep their previous dismissal behaviour.

Month navigation uses a clipped, measured-width three-page pager: previous/current/next month all reuse the same 42-day grid renderer. Gesture Handler drives a Reanimated shared translation on the UI thread: `translateX = -width + dragX`. The grid follows a held finger continuously and remains at the dragged position when the finger pauses. No React state updates or data requests occur per pan frame. All pages retain weekday headings, palette dots, date styles and stable height; only the current page is interactive/accessibility-visible.

Horizontal intent activates after 5% of width (bounded to 12–24px); the same pre-activation vertical threshold lets normal screen scrolling win. Release commits at 28% of width, or a flick travelling at least 6% of width with same-direction velocity of two widths/second. Vertical-dominant/tiny/cancelled drags snap back without changing month/selection/agenda. Both commit and snap-back use a non-overshooting 220ms cubic-out timing animation. Arrows use the same transition; before initial width measurement they retain direct navigation.

Only a completed transition calls the canonical `changeMonth`, selecting the destination month's first day and updating the agenda through one month/selected-date state update. Neighbor previews already highlight their deterministic first-day selection, so the incoming page does not acquire its highlight after settling. Shared idle/drag/settle/await-reset phases block conflicting arrows, date taps and repeated pans. Transition tickets and source month/width checks reject duplicate or stale completion, including after external navigation/resize/unmount. Adjacent-month date-cell taps retain the existing month/selection update.

Pages use stable month keys in three fixed physical slots (absolute month number modulo three). Their visual previous/current/next positions are UI-thread translations, rather than React child reordering. At completion, the destination remains in its original physical slot and the track stays at its settled offset while React commits month/selection/agenda and replaces the offscreen neighbor. After that layout commit, one worklet changes the centered-slot value and clears the drag offset together. The destination's screen position and highlight remain identical before/after reset. Arrows use this same path; timing, thresholds, cancellation and cache behavior are unchanged.

`useCalendarMonthPages` prefetches the two neighboring 42-day windows through the existing paginated/RLS-protected API and shares `CalendarStore`'s cache with the active grid/agenda. Each entry is keyed by space ID plus exact from/to dates and stores masters, exceptions and expanded occurrences. Valid visited/prefetched windows render immediately, with no blocking loading state or repeated API request. Concurrent prefetch/navigation requests share one in-flight promise. Each query remains within the existing RPC limit; no whole-history query is introduced. Until an uncached preview arrives, known overlapping indicators are retained with the existing small loading indicator.

Successful create/edit/delete operations (including exception edits/cancellations and future splits) and existing realtime, subscription reconnect, foreground, network recovery and pull-to-refresh triggers increment a cache generation. Because recurring masters and moved exceptions can affect arbitrary windows, all snapshots are conservatively marked stale rather than discarded. Active/neighbor windows revalidate immediately; other visited windows revalidate when needed. Cached indicators/agenda remain visible during refresh, including failures; only a window without a snapshot enters initial loading. Auth/screen cleanup clears private cache data and prevents older in-flight responses from repopulating it. Pager animation, selected-date navigation and backend semantics are unchanged.

All Calendar dialog surfaces are white. The editor uses compact Start/End date-time rows, 24px palette swatches with 44px touch targets, and Expenses-style repeat/reminder dropdowns. Dropdown options render outside the form scroll area in the same native modal. Date/time/custom settings replace the editor surface while open; Cancel preserves the previous value, Confirm commits it. `ExpenseDatePicker` keeps its original defaults for Expenses and opts into compact widths and Singapore's Today label for Calendar. Its extracted `PickerWheel` also powers `WheelTimePicker` (00–23 hours, 00–59 minutes). `ModalActionButtons` has an opt-in Expenses-style Cancel/Save layout. The editor sizes naturally and retains scrolling only as a fallback for small screens/keyboards.

Descriptions are hidden throughout Calendar and saved as `null` on create/edit, without migrating existing rows. Reminder presets are None, 1 day before, 2 days before, 1 week before and Custom; custom values must be whole days from 1 to 2147483647. A legacy reminder of 0 displays as None and is saved as `null`. Backend reminder/description compatibility, recurrence, delivery and schema semantics are unchanged.

The range RPC accepts up to 93 days. The screen requests only its 42 visible days, overlapping non-recurring events, required recurring masters, and exceptions whose original occurrence or overridden range overlaps. Exceptions moved into/out of a window are included. Both RPCs are SECURITY INVOKER and retain RLS. Reads paginate in batches of 500, avoiding Supabase's default result cap.

## Schema and security

`20261003000000_shared_calendar.sql` adds:

| Table | Purpose and access |
| --- | --- |
| `calendar_events` | Space FK, immutable Auth `created_by`, title/description, semantic colour, timed or date-only fields, timezone, RRULE, one nullable reminder, timestamps and soft deletion. Members select/insert/update; no client hard deletes. |
| `calendar_event_exceptions` | Unique `(event_id, original_date)`, composite event/space FK, cancellation flag and explicit full override fields. Membership plus a live recurring parent is required for writes. |
| `calendar_digest_deliveries` | Unique `(space_id, digest_date)`, durable claim/status, complete message, attempt count, Telegram message ID, error and timestamps. Server only. |
| `calendar_reminder_deliveries` | Unique `(digest_id, event_id, original_date)` occurrence manifest. Server only. An occurrence is delivered only when its parent digest is `sent`. |

Calendar editing is never restricted to `created_by`. The creator is verified on insert and immutable thereafter. Soft-deleted master tombstones remain SELECT-visible to members for realtime invalidation; range queries exclude them. Exceptions of deleted masters never render/send. Nonmembers cannot read or mutate Calendar through tables or range RPCs. All client ledger grants are revoked and RLS is enabled.

The migration removes every existing Lists policy and revokes Lists grants from PUBLIC, anon, authenticated and service_role. No legitimate backend Lists dependency was found. The table, its triggers/indexes, and all rows remain. Database administrators retain restoration access. The two Calendar tables are added to the existing realtime publication; no other publication entries are changed.

## Recurrence and exceptions

Stored RRULE subset: `FREQ=DAILY|WEEKLY|MONTHLY|YEARLY` with optional `;INTERVAL=1..9999`. UI options are Never, Daily, Weekly, Every 2 weeks, Monthly, Yearly and Custom (interval plus days/weeks/months/years). No arbitrary rule text, weekday sets, COUNT or RRULE UNTIL. Invalid monthly/yearly dates are skipped (31st does not become the 28th; Feb 29 recurs only in leap years), following [RFC 5545](https://www.rfc-editor.org/rfc/rfc5545).

`calendar_events.recurrence_end_date DATE NULL` is an inclusive cutoff for **original logical occurrence starts** in Singapore. A weekly series starting 5 Oct and ending 19 Oct generates 5, 12 and 19 Oct, never 26 Oct. Null means Never ends; migration `20261005000000_calendar_series_scopes.sql` has no default/backfill, so existing null-end series remain indefinite. A non-null end requires recurrence and cannot precede the master start. Repeat Never saves both recurrence fields as null.

For a **new** event, enabling any repeat option defaults Ends to one calendar year after its current start; Feb 29 clamps to Feb 28 in the following year. The compact Ends control opens a white wheel-picker dialog with an explicit Never ends switch. Editing an existing series never silently adds an end. Specific dates before the start are rejected.

The shared Expo/Deno engine clamps generated original dates to this cutoff, and both bounded range RPCs use it to filter expired masters/invalid exceptions. The digest uses the same engine without changing reminder selection. A valid original occurrence can still have an edited date beyond the cutoff; its logical identity is preserved. Likewise, a final multi-day occurrence may finish beyond the cutoff. Neither case generates a new recurrence start after the end.

Occurrences are expanded on demand, with direct jumps to the requested range; no permanent occurrence rows are generated. The stable identity is `(event_id, original_date)` in Singapore, valid because the supported rules have at most one start per day. Moving an occurrence preserves that identity.

“This event” edit creates/upserts a full typed exception snapshot. Null description/reminder is an explicit override, so a reminder can be removed for one occurrence. “This event” deletion writes a cancelled exception. “All events” edits the master or sets its `deleted_at`. Existing overrides retain their explicit values after a series edit; exceptions whose original dates no longer match the new rule are ignored. Disabling recurrence ignores all exceptions. No exceptions or series history are physically deleted by app users.

Recurring Edit and Delete offer exactly **This event**, **This event and future events**, and **All events**. Nonrecurring Edit opens directly; Delete has a simple confirmation.

`change_calendar_future(space_id,event_id,original_date,expected_updated_at,draft)` performs a future change in one atomic, SECURITY INVOKER transaction under normal member RLS:

- Locks the live recurring master and checks membership, the selected original date and the caller's master version. Stale splits fail with a refresh message instead of producing a second branch.
- For edit, inserts a new master using the edited selected occurrence's fields, start, cadence and chosen end. The selected exception is absorbed into these values, not copied over to shadow the new master.
- Reassigns later overrides/cancellations only when their original dates are valid on both old and new cadence/end. Their row IDs, original dates, explicit fields and creation timestamps survive. Prior exceptions stay old. Incompatible or selected exceptions stay stored with the old series and are ignored when no longer generated; no history is hard-deleted.
- Ends the old master on selected original date minus one day. Future deletion uses the same RPC with a null draft and just truncates. First-occurrence edit soft-deletes/replaces the old master; first-occurrence deletion soft-deletes it.

The exception-write trigger locks/checks the live parent and rejects writes for dates no longer generated, serializing writes against future operations. All updates roll back together on validation/RLS errors. Concurrent edits can require refresh/retry (including a PostgreSQL deadlock rollback); no compensating multi-write client workflow is used. Recurrence metadata is never written to an exception snapshot, and single-occurrence date validation does not treat the inherited series cutoff as a limit on its moved date.

## Daily Telegram digest

At **05:00 Asia/Singapore**, the backend selects:

1. **Every event occurring today**, including ongoing multi-day events, even without a reminder.
2. **Every future event whose configured reminder is due today** (`occurrence_start_date - reminder_days_before = today`).

Exceptions are applied first, and only valid original occurrences up to the inclusive recurrence end can qualify. Cancelled and soft-deleted occurrences are excluded. Reminder `null` means no advance reminder; `0` means event day. The digest deduplicates by logical occurrence, so a same-day reminder never creates a second listing. It has Today and Coming up sections, date/time ordering, and all-day precedence for the same start date. Description data is retained in storage but hidden in the current UI; message lines contain each event's title/date/time.

If neither set has events, **no Telegram message is sent** and no claim is created. One daily run sends **at most one Calendar Telegram digest**. Once a day's digest succeeds, further invocations that day do not send again, even if events are added afterward. An advance reminder and the event-day listing are intentionally separate daily deliveries.

The function queries only the configured Finance space (never user IDs), excludes past non-recurring masters, and paginates events/exceptions. It uses the same bot, group and `sendTelegramMessage` helper from `supabase/functions/expense-report/telegram.ts`. Calendar opts into HTML formatting and the document fallback for oversized digests. Existing Finance callers, their default sendMessage behaviour, destination and schedules remain unchanged.

Calendar requests the shared sender's optional `parseMode: "HTML"`. The digest begins with a bold English ordinal date (for example, **3rd October 2026**), followed by bold **Today** and/or **Coming up** headings; empty sections are omitted. All-day labels and 12-hour Singapore time ranges (for example, *7:00 PM – 9:00 PM*) are italic. Coming up entries keep their bold ISO `YYYY-MM-DD` dates. Titles remain normal text, with `&`, `<`, and `>` escaped before insertion into HTML and line breaks/tabs flattened. The former `Calendar · YYYY-MM-DD` and `Singapore time` header lines are removed. Finance does not supply a parse mode and retains its exact plain-text payload/formatting.

## Idempotency and recovery

`claim_calendar_digest` commits the complete message and occurrence manifest atomically with the unique daily `sending` claim. Concurrent callers cannot both claim; a `sent` or `sending` claim is a no-op. A `failed` claim can be reclaimed by one caller, with an incremented attempt count and refreshed payload/manifest.

Nothing counts as delivered until Telegram succeeds and the parent ledger is `sent`. A definite Telegram rejection sets `failed`, leaving the day eligible for retry. A transport failure/unreadable response stays `sending` because Telegram may have accepted it. A successful Telegram send followed by a database write failure **also stays `sending`**; it cannot trivially resend automatically. This strengthens the existing Finance pattern without changing Finance.

For a stale `sending` claim, inspect the Calendar topic and compare the stored `message_text` before any recovery. If posted, reconcile that row to `sent` with its Telegram message ID and sent timestamp. If definitely not posted, change it to `failed` and invoke again on the same Singapore date. Never reset all claims or retry an ambiguous send automatically. Recovery is an operational ledger update, not a schema mutation.

Telegram has no idempotency key shared with Postgres, so mathematically exact-once delivery across the external network boundary is impossible. Safety here favours blocking ambiguous retries over duplicate group messages. A process crash after claiming but before sending also needs inspection. There is no date override/backfill or force-send endpoint in V1.

The shared sender conservatively checks the complete payload against its 4096-character limit, including Calendar's HTML markup. If the complete digest exceeds it, Calendar opts into the shared sender's `sendDocument` fallback: one Telegram message containing the complete UTF-8 `calendar-YYYY-MM-DD.txt` digest, with a short caption, in the same Calendar topic. The formatter generates a separate plain-text version directly from the same occurrences, so the document has readable dates/headings/time ranges and literal titles, without generated HTML tags or encoded entities. The caption contains the human-readable date and `Full daily digest attached`. No events are truncated or split into additional messages. It uses the same bot, transport/error handling and delivery claim. This follows [Telegram's sendDocument API](https://core.telegram.org/bots/api#senddocument). Finance does not opt in and retains its original over-limit validation.

## Secrets and destination

Reuse these existing Edge Function secrets **without replacing them**:

- `EXPENSE_REPORT_CRON_SECRET`: same `x-expense-report-secret` header.
- `EXPENSE_REPORT_SPACE_ID`: shared space whose Calendar goes to the existing group.
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`: same Finance bot/supergroup.
- Hosted `SUPABASE_URL`, `SUPABASE_SECRET_KEYS.default`, with existing `SUPABASE_SERVICE_ROLE_KEY` compatibility fallback.

The **only new operator value** is `TELEGRAM_CALENDAR_THREAD_ID`, a positive integer. Do not reuse/guess the Finance topic ID and do not duplicate the bot token.

To obtain it: create/open the **Calendar** forum topic in the same Bubu & Dudu supergroup. Send a bot command addressed to the existing bot inside that topic (so privacy mode allows delivery). Inspect that update's `message.message_thread_id` using the bot's existing incoming webhook logs, or Bot API `getUpdates` if the bot does not use a webhook. Do not disable an existing webhook or paste tokens/updates into source control. Confirm the update's chat is the existing configured group.

Set only that new secret via the Supabase Dashboard's Edge Function Secrets UI, or an ignored local file, for example `supabase/functions/.env.calendar.local` containing only `TELEGRAM_CALENDAR_THREAD_ID=<actual ID>`:

```sh
npx supabase secrets set --env-file supabase/functions/.env.calendar.local
```

The repository ignores `.env*.local` files. Keep bot credentials in their existing configuration.

## Deployment and schedule

Existing-project prerequisites: the base application schema documented above, existing Finance configuration, and a Supabase project link. This repository historically does not have a from-zero baseline migration; do not reset an empty project and assume these migrations recreate the full app.

```sh
npx supabase migration list
npx supabase db push --dry-run
npx supabase db push
npx supabase functions deploy calendar-digest
```

For the finite-series refinement, apply `20261005000000_calendar_series_scopes.sql` before releasing the updated app, and redeploy `calendar-digest` to include the updated shared recurrence engine. No new secrets, Finance changes or scheduler changes are required. Validate with `supabase/tests/calendar-series.sql`; its test space/events/exceptions use existing Auth users and are rolled back, without touching delivery ledgers.

`20261003000001_calendar_digest_cron.sql` creates the reproducible job `bubududu-daily-calendar-digest` at UTC `0 21 * * *` (05:00 Singapore). It uses pg_cron/pg_net and the existing Vault names `expense_report_project_url`, `expense_report_publishable_key`, `expense_report_cron_secret`. No new Vault credential or bot stack is needed; this follows [Supabase's scheduled Edge Function pattern](https://supabase.com/docs/guides/functions/schedule-functions).

The job is created **inactive**, because the Calendar topic is an operator-supplied destination. After deploying and setting the new topic secret, activate it with the checked-in script:

```sh
npx supabase db query --linked --file supabase/sql/enable-calendar-digest.sql
```

The endpoint accepts POST `{}` with the existing `x-expense-report-secret` and gateway `apikey`. Unknown request fields are rejected. For a manual run, use the existing Finance invocation tooling with endpoint `/functions/v1/calendar-digest` and `{}`; it uses the actual current Singapore date and can send a real group digest. No manual Telegram messages were sent during automated validation.

Monitor `cron.job_run_details`, `net._http_response`, Edge Function responses/logs, and both Calendar ledger tables. Failed scheduled attempts can be manually retried the same day; there is one scheduled invocation daily, no extra automatic retry schedule. Release the updated Expo app so users receive the replacement tab. Old installed app versions cannot access Lists after migration.

## Lists archival

`archive/lists/` retains both former route files, the store, delete modal, sync handler and historical store tests. Runtime code imports none of them. With the files outside `app/`, neither `/lists` nor `/(tabs)/(lists)/lists` exists in Expo Router. Calendar occupies the same tab position.

The shared SQLite Lists schema/cache helpers remain for preservation/restoration. Pending Lists outbox rows are preserved and excluded from sync queries and pending counts; they cannot block other feature sync. OfflineProvider no longer fetches Lists. Existing sign-out data-clearing behaviour remains unchanged. See `archive/lists/README.md`.

## Validation commands

```sh
npm test -- --runInBand tests/api/endpoints/calendar.test.ts tests/utils/calendar.test.ts tests/utils/calendar-retirement.test.ts tests/integration/calendar.ui.test.tsx tests/stores/CalendarStore.test.ts tests/hooks/useCalendarRealtime.test.ts tests/stores/ExpenseStore.test.ts tests/stores/WheelStore.test.ts
npx tsc --noEmit -p tsconfig.calendar.json
npm run lint
npx tsc --noEmit
npx expo export --platform android --output-dir dist/calendar-validation
npx supabase db query --linked --file supabase/tests/calendar.sql
```

The SQL test creates a temporary test space using three existing Auth users, sets transaction-local roles/claims, exercises RLS/constraints/claims, and rolls everything back. It never creates real accounts or sends Telegram messages. Before applying migrations, run the same test inside a transaction containing the migration SQL to validate against the actual baseline without persistent changes.

For the current finite-series UI/API/store/recurrence regression suite:

```sh
npm test -- --runInBand tests/integration/calendar.ui.test.tsx tests/integration/calendar.screen.test.tsx tests/integration/calendar.details.test.tsx tests/integration/calendar.swipe.test.tsx tests/integration/calendar.expenses-ui.test.tsx tests/stores/CalendarStore.test.ts tests/hooks/useCalendarRealtime.test.ts tests/stores/ExpenseStore.test.ts tests/api/endpoints/calendar.test.ts tests/utils/calendar.test.ts
npx tsc --noEmit -p tsconfig.calendar.json
npx eslint 'app/(tabs)/(calendar)/calendar.tsx' components/calendar components/common/CenteredModal.tsx api/endpoints/calendar.ts stores/CalendarStore.ts types/calendar.ts utils/calendar.ts tests/integration/calendar*.test.tsx tests/api/endpoints/calendar.test.ts tests/utils/calendar.test.ts tests/stores/CalendarStore.test.ts
npx supabase db query --linked --file supabase/tests/calendar-series.sql
git diff --check
```

Deno checks (using the repository's existing Docker Deno workflow):

```sh
docker run --rm -v "${PWD}:/workspace" -w /workspace denoland/deno:2.5.6 deno test supabase/functions/calendar-digest/digest.test.ts supabase/functions/expense-report/report.test.ts
docker run --rm -v "${PWD}:/workspace" -w /workspace denoland/deno:2.5.6 deno check --config supabase/functions/calendar-digest/deno.json supabase/functions/calendar-digest/index.ts
docker run --rm -v "${PWD}:/workspace" -w /workspace denoland/deno:2.5.6 deno lint --config supabase/functions/calendar-digest/deno.json supabase/functions/calendar-digest supabase/functions/_shared/calendar.ts
```

## Deployment and validation record (2026-10-03)

- Applied both Calendar migrations to the linked project and verified local/remote migration history matches.
- Deployed `calendar-digest`; unauthenticated POST returns 401. The daily cron exists at `0 21 * * *` and remains inactive pending the Calendar topic ID. No operator secrets were changed and no real Telegram test message was sent.
- Rechecked the linked database after deployment: all 11 Lists rows remain; there are no Lists grants for anon/authenticated/service_role. Both Calendar tables are published for realtime. Existing weekly/monthly Finance jobs remain active at their original schedules. SQL validation fixtures were rolled back; no Calendar test events/deliveries remain.
- Calendar scoped TypeScript, targeted ESLint, Deno typecheck/lint, Android production export, database integration checks, and Calendar/relevant regression tests pass. Deno tests also cover the optional oversized document path and Finance's unchanged text path.
- Full `npm run lint` still reports existing errors in `app/(login)/create-account.tsx` (import order) and `app/(login)/index.tsx` (unescaped apostrophe), plus the existing unused `EmptyIcon` warning. These were not changed.
- Full `npx tsc --noEmit` includes Deno sources in the Expo configuration and reports pre-existing wheel timer and pull-to-refresh test typing errors. `tsconfig.calendar.json` and Deno checks separately validate the new feature without refactoring unrelated configurations.
- Two-device native visual/realtime testing and a real Calendar-topic delivery remain operator checks after the topic is configured and the updated app is installed. Automated UI interaction tests, realtime subscription tests, and live publication/RLS checks cover those paths without sending messages or creating persistent user data.

## Finite-series refinement validation (2026-10-05)

- Inspected the Calendar screen/grid/editor/detail/scope flow, API/store/types, shared recurrence and exception expansion, original schema/range RPCs and linked column/function/policy definitions, digest entrypoint/formatter/shared Telegram sender, existing Calendar tests and installed gesture patterns. Repository and linked schema matched before the change.
- Migration and rollback SQL checks are committed as `808ee73`. Applied `20261005000000_calendar_series_scopes.sql` to linked project `hcrezrypvkmtzxldvsvm`; local/remote migration history matches. Ran rollback-only SQL validation both before and after deployment. It covers finite/legacy ends, supported cadence parity, partner access, outsider denial, constraints, failed/stale splits, future exception reassignment, truncation, first-occurrence replacement/deletion and final multi-day overlap. No fixture rows survive.
- 126 targeted Jest tests in 10 suites passed, including editor defaults/Never ends/end validation, detail formatting/dismissal, all scopes, API/store RPC routing, arrows/swipes/day selection, recurrence/digest boundaries, realtime and Expenses regressions. Calendar scoped TypeScript and scoped ESLint passed; `git diff --check` passed.
- 32 Deno tests passed (23 digest, 7 unchanged Finance, 2 shared recurrence). Deno check and lint passed. Docker's engine was unavailable, so the equivalent commands ran using `npx --yes deno@2.5.6` without changing project dependencies: `test supabase/functions/_shared/calendar.test.ts supabase/functions/calendar-digest/digest.test.ts supabase/functions/expense-report/report.test.ts`, `check --config supabase/functions/calendar-digest/deno.json supabase/functions/calendar-digest/index.ts`, and `lint --config supabase/functions/calendar-digest/deno.json supabase/functions/calendar-digest supabase/functions/_shared/calendar.ts supabase/functions/_shared/calendar.test.ts`.
- Redeployed only `calendar-digest` via `npx supabase functions deploy calendar-digest --use-api`. Compared downloaded deployed source before deployment: entrypoint, formatter and shared Telegram helper already matched the repository, so formatting/routing/idempotency did not change. The recurrence engine is the only changed production Edge source.
- Calendar cron was already active at `0 21 * * *` when inspected and remains unchanged. Finance weekly/monthly jobs remain active at their original schedules. No real Telegram invocation, operator secret edit or delivery-ledger manipulation occurred.
- Release the updated Expo app for the new UI/scopes. Physical-device swipe/scroll and two-member native interaction remain manual QA; automated tests exercise callbacks, thresholds, selection state and realtime paths. No new operator configuration is required.

## Interactive month paging validation

The scoped pager tests use a Calendar-only controlled Reanimated mock to inspect continuous translation and deliberately complete/cancel animations. They cover prepared grids/indicators, width-relative distance/flick decisions, cancellation, exactly-one commit, locked rapid input/arrows, selected-date/agenda coherence, rebuilt neighbors and stale completions after navigation/resize/unmount. Hook tests cover bounded neighbor data, refresh invalidation, failures/offline behavior and stale results. The shared/global Jest setup is unchanged.

Validation: 92 targeted Jest tests in six suites passed; Calendar scoped TypeScript, scoped ESLint and `git diff --check` passed. A focused transform with the existing Expo/Reanimated Babel configuration produced 11 pager worklets, confirming the gesture/animation callbacks are workletized. No production bundle, backend deployment or native-device QA was performed for this interaction-only change.

```sh
npm test -- --runInBand tests/integration/calendar.swipe.test.tsx tests/integration/calendar.screen.test.tsx tests/integration/calendar.ui.test.tsx tests/integration/calendar.details.test.tsx tests/hooks/useCalendarMonthPages.test.ts tests/hooks/useCalendarRealtime.test.ts
npx tsc --noEmit -p tsconfig.calendar.json
npx eslint 'app/(tabs)/(calendar)/calendar.tsx' components/calendar/MonthCalendar.tsx hooks/useCalendarMonthPages.ts tests/integration/calendar.swipe.test.tsx tests/integration/calendar.screen.test.tsx tests/integration/calendar.ui.test.tsx tests/hooks/useCalendarMonthPages.test.ts tests/mocks/calendarPager.ts
git diff --check
```

Physical Android QA is still required for native rendering/scheduling: hold October, slowly drag right halfway and pause to see September/October proportionally; release past the threshold to settle September. Then drag left less than the threshold and release to return to September. Also verify fast flicks, repeated navigation, arrows, vertical scrolling, date taps, stable height, event-dot positioning and absence of a visible recenter flash. Unit tests exercise the worklet callbacks/decisions, not native frame delivery. No dependency, schema, backend, Telegram, Finance or cron changes/deployment are part of this refinement.

## Month cache validation

The cache regression tests count requests through Oct → Nov → Oct and Oct → Nov → Dec → Nov → Oct, verify in-flight request sharing and space/auth isolation, and exercise invalidation for create, series/exception edit/delete and future splits. Hook tests cover realtime event/exception changes, reconnect, foreground/network recovery and explicit pull-to-refresh while cached content remains visible. Screen tests verify cached indicators, selected-day agenda and absence of blocking spinners. Existing pager animation/state tests run unchanged apart from store mock fields.

```sh
npm test -- --runInBand tests/stores/CalendarStore.test.ts tests/hooks/useCalendarMonthPages.test.ts tests/hooks/useCalendarRealtime.test.ts tests/integration/calendar.screen.test.tsx tests/integration/calendar.swipe.test.tsx tests/integration/calendar.ui.test.tsx
npx tsc --noEmit -p tsconfig.calendar.json
npx eslint 'app/(tabs)/(calendar)/calendar.tsx' stores/CalendarStore.ts hooks/useCalendarMonthPages.ts tests/stores/CalendarStore.test.ts tests/hooks/useCalendarMonthPages.test.ts tests/hooks/useCalendarRealtime.test.ts tests/integration/calendar.screen.test.tsx tests/integration/calendar.swipe.test.tsx
git diff --check
```

Validation: 102 targeted Jest tests in six suites passed; Calendar scoped TypeScript, scoped ESLint and `git diff --check` passed. This loading/cache fix requires only an updated Expo app; no backend deployment or operator configuration changes are required. Native device rendering remains a manual QA check.

## Pager handoff validation

The Calendar-only animation mock can defer JS completion and UI reset separately. Swipe and arrow tests verify the destination's prepared first-day highlight, unchanged screen position before/after React commit and recenter, retained page instance, atomic canonical month/selection renders, immediate cached agenda, correct rebuilt neighbor/range, cancellation and Oct → Nov → Oct request reuse. The cache store, prefetch hook and backend are unchanged by this handoff refinement.

```sh
npm test -- --runInBand tests/integration/calendar.swipe.test.tsx tests/integration/calendar.screen.test.tsx tests/integration/calendar.ui.test.tsx tests/hooks/useCalendarMonthPages.test.ts tests/hooks/useCalendarRealtime.test.ts tests/stores/CalendarStore.test.ts
npx tsc --noEmit -p tsconfig.calendar.json
npx eslint 'app/(tabs)/(calendar)/calendar.tsx' components/calendar/MonthCalendar.tsx tests/integration/calendar.swipe.test.tsx tests/mocks/calendarPager.ts
git diff --check
```

Physical-device verification is required to confirm absence of a single-frame native rendering jitter; the tests exercise state/worklet order, not Fabric's native frame scheduling. Verify slow swipes, quick flicks, arrow navigation, snap-back and repeated Oct → Nov → Oct on Android, watching the destination's first-day highlight and agenda at the final settling frame. No backend deployment is required.

Validation: 104 targeted Jest tests in six suites passed, including both delayed swipe/arrow handoffs and the existing cache regression suite. Calendar scoped TypeScript, scoped ESLint and `git diff --check` passed. No physical-device verification was performed.
