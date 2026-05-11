# BubuDudu

BubuDudu is an Expo React Native app for a shared couple space. It uses Supabase for auth, Postgres, Storage, and Edge Functions, plus local SQLite and Zustand for offline-first app state.

## Documentation

Start future codebase-reading chats with:

- `docs/README.md` - documentation index and reading order.
- `docs/codebase-overview.md` - architecture, routes, folders, state, and tests.
- `docs/features.md` - every current app feature and where it lives.
- `docs/backend-data-model.md` - Supabase tables, storage, Edge Functions, and local SQLite cache.
- `docs/offline-first.md` - detailed offline-first behavior and extension pattern.
- `docs/supabase-introspection.sql` - read-only SQL for live Supabase policies, buckets, triggers, indexes, grants, and counts.

## Setup

```bash
npm install
npm run start
```

Common scripts:

```bash
npm run android
npm run android:dev
npm run android:prod
npm run ios
npm run web
npm run lint
npm test
npm run test:coverage
```

## Supabase

The app currently targets the Supabase project configured in `api/clients/supabaseClient.ts`.

Run `supabase/sql/offline-first-sync.sql` in Supabase before relying on production offline sync. When live backend context is needed, paste `docs/supabase-introspection.sql` into the Supabase SQL editor and share the results with the next chat.
