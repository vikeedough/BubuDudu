# Offline-First Architecture

This document explains the offline-first layer added to BubuDudu and how to build future features, especially expense tracking, on top of it.

Related docs:

- `docs/features.md` describes how each feature uses the offline layer.
- `docs/backend-data-model.md` maps the Supabase tables, storage buckets, Edge Functions, and local SQLite cache.
- `docs/supabase-introspection.sql` can be run in Supabase to verify live RLS policies, triggers, indexes, and storage settings.

## Goals

- The app can open offline after the user has logged in once and joined or created a space.
- Notes, lists, wheels, expenses, expense budgets, categories, and shared milestones can be created, edited, and deleted while offline.
- Offline writes update the UI immediately and sync to Supabase when the phone comes back online.
- Sync conflict behavior is last-write-wins.
- Gallery is view-only offline. Gallery uploads/deletes are intentionally blocked while offline.
- Offline cache is cleared on sign out.
- User-facing network/sync feedback uses the existing toast API, not a persistent status indicator.

## Important Files

- `providers/offline-provider.tsx`
  Initializes the local database, listens to network changes, flushes pending changes, refreshes stores, and shows toast notifications.

- `utils/offline/local-db.ts`
  Owns the SQLite schema, cache read/write helpers, and the `sync_outbox` table.

- `utils/offline/sync.ts`
  Flushes queued outbox operations to Supabase and updates sync state.

- `utils/offline/network.ts`
  Tiny in-memory online/offline singleton used by stores and tests.

- `utils/offline/id.ts`
  Generates client-side IDs for offline-created rows.

- `stores/SyncStore.ts`
  Tracks `isOnline`, `isSyncing`, `pendingCount`, `lastSyncedAt`, and `lastError`.

- `stores/ExpenseStore.ts`
  Owns expense/category cache reads, offline writes, exchange-rate conversion, and pending conversion retry.

- `supabase/sql/offline-first-sync.sql`
  SQL that should be run in the Supabase GUI. It adds sync-friendly columns, triggers, and indexes.

## Runtime Flow

### App startup

1. `OfflineProvider` mounts in `app/_layout.tsx`.
2. SQLite is opened and migrated.
3. NetInfo checks connectivity.
4. If online, the provider flushes queued outbox items and refreshes stores.
5. If offline, feature stores rely on their cached SQLite data.

### Reading data

Feature stores follow this pattern:

1. Get the active `spaceId`.
2. Read cached rows from SQLite.
3. Show cached rows immediately when available.
4. If offline, stop there.
5. If online, flush pending writes, fetch latest Supabase data, save it to SQLite, then update Zustand.

This pattern is currently used by:

- `stores/ListStore.ts`
- `stores/WheelStore.ts`
- `stores/ExpenseStore.ts`
- `stores/MilestoneStore.ts`
- `api/endpoints/profiles.ts`
- `api/endpoints/quotes.ts`
- `stores/GalleryStore.ts`

### Writing data offline

Offline writes follow this pattern:

1. Create or update the local SQLite row.
2. Update the Zustand store so the UI changes immediately.
3. Insert an item into `sync_outbox`.
4. Update the pending sync count.
5. When online, `flushOutbox()` sends each outbox item to Supabase.
6. Successful items are removed from the outbox.
7. Failed items stay queued and are retried later.

The user is notified by toast when:

- the app enters offline mode
- the app comes back online
- offline changes finish syncing
- sync fails and will retry

## Current Offline Support

### Fully offline-writeable

- Lists
- Wheels
- Expenses, expense budgets, and expense categories
- Shared milestone
- Profile note/status

These writes update SQLite and Zustand immediately, then enqueue a `sync_outbox` row.

### Cached for offline reading

- Current/partner profiles
- Quotes
- Lists
- Wheels
- Expenses
- Expense budgets
- Expense categories
- Exchange rates for expense conversion
- Shared milestone
- Gallery metadata
- Gallery image rows and signed URLs, when previously fetched

