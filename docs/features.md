# Feature Documentation

This document describes each user-facing feature and the code/backend pieces that implement it.

## Shared Calendar

Calendar replaces Lists in the fourth tab. It supports shared event CRUD, all-day/timed events, recurrence and individual exceptions, day-based reminders, realtime refresh, and a 05:00 Singapore Telegram digest. See `docs/calendar.md` for architecture, operation, and deployment. All Lists descriptions below are historical: routes/source are archived, backend access is revoked, and queued Lists writes are retained without syncing.

## Authentication

Routes:

- `app/(login)/index.tsx`
- `app/(login)/new-login.tsx`
- `app/(login)/create-account.tsx`
- `app/(login)/forgot-password.tsx`
- `app/(login)/reset-password.tsx`

Code:

- `api/endpoints/auth.ts`
- `providers/auth-provider.tsx`
- `api/clients/supabaseClient.ts`

Backend:

- Supabase Auth `auth.users`
- `profiles`
- `space_members`

Behavior:

- Login uses `supabase.auth.signInWithPassword`.
- After login, the app looks up the first `space_members` row for the user and stores its `space_id` in Secure Store.
- If a user has no space membership, `active_space_id` is cleared and the user is sent to space management.
- Signup uses Supabase email/password signup, then routes to onboarding.
- Password reset sends a Supabase recovery email with an Expo deep link to `/(login)/reset-password`.
- Reset password supports both PKCE `code` links and `access_token`/`refresh_token` hash links, then calls `supabase.auth.updateUser`.
- Auth session persistence is handled by Supabase using AsyncStorage.

Offline behavior:

- Auth itself is online-only.
- If a session already exists, cached profile data can be shown offline after the app has been opened online before.

## Onboarding And Profile

Routes:

- `app/(onboarding)/name.tsx`
- `app/(onboarding)/birthday.tsx`
- `app/(onboarding)/index.tsx`
- `app/(settings)/name.tsx`
- `app/(settings)/date-of-birth.tsx`

Code:

- `providers/auth-provider.tsx`
- `api/endpoints/profiles.ts`
- `utils/home.ts`
- `utils/shrinkImage.ts`

Backend:

- `profiles`
- Storage bucket `avatars`

Behavior:

- Onboarding captures name, birthday, avatar border color, and optional avatar.
- `AuthProvider.updateProfile` first tries to update the user's `profiles` row; if no row exists, it inserts one.
- Avatar upload shrinks the selected image, uploads a JPEG to the `avatars` bucket, obtains a public URL, and saves it as `profiles.avatar_url`.
- Avatar border color is saved as `profiles.avatar_border_color`.
- Settings can update name, date of birth, and avatar border color.

Offline behavior:

- Profile reads are cached per space and user.
- Profile note/status is offline-writeable.
- Name, birthday, avatar, and border color edits currently require an online Supabase request.

## Spaces And Invites

Route:

- `app/(login)/space-management.tsx`

Code:

- `utils/space-management.ts`
- `utils/secure-store.ts`
- `api/endpoints/space-invites.ts`
- `components/settings/InviteCode.tsx`

Backend:

- `spaces`
- `space_members`
- `space_invites`
- `profiles`
- `auth.users`

Behavior:

- A new user can create a space named `BubuDudu`.
- Space creation inserts into `spaces`, stores the new `space_id`, inserts the creator into `space_members`, then creates an 8-character invite code.
- Invite-code generation retries up to five times on unique-code collisions.
- Joining a space looks up `space_invites.code`, inserts the user into `space_members`, and stores the joined `space_id`.
- Settings shows the current invite code and can copy it with Expo Clipboard.
- Emergency login reset signs out, clears local offline data, deletes `active_space_id`, and returns to login.

Offline behavior:

- Creating or joining a space is online-only.
- The active space ID remains available offline through Secure Store once set.

## Home Dashboard

Route:

- `app/(tabs)/initial.tsx`

Components:

- `components/home/QuoteContainer.tsx`
- `components/home/MilestoneTracker.tsx`
- `components/home/NoteModal.tsx`
- `components/home/AvatarDisplay.tsx`

Backend:

- `quotes`
- `profiles`
- `space_members`
- `milestones`
- Storage bucket `avatars`

