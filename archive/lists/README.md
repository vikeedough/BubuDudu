# Archived Lists

These routes, component, store, sync handler, and tests are retained for restoration. Nothing under this directory is imported by production code. Expo Router only scans `app/`, so `/lists` and the former `(lists)` route group no longer exist.

`lists` remains in Postgres with its data intact. The Calendar migration removes its policies and revokes access from anon, authenticated, and service_role. Restoring Lists requires an explicit reviewed migration restoring grants/policies and reconnecting these archived files.

The SQLite table and its compatibility helpers remain in the shared database module to avoid removing device data or changing schema versions. Queued Lists writes are retained but excluded from pending counts and syncing. No runtime feature calls the Lists cache helpers. Normal sign-out cache clearing retains its existing behaviour.

The archived tests are historical and excluded by Jest's `tests/**` discovery. Restoring the feature also requires restoring its test reset setup.