### Offline blocked

- Auth actions
- Space creation/join
- Invite-code fetch
- Avatar upload
- Profile name/date/avatar color edits
- Gallery creation
- Gallery uploads
- Gallery image deletes
- Gallery deletes
- Image downloads

Missing gallery images are not rendered while offline.

## Cache Lifecycle

Cache is local to the device and is cleared on sign out:

- `components/auth/sign-out-button.tsx`
- `app/(login)/space-management.tsx` emergency sign-out path

The app assumes one user per device. If that changes later, cache tables should be keyed more aggressively by authenticated user ID as well as `space_id`.

## Supabase Requirements

Run this SQL in Supabase before relying on production sync:

- `supabase/sql/offline-first-sync.sql`

It adds:

- `updated_at`
- `deleted_at`
- update triggers
- sync indexes

Important caveat: the local schema is ready for soft deletes, but the current outbox flush still performs real Supabase deletes for lists and wheels. If we want full tombstone-based sync later, switch those delete handlers in `utils/offline/sync.ts` to update `deleted_at` instead of calling `.delete()`.

Live introspection pasted on 2026-05-11 confirmed the sync columns, sync indexes, and `set_updated_at` triggers exist for `lists`, `wheel`, `milestones`, and `profiles`. It also confirmed that RLS is enabled on all public app tables and that member-scoped policies allow the current offline sync writes for lists, wheels, milestones, and profile notes.

Re-run `docs/supabase-introspection.sql` when touching sync behavior. The app depends on RLS policies allowing space members to read/write only their own space data, and on Storage policies allowing signed private gallery URLs through the authenticated user.

## Implementation Notes

- `OfflineProvider` owns startup initialization, connectivity transitions, outbox flushing, post-sync store refresh, and sync/offline toasts.
- `utils/offline/network.ts` is an in-memory online/offline singleton. Stores read it synchronously to decide whether to use Supabase or queue local writes.
- `utils/offline/id.ts` creates UUID-like IDs for offline-created rows so they can sync without waiting for Supabase IDs.
- `flushOutbox()` serializes concurrent sync attempts with a module-level `syncPromise`.
- Failed outbox items stay queued and record `attempts` plus `last_error`.
- The current conflict strategy is simple last queued write wins; there is no field-level merge.
- Expense and expense-category deletes are soft deletes in Supabase via `deleted_at`.
- Expense rows cache `paid_by` so "Me" views work offline from the actual payer, not the row creator.
- Foreign-currency expenses may be created with `conversion_status = "pending"` when offline without a cached rate. `ExpenseStore` retries conversion after online refresh.

## Testing Offline Behavior

Use an EAS preview or production build for true offline startup testing. Expo dev client usually depends on Metro/dev tooling, so it is not a reliable cold-start offline test.

Suggested manual test:

1. Install a preview/prod build.
2. Open online, log in, and join/create a space.
3. Visit Home, Lists, Expenses, Wheel, and Gallery at least once to seed cache.
4. Kill the app.
5. Enable airplane mode.
6. Reopen the app.
7. Create/edit/delete lists, expenses, expense budgets, categories, wheels, milestone, and profile note.
8. Disable airplane mode.
9. Watch toast notifications and confirm Supabase receives the changes.

## Expense Tracking Implementation

Expense tracking has been implemented as an offline-first feature. See `docs/expense-tracker.md` for product behavior, currency conversion, local cache tables, and backend table details.

Important implementation notes:

- Screens call `stores/ExpenseStore.ts`, not Supabase directly.
- Expense rows and category rows use client-generated UUIDs from `createLocalId()`.
- Local cache tables are `expenses_cache`, `expense_budgets_cache`, `expense_categories_cache`, and `expense_exchange_rates_cache`.
- Outbox entities are `expenses`, `expense_budgets`, and `expense_categories`.
- Deletes use `deleted_at` soft deletes.
- Conflict handling remains last-write-wins by queued operation order and server `updated_at`.