Behavior:

- Shows greeting, current date, a random quote, birthday countdowns for the user and partner, the shared milestone countdown, avatar cards, and profile notes.
- Quotes are fetched for the active space and one is selected randomly whenever the fetched quote list changes.
- Profiles are fetched through `space_members` joined to `profiles`.
- The user's avatar can be tapped to pick and upload a new avatar.
- The user's note/status opens `NoteModal`; saving calls `updateProfileNote`.
- Long-pressing the Debon image routes to Settings.

Offline behavior:

- Cached quotes, profiles, and milestone are shown offline when previously fetched.
- Profile note/status can be changed offline and is queued in the sync outbox.
- Avatar upload is online-only.

## Settings

Routes:

- `app/(settings)/index.tsx`
- `app/(settings)/name.tsx`
- `app/(settings)/date-of-birth.tsx`
- `app/(settings)/shared-milestone.tsx`

Components:

- `components/settings/SettingsField.tsx`
- `components/settings/SettingsTextInputField.tsx`
- `components/settings/DisplayDatePickerField.tsx`
- `components/settings/AvatarColorPicker.tsx`
- `components/settings/InviteCode.tsx`

Backend:

- `profiles`
- `milestones`
- `space_invites`

Behavior:

- Settings displays profile name, date of birth, shared milestone, avatar colour, invite code, and sign out.
- Name and date of birth use `AuthProvider.updateProfile`.
- Avatar colour uses a custom on-screen picker with palette shortcuts, RGB controls, a hex field, live preview, and an explicit Save action. Saved colours are normalized to `#RRGGBB`.
- Shared milestone uses `useMilestoneStore.upsertMilestone`.
- Sign out clears Supabase auth, offline SQLite cache, and the stored active space ID.

Offline behavior:

- Shared milestone can be updated offline.
- Name, date of birth, and avatar colour currently require online profile update requests.
- Invite code fetch is online-only unless future code adds caching.

## Notes / Lists

Route:

- `app/(tabs)/(lists)/lists.tsx`

Store:

- `stores/ListStore.ts`

Backend:

- `lists`

Behavior:

- Lists are displayed as colored vertical tabs.
- Selecting a tab loads its title and content into the editor.
- The `+` tab opens a local draft with id `__DRAFT__`.
- Save creates a new list for drafts or updates an existing list if title/content changed.
- Delete opens `DeleteListModal` and removes the selected list after confirmation.
- Pull-to-refresh calls `fetchLists`.
- Lists are ordered newest first by update time in local cache and by `last_updated_at` in Supabase queries.

Offline behavior:

- Create, update, and delete are offline-writeable.
- Offline writes update SQLite and Zustand immediately, then enqueue `lists` operations in `sync_outbox`.
- Reconnect flushes queued inserts, updates, and deletes to Supabase.
- Current sync deletes list rows in Supabase rather than soft-deleting them, even though `deleted_at` exists.

## Expense Tracker

Route:

- `app/(tabs)/(expenses)/expenses.tsx`

Components:

- `components/expenses/ExpenseModal.tsx`
- `components/expenses/CategoryManagerModal.tsx`
- `components/expenses/ExpenseRow.tsx`
- `components/expenses/ExpenseBreakdownView.tsx`
- `components/expenses/ExpenseBudgetView.tsx`
- `components/expenses/BudgetModal.tsx`

Store:

- `stores/ExpenseStore.ts`

Backend:

- `expense_categories`
- `expenses`
- `expense_budgets`

Behavior:

