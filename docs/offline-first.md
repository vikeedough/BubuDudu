# Offline-First Architecture

This document explains the offline-first layer added to BubuDudu and how to build future features, especially expense tracking, on top of it.

## Goals

- The app can open offline after the user has logged in once and joined or created a space.
- Notes, lists, wheels, and shared milestones can be created, edited, and deleted while offline.
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
- Shared milestone
- Profile note/status

### Cached for offline reading

- Current/partner profiles
- Quotes
- Gallery metadata
- Gallery image rows and signed URLs, when previously fetched

### Offline blocked

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

## Testing Offline Behavior

Use an EAS preview or production build for true offline startup testing. Expo dev client usually depends on Metro/dev tooling, so it is not a reliable cold-start offline test.

Suggested manual test:

1. Install a preview/prod build.
2. Open online, log in, and join/create a space.
3. Visit Home, Lists, Wheel, and Gallery at least once to seed cache.
4. Kill the app.
5. Enable airplane mode.
6. Reopen the app.
7. Create/edit/delete lists, wheels, milestone, and profile note.
8. Disable airplane mode.
9. Watch toast notifications and confirm Supabase receives the changes.

## How To Add Expense Tracking

Design expenses as an offline-first feature from the beginning. Avoid direct Supabase calls from the screen.

Recommended server columns:

```sql
create table if not exists public.expenses (
  id uuid primary key,
  space_id uuid not null references public.spaces(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null,
  amount numeric(12, 2) not null,
  currency text not null default 'SGD',
  category text,
  paid_at timestamptz not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create trigger set_expenses_updated_at
before update on public.expenses
for each row execute function public.set_updated_at();

create index if not exists expenses_space_sync_idx
on public.expenses (space_id, updated_at, deleted_at);
```

Recommended app steps:

1. Add an `expenses_cache` table in `utils/offline/local-db.ts`.
2. Add helpers:
   - `getCachedExpenses(spaceId)`
   - `replaceCachedExpenses(spaceId, expenses)`
   - `upsertCachedExpense(expense)`
   - `markCachedExpenseDeleted(expenseId, deletedAt)`
3. Add `"expenses"` to the `OutboxEntity` union.
4. Add an expense sync branch in `utils/offline/sync.ts`.
5. Create `stores/ExpenseStore.ts` using the same pattern as `ListStore`.
6. Build screens against `ExpenseStore`, not Supabase directly.
7. Add tests for:
   - cached offline read
   - offline create
   - offline update
   - offline delete
   - reconnect sync
   - failed sync remains queued

Expense rows should use client-generated UUIDs from `createLocalId()` so new expenses can be created offline without waiting for Supabase.

For v1 conflict handling, keep last-write-wins by `updated_at`. Expense entries are usually record-based, so this should be good enough unless we later add shared split/settlement workflows that need field-level conflict handling.
