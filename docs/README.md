# BubuDudu Documentation Index

Start here when a future chat needs to understand the project quickly.

## Recommended Reading Order

1. `docs/codebase-overview.md`
   - App stack, boot flow, folder map, route map, state management, and test setup.
2. `docs/features.md`
   - User-facing features and where each feature lives in code.
3. `docs/backend-data-model.md`
   - Supabase tables, storage buckets, Edge Functions, local SQLite cache, and data flow.
4. `docs/offline-first.md`
   - Detailed offline-first behavior, sync outbox, cache lifecycle, and how to add future offline features.
5. `docs/expense-tracker.md`
   - Expense tracker behavior, currency conversion, local cache tables, and sync model.
6. `docs/supabase-introspection.sql`
   - Read-only SQL to paste into the Supabase SQL editor when live backend details are needed.

## Current App Shape

BubuDudu is an Expo Router React Native app for a shared couple space. It uses Supabase Auth, Postgres, Storage, and Edge Functions, plus local SQLite and Zustand for offline-first feature state.

The main feature areas are:

- Email authentication, signup, password reset, and onboarding.
- Space creation, invite-code joining, and shared membership.
- Home dashboard with quotes, birthday countdowns, shared milestone, avatars, and status notes.
- Settings for profile details, shared milestone, invite code, and sign out.
- Notes/lists with offline create, edit, and delete.
- Expense tracking with offline create/edit/delete, category management, currency conversion, and breakdown metrics.
- Decision wheel with offline wheel/title/choice changes and animated spin results.
- Gallery with private images, generated variants, signed URLs, pagination, image viewer, downloads, and deletes.
- Offline cache and sync outbox for lists, wheels, expenses, shared milestone, and profile notes.

## Backend Knowledge

The schema currently known to the app is documented in `docs/backend-data-model.md`. The SQL supplied in this chat covers table columns and foreign keys, but future work should also verify live backend details that are not captured by a schema dump:

- Row Level Security enabled state.
- RLS policies and storage policies.
- Storage buckets and bucket privacy.
- Indexes, triggers, and database functions.
- Realtime publications, grants, and installed extensions.

Run `docs/supabase-introspection.sql` in Supabase and paste the results into a future chat when those live details matter.