- The Expenses tab is the third tab in the bottom bar.
- The tracker logs expenses and monthly category budgets only. It does not model income, transfers, splitting, or settlement.
- Expenses include amount, currency, title, category, paid date, and keyed-in creation timestamp.
- Expenses store both the creator and the payer. The payer can be the current user or partner.
- The log can show both partners together or only the current user's expenses. The Me/Both scope control is ordered Me then Both and uses current-user/partner avatar border colors.
- The log opens to day view by default and can switch between day, week, and month views, with previous/next period navigation. The current day label is Today, and the selected log period uses the same yellow style as Breakdown.
- Adding an expense while viewing a specific log day starts the expense form date picker on that selected day.
- The expense form date picker is date-only, labels the current day as Today, and saves the selected local day in `paid_at`.
- The expense form pauses modal scrolling while the date wheel is active so iOS wheel selections settle reliably.
- Expenses sort newest first by paid date, then creation timestamp so same-day entries show in keyed-in order.
- The category field in the expense form is a dropdown. Add expense and category management share an expandable floating action menu outside the add-expense modal so iOS does not need to stack the category manager from inside the modal.
- Expense title suggestions show up to three prior expenses created by the current user, starting after two typed characters, with prefix matches ranked before contains matches.
- Payer buttons use each person's avatar border color, and the partner payer option shows the partner's profile name when available.
- Expense rows show the partner's profile name for partner-paid expenses when available.
- Default categories are Food, Health, Medical, Bills, and Transport.
- Categories can be added, renamed, recolored, and deleted. Deletes are soft deletes; existing expenses keep category snapshots.
- Breakdown view supports daily, weekly, monthly, and yearly periods, with previous/next period navigation. Weekly periods start on Monday.
- Pressing a Breakdown category opens a modal listing all matching expenses for that category, period, and Me/Both scope, sorted newest first.
- Breakdown metrics include total spend, change vs previous period, daily average, top category, largest expense, transaction count, and conversion-pending count.
- Budget view supports monthly budgets per category, with shared Both budgets and private Me budgets.
- Budget rows show spent amount, budget amount, remaining or over amount, percentage used, and a progress bar.
- If a selected month has no budgets for the active scope, the app copies the previous month's budgets for that same scope.

Currency behavior:

- Default currency is SGD.
- Popular travel currencies are available when adding an expense.
- Foreign-currency expenses store original amount/currency plus a converted SGD snapshot.
- Exchange rates are fetched from Frankfurter and cached locally.
- If a foreign-currency expense is created offline without a cached rate, it is saved with pending conversion and retried when online.

Offline behavior:

- Expense, budget, and category create, update, and delete are offline-writeable.
- Offline writes update SQLite and Zustand immediately, then enqueue `expenses`, `expense_budgets`, or `expense_categories` operations in `sync_outbox`.
- Expense, budget, and category deletes use `deleted_at` soft deletes in local cache and Supabase.
- Cached exchange rates are reused offline when available.

## Decision Wheel

Route:

- `app/(tabs)/(wheel)/wheel.tsx`

Components:

- `components/wheel/SpinningWheel.tsx`
- `components/wheel/EditChoicesModal.tsx`
- `components/wheel/WheelHeader.tsx`

Store:

- `stores/WheelStore.ts`

Backend:

- `wheel`

Behavior:

- Wheels are displayed as horizontal colored tabs.
- The `+` tab creates a local draft wheel.
- Typing a non-empty draft title creates the wheel after a 500 ms debounce.
- Existing wheel title edits are also debounced by 500 ms.
- The edit button opens a modal to add or remove choices.
- The trash button confirms and deletes the selected wheel.
- Tapping choice chips selects which choices participate in the spin.
- `SpinningWheel` animates the selected choices, chooses a random selected choice, and shows a result modal.
- Pull-to-refresh calls `fetchWheels`.

Offline behavior:

- Create, title update, choice update, and delete are offline-writeable.
- Offline writes update SQLite and Zustand immediately, then enqueue `wheel` operations in `sync_outbox`.
- Current sync deletes wheel rows in Supabase rather than soft-deleting them, even though `deleted_at` exists.

## Gallery

Gallery routes remain: `app/(tabs)/(gallery)/gallery.tsx` and `galleryContent.tsx`, backed by `hooks/useGalleryList.ts`, `hooks/useGalleryContent.ts`, `stores/GalleryStore.ts`, and `components/gallery/`.

