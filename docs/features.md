# Feature Documentation

This document describes each user-facing feature and the code/backend pieces that implement it.

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
- Settings can update name and date of birth.

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
- `components/settings/InviteCode.tsx`

Backend:

- `profiles`
- `milestones`
- `space_invites`

Behavior:

- Settings displays profile name, date of birth, shared milestone, invite code, and sign out.
- Name and date of birth use `AuthProvider.updateProfile`.
- Shared milestone uses `useMilestoneStore.upsertMilestone`.
- Sign out clears Supabase auth, offline SQLite cache, and the stored active space ID.

Offline behavior:

- Shared milestone can be updated offline.
- Name and date of birth currently require online profile update requests.
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
- Expenses include amount, currency, title, category, and paid date.
- Expenses store both the creator and the payer. The payer can be the current user or partner.
- The log can show both partners together or only the current user's expenses.
- The log opens to day view by default and can switch between day, week, and month views, with previous/next period navigation. The current day label is Today.
- Adding an expense while viewing a specific log day starts the expense form date picker on that selected day.
- The expense form date picker labels the current day as Today and shows adjacent rows as full dates.
- Payer buttons use each person's avatar border color, and the partner payer option shows the partner's profile name when available.
- Default categories are Food, Health, Medical, Bills, and Transport.
- Categories can be added, renamed, recolored, and deleted. Deletes are soft deletes; existing expenses keep category snapshots.
- Breakdown view supports daily, weekly, monthly, and yearly periods, with previous/next period navigation. Weekly periods start on Monday.
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

Routes:

- `app/(tabs)/(gallery)/gallery.tsx`
- `app/(tabs)/(gallery)/galleryContent.tsx`

Hooks:

- `hooks/useGalleryList.ts`
- `hooks/useGalleryContent.ts`

Store:

- `stores/GalleryStore.ts`

Components:

- `components/gallery/AddNewGalleryModal.tsx`
- `components/gallery/GalleryListControls.tsx`
- `components/gallery/GalleryListGrid.tsx`
- `components/gallery/GalleryItem.tsx`
- `components/gallery/GalleryControls.tsx`
- `components/gallery/GalleryImageGrid.tsx`
- `components/gallery/GalleryImageItem.tsx`
- `components/gallery/GalleryImageViewerModal.tsx`
- `components/gallery/GalleryEditControls.tsx`
- `components/gallery/DeleteImagesModal.tsx`

Backend:

- `galleries`
- `date_images`
- Storage bucket `gallery-private`
- Edge Functions `sign-gallery-cover-urls`, `sign-gallery-urls`, `delete-gallery`

Gallery list behavior:

- Gallery list supports search, sort ascending/descending, pull-to-refresh, and pagination.
- Search is debounced for 300 ms and uses `ilike("title", "%search%")` online.
- Gallery pages are keyset-paginated with page size 10 using `date` and `id`.
- Cover thumbnails are signed in batches through `sign-gallery-cover-urls`; per-path storage signing is used as fallback.
- Gallery cards show cover thumbnail, location, title, and the selected gallery color as a translucent background.

Create gallery behavior:

- The add modal requires name, location, color, date, and at least one image.
- It creates a `galleries` row, then uploads images.
- Date is sent as ISO string in `galleries.date`; `date_date` is also derived as `YYYY-MM-DD`.
- Selected images are deduplicated by URI in the modal preview.

Image upload behavior:

- For each image, the app inserts a `date_images` row first to get an image id.
- `generateVariants` produces thumb, grid, and original JPEG variants.
- `generateBlurhash` creates a blurhash from the thumbnail.
- Images are stored at:

```text
spaces/{spaceId}/galleries/{galleryId}/images/{imageId}/thumb.jpg
spaces/{spaceId}/galleries/{galleryId}/images/{imageId}/grid.jpg
spaces/{spaceId}/galleries/{galleryId}/images/{imageId}/orig.jpg
```

- Upload concurrency is 3 images at a time.
- A progress toast tracks completed uploads.
- If upload or row update fails, the app removes already uploaded storage paths and deletes the image row.
- If the gallery has no cover, the first uploaded image becomes the cover.

Gallery detail behavior:

- Image pages are keyset-paginated with page size 20 using `created_at` and `id`.
- Image rows are signed through `sign-gallery-urls` and merged with `url_thumb`, `url_grid`, and `url_orig`.
- Tapping an image opens a full-screen zoomable viewer.
- The viewer requests more images when the user nears the end.
- Sort toggles local display order by `created_at`.
- Long-press enters edit mode if online.
- Selected images can be downloaded to a `BubuDudu` device album or deleted.

Delete behavior:

- Deleting one image removes its three storage variants and deletes the `date_images` row.
- If the deleted image is the gallery cover, the app selects the newest remaining image as replacement or clears the cover.
- Deleting a gallery first invokes `delete-gallery` for server-side cleanup.
- If the function is unavailable, the client falls back to deleting image storage paths, image rows, and finally the gallery row.

Offline behavior:

- Gallery metadata and image rows are cached for offline reading.
- Missing image URLs are hidden offline; cached signed URLs may still work until they expire.
- Gallery creation, uploads, image deletes, gallery deletes, and downloads are blocked offline.

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
