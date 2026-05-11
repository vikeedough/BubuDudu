# Codebase Overview

This document maps the BubuDudu codebase as it exists now so future chats can get oriented quickly.

## Stack

- Expo SDK 54, React 19, React Native 0.81, Expo Router 6.
- Supabase JS v2 for Auth, Postgres, Storage, and Edge Functions.
- Zustand stores for feature state.
- Expo SQLite for local offline cache and sync outbox.
- Expo Secure Store for the active `space_id`.
- AsyncStorage for persisted Supabase auth session.
- Expo Image, Image Picker, Media Library, File System, Image Manipulator, BlurHash, FlashList, React Native SVG, Reanimated, and Zoom Toolkit for media-heavy UI.
- Jest with `jest-expo` and Testing Library for unit, store, hook, API, integration, and performance tests.

## App Boot Flow

`app/_layout.tsx` loads the Raleway font set, mounts `OfflineProvider`, then `AuthProvider`, then the Expo Router stack, and finally the global `ToastRoot`.

`app/index.tsx` is the first routing decision:

- If auth is still loading, show a spinner.
- If logged out, redirect to `/(login)`.
- If logged in without a stored active space, redirect to `/(login)/space-management`.
- If logged in with an active space, redirect to `/(tabs)/initial`.

The active space is stored under `active_space_id` in Expo Secure Store via `utils/secure-store.ts`.

## Route Map

```text
app/
  _layout.tsx                       Root providers and route stack
  index.tsx                         Auth/space redirect gate
  (login)/
    index.tsx                       Login/signup landing
    new-login.tsx                   Email/password login
    create-account.tsx              Signup form
    forgot-password.tsx             Password reset email
    reset-password.tsx              Deep-link recovery session and new password
    space-management.tsx            Create or join a space
  (onboarding)/
    name.tsx                        Capture display name
    birthday.tsx                    Capture birthday
    index.tsx                       Avatar, avatar border color, finish onboarding
  (tabs)/
    initial.tsx                     Home dashboard
    (gallery)/gallery.tsx           Gallery list
    (gallery)/galleryContent.tsx    Gallery detail and images
    (lists)/lists.tsx               Notes/lists
    (wheel)/wheel.tsx               Decision wheel
  (settings)/
    index.tsx                       Settings menu
    name.tsx                        Edit profile name
    date-of-birth.tsx               Edit birthday
    shared-milestone.tsx            Edit shared milestone
```

## Folder Map

- `api/clients/supabaseClient.ts`
  Creates the Supabase client. The session is persisted in AsyncStorage.
- `api/endpoints/`
  Thin domain API functions for auth, profiles, quotes, and invite codes.
- `stores/`
  Zustand stores for lists, wheels, milestone, gallery, sync status, and toast state.
- `providers/`
  Auth and offline providers that wrap the app.
- `utils/offline/`
  SQLite schema, cache helpers, network singleton, outbox flushing, and local UUID generation.
- `utils/`
  Feature utilities for images, gallery downloads, dates, secure storage, space management, and concurrency.
- `components/`
  UI components grouped by auth, gallery, home, lists, settings, toast, wheel, and common modal controls.
- `supabase/functions/`
  Edge Functions for private gallery URL signing and server-side gallery deletion.
- `supabase/sql/`
  SQL support scripts, currently focused on offline-first sync columns/triggers/indexes.
- `tests/`
  Jest tests covering endpoints, stores, hooks, utilities, gallery integration flow, and gallery render-count performance.

## State And Data Pattern

Most feature screens read and write through stores or endpoint helpers:

- `AuthProvider` owns the Supabase session and the current user's `profiles` row.
- `useListStore` owns notes/lists and their offline outbox operations.
- `useWheelStore` owns wheels and their offline outbox operations.
- `useMilestoneStore` owns the one shared milestone for the active space.
- `useGalleryStore` owns gallery list paging, image paging, upload/delete state, and signed image URLs.
- `useSyncStore` owns network/sync status displayed through toasts.
- `useToastStore` owns global toast queue and payloads.

For offline-capable features, the pattern is:

1. Read cached SQLite rows first.
2. If offline, return the cached rows.
3. If online, flush pending outbox writes.
4. Fetch fresh Supabase rows.
5. Replace or update SQLite cache.
6. Update Zustand state.

## Backend Entry Points

The app directly uses these Supabase resources:

- Tables: `profiles`, `spaces`, `space_members`, `space_invites`, `quotes`, `milestones`, `lists`, `wheel`, `galleries`, `date_images`.
- Storage buckets: `avatars`, `gallery-private`.
- Edge Functions: `sign-gallery-urls`, `sign-gallery-cover-urls`, `delete-gallery`.
- Auth APIs: email/password sign in, signup, password reset, password update, session recovery, sign out.

See `docs/backend-data-model.md` for table and function details.

## Testing

Run all tests:

```bash
npm test
```

Coverage collection is configured for:

- `utils/**/*.ts`
- `stores/**/*.ts`
- `api/endpoints/**/*.ts`
- `hooks/**/*.ts`

Jest mocks Supabase, Secure Store, NetInfo, SQLite, Image Picker, Media Library, File System, and Image Manipulator in `jest.setup.ts`.

## Build And Run

Common scripts:

```bash
npm install
npm run start
npm run android
npm run android:dev
npm run android:prod
npm run ios
npm run web
npm run lint
npm test
```

`app.config.js` switches the app name, URL scheme, Android package, and iOS bundle ID based on `APP_VARIANT`:

- Dev: `BubuDudu (Dev)`, `bubududu-dev`, `com.vikeedough.bubududu.dev`.
- Prod: `BubuDudu`, `bubududu`, `com.vikeedough.bubududu`.