- Lists retain debounced search, date/ID keyset paging (10), sort and refresh. Images page by creation time/ID (20).
- Gallery creation requires title, location, color, date and photos. It closes the modal and uploads with progress. Partial failures keep completed photos and the gallery for retry; there is no asynchronous whole-gallery rollback.
- New uploads use private R2 via authenticated initialize/PUT/finalize. Supabase-backed images remain supported. Pending/deleting rows are hidden. Two JPEG objects are generated: thumb 1000/.70 and orig 2000/.90; grid fields alias orig with zero additional bytes. All 732 historical photos use R2 with three byte-for-byte verified variants. After user confirmation that historical photos display correctly, the separately authorized 2026-11-02 cleanup removed 2,196 verified Supabase source copies and retained the three excluded unreferenced objects. Backend post-cleanup signing/checksums passed; post-cleanup device visual/download testing remains manual.
- Covers reuse completed image keys. Viewer, selection, edit details, download to the BubuDudu device album and sorting retain the existing UI. Signed URLs refresh on viewer open/download, expiry and bounded load-error retry.
- Long-press or the visible selection control enters photo selection. Download/Delete and their action-bar container appear only with a nonempty valid selection. Deselecting the final photo exits selection consistently; Clear, completed actions, gallery changes and screen blur reset selection. IDs removed from a settled image page are pruned without discarding selection during a temporary refresh. Selection controls expose checked state and count announcements; original compact typography and visible control sizes are restored, with invisible hit areas for small controls. The grid reserves the measured selection action-bar height.
- Single/batch/gallery deletes are server-authorized and provider-aware. Deletion requests durably queue provider-aware receipts and return 202; covers change transactionally. The deployed daily backend job at 03:00 Singapore time handles eligible cleanup independently of the app, preserving the five-minute PUT window plus two-minute drain grace. There is no client physical cleanup or polling in the updated app. Queued whole galleries stay hidden until cleanup finishes. The queue-only production endpoints are deployed; first scheduled physical cleanup and updated-device validation remain pending. See the rollout and monitoring instructions.
- Gallery metadata and signed URLs are cached by account/space. Offline is view-only and depends on already-cached image bytes; creation/edit/upload/delete/download remain online-only. SQLite v7 adds gallery deletion tombstones; partial searches/pages upsert metadata without clearing previously browsed content. The v6 unscoped-cache upgrade and unrelated offline data/outbox remain intact.

- Image sort is server-paged oldest/newest first with creation-time/ID cursors. Cover renewal preserves loaded gallery pages; the viewer anchors the active photo ID and offers bounded page/image retry.
- Read/signing failures retain usable cached images and show Retry instead of an empty gallery. Focus, foreground and reconnect reconcile ready metadata without physical-cleanup calls or periodic polling.
- One upload job per gallery and guarded picker/delete actions prevent duplicate operations. Downloads report saved/failed/skipped photos, preserve unsuccessful selections for retry, and show saved/total progress; saved photos are excluded from the next retry.

See [Private gallery storage](gallery-storage.md) for architecture, protected database state, cleanup receipts, deployment, credentials, migration/rollback, limitations and validation.

## Toasts

Code:

- `toast/api.ts`
- `toast/types.ts`
- `stores/ToastStore.ts`
- `components/toast/ToastRoot.tsx`
- `components/toast/ToastViewport.tsx`
- `components/toast/ToastItem.tsx`

Behavior:

- Toasts can be shown with generated IDs or stable caller-provided IDs.
- Calling `toast.show` with an existing ID updates that toast rather than adding another.
- Toast payloads support title, message, duration, persistent mode, and determinate progress.
- Upload progress and offline/sync state use the toast API.

## Offline-First Sync

Core docs:

- `docs/offline-first.md`

Code:

- `providers/offline-provider.tsx`
- `utils/offline/local-db.ts`
- `utils/offline/sync.ts`
- `utils/offline/network.ts`
- `utils/offline/id.ts`
- `stores/SyncStore.ts`

Fully offline-writeable today:

- Lists
- Wheels
- Shared milestone
- Profile note/status

Cached for offline reads:

- Profiles
- Quotes
- Shared milestone
- Lists
- Wheels
- Gallery metadata
- Gallery image rows and signed URLs when previously fetched

Blocked offline:

- Auth actions
- Space creation/join
- Invite-code fetch
- Avatar upload
- Profile name/date/avatar color edits
- Gallery creation/upload/delete/download

Sync behavior:

- Offline writes create local SQLite changes and enqueue outbox rows.
- Reconnect flushes outbox rows in creation order.
- Successful rows are removed from the outbox.
- Failed rows stay queued with attempt count and last error.
- `OfflineProvider` refreshes feature stores after sync.
- Toasts announce offline mode, back-online state, sync completion, and sync failures.
