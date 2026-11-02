# Private gallery storage: Supabase + R2

R2 storage, the daily backend and queue-only deletion handlers are deployed to BubuDudu (`hcrezrypvkmtzxldvsvm`). Historical migration completed on **2026-11-01 at 23:37 SGT**: **732 images, 2,196 objects**. After the user confirmed historical photos display correctly and explicitly authorized source removal, **all 2,196 verified Supabase source copies were removed on 2026-11-02 at 00:31 SGT**, with independent source-absence and R2 checksum/signed-read verification. The three excluded unreferenced Supabase objects remain. The ten earlier deleted R2 objects are independently confirmed absent. The first genuine scheduled daily cleanup run and agent-performed post-source-cleanup device testing remain unverified.

## Historical Supabase source cleanup completed - 2026-11-02, 00:31 SGT

- **Authorization and preflight:** explicit production source-removal authorization followed the user's confirmation that migrated historical photos display in the app. Correct project link, secure local R2/backend credential availability, deployed R2 destination digests and retained migration evidence hashes were verified. Current state matched the migration checkpoint: all 732 images ready on R2, identical keys/metadata, valid covers across 27 galleries, 23 completed receipts, zero pending work and no active gallery mutation/write lock. A read-only canonical-key reference audit across all 19 public application tables found target references only in their owning ready R2 image paths and valid covers; no receipt/other consumer conflicts existed. No migration was repeated.
- **Dry-run and immutable scope:** every one of the 2,196 proposed R2 copies passed a fresh authenticated GET, exact byte count and SHA-256 comparison against the historical manifest. Zero missing copies/mismatches; database and Storage snapshots were unchanged. An explicit read-only deletion manifest records each bucket/source key, image/gallery/variant, size/hash, matching R2 key and provider, plus exclusions/baseline. **2,196 unique entries / 1,077,326,458 bytes**, SHA-256 **`2e055e9281a80be87b37308dec66d2d5d79a3a4631e55f33dbf5909b931066ad`**. The three previously identified unreferenced objects were excluded.
- **Actual removal:** the focused source cleanup script below used only official `storage.from('gallery-private').remove(exactKeys)` calls: **22 serial batches**, at most 100 keys (last batch 96). Apply repeated a full R2 verification before the first removal and refreshed checksums/references/state before each batch. Intent and verified per-key results were saved atomically outside Git. All **2,196 API acknowledgements** were reconciled with individual authenticated Storage absence checks; **zero failed/skipped/unresolved target keys**. No prefix/bucket deletion or direct `storage.objects` SQL mutation occurred.
- **Independent post-cleanup proof:** all **2,196 sources** again returned authenticated missing-object responses; the exact Storage inventory contains only the three exclusions. All **2,196 R2 objects / 1,077,326,458 bytes** passed full SHA-256 again through backend-helper signed GETs using existing membership authorization. All **732 image/original read signatures** and **27 cover paths** worked. Full R2 key/size/ETag inventory is identical to its fresh pre-cleanup inventory; there were no R2 writes.
- **Preservation:** all 732 image records and all 27 gallery records, including IDs, cover references, dimensions, bytes, BlurHashes, timestamps and provider/revision, are identical before/after. All remain ready on R2. The three excluded source objects independently return HEAD 200, have their original metadata/IDs/timestamps, and total **1,280,980 bytes**. The private gallery bucket still exists; bucket definitions, other Storage fingerprint (including all **60 avatar objects / 31,809,210 bytes**), RLS/RPC fingerprints and all 23 completed receipts are unchanged. Zero pending deletion receipts. A final read-only snapshot after post-verification matched the post-removal snapshot exactly apart from observation time; comparisons decode UTF-8 explicitly.
- **Usage:** `gallery-private` fell from **2,199 objects / 1,078,607,438 bytes** to **3 objects / 1,280,980 bytes**, removing **1,077,326,458 bytes** from the logical object inventory. All buckets together now report **33,090,190 logical object bytes**. These figures come from current Storage metadata and independent API presence/absence checks. **Billing/dashboard usage was not independently retrieved** and may lag; no exact refreshed billing value is claimed.
- **Schedule/boundaries:** job **5**, `bubududu-gallery-daily-cleanup`, remains active at **`0 19 * * *` UTC / 03:00 Singapore daily**; no job was added or changed. No function deployment, SQL migration, application database mutation, R2 deletion, receipt clearing, image processing change, commit or push. Credentials remained ignored/untracked and the evidence scan found no secret material. Existing Node deprecation notices were informational; there were no operational cleanup errors.
- **Validation/evidence:** **10 focused cleanup Deno tests**, Deno type/lint/format checks, `git diff --check`, full dry-run, per-batch reconciliation and independent final checks passed. Files added: `scripts/cleanup-migrated-supabase-gallery.ts` and its focused `.test.ts`; this document and the gallery summary in `docs/features.md` were updated. Evidence is outside Git at `C:/Users/David/Documents/BubuDudu Migration Reports/2026-11-01-supabase-source-cleanup/`: `complete-cleanup-report.json`, read-only `deletion-manifest.json`, `cleanup-progress.json`, dry-run summary, full post-verification, R2 inventories and before/after/final SQL snapshots. Retain both migration and cleanup evidence.

The user's pre-cleanup app confirmation and backend signed reads do not establish post-cleanup device validation. Refresh/reopen galleries on both accounts, inspect covers/thumbnails/viewer, download a historical original and reopen the app. Source removal ends immediate provider-only rollback: restoring Supabase reads requires copying verified bytes back from R2 first. No restore was attempted.

## Historical migration completed - 2026-11-01, 23:37 SGT

- **Cleanup gate resolved.** The user's ignored `.env.r2.local` supplied the four R2 fields to private subprocesses only. Authenticated bucket HEAD/list succeeded, local account/bucket matched the deployed target by digest comparison, and independent HeadObject requests returned **404 for all ten previously deleted keys**. All **23 deletion receipts** are completed and retained; pending deletions, abandoned uploads and deleting galleries are zero. This supersedes the blocked 22:12 checkpoint below; no additional cleanup invocation was made.
- **Inventory/dry-run:** 27 galleries, 732 ready Supabase-backed images, **2,196 referenced JPEG variants / 1,077,326,458 bytes**, no missing/incomplete variants or invalid covers. The private Supabase bucket contains **2,199 objects**. The three extras are canonical thumb/grid/orig objects for one absent image row whose gallery still exists, totaling **1,280,980 bytes**. They were excluded and preserved, not assigned to another image or deleted. The initial R2 inventory was empty. A full dry-run downloaded/checksummed all referenced sources, with zero failures and no provider/R2/source changes.
- **Pilot:** gallery `18885c39-aed2-41d3-bed8-97e3d520ee6d`, two images, six objects, 2,766,637 bytes. Copy checksums, independent destination checksums, source checksums, backend signed reads and its cover passed before expansion. All source and unrelated database state remained unchanged.
- **Expansion:** the unchanged `scripts/migrate-gallery-r2.ts` processed the remaining inventory using its existing 100-row pages, serial transfers and per-image report checkpoints. **730 newly migrated**, two already-migrated pilot rows skipped, **zero failed images**. Each provider switch occurred only after every referenced variant matched size and SHA-256; the guarded RPC incremented only provider/revision state. Existing identical destination files are reusable on resume; different bytes fail closed. No recompression, source deletion or upload architecture change occurred.
- **Independent final checks:** authenticated R2 listing contains exactly the manifest's **2,196 keys / 1,077,326,458 bytes**. A separate two-worker verifier used existing membership authorization and the backend signing helper, then HEAD/read-checked every object: **2,196 R2 HEADs and signed GETs succeeded; every downloaded SHA-256 matches the dry-run/copy manifest**. Source/destination sizes and JPEG content types match. All **27 existing cover paths** have successful signed reads. These are backend helper/read checks, not normal-user JWT Edge invocation or Android/iOS visual validation.
- **Preservation:** all **2,199 Supabase objects** independently returned successful HEADs (the pilot also rechecked full source hashes). Source object IDs, metadata and timestamps match the baseline. All 732 image IDs, paths, dimensions, byte counts, timestamps, BlurHashes and other fields are unchanged except `storage_provider='r2'` and one revision increment; all remain ready. All 27 galleries/covers, other Storage objects, RLS policies, original storage RPC, 23 receipts and Cron definitions match the baseline. A final read-only snapshot after the independent verification was identical to the post-copy snapshot. Remaining ready Supabase image rows: **0**.
- **Operations/security:** no SQL migrations, function deployments, Vault/API-key changes, receipt clearing, extra jobs, Cron edits, commits or pushes. Job **5**, `bubududu-gallery-daily-cleanup`, stays active at **`0 19 * * *` UTC / 03:00 Singapore daily**. The first real scheduled execution is still due 2026-11-02 03:00 SGT at this checkpoint. The credentials file remains Git-ignored/untracked; credential scanning found no secret material in operational reports. Existing Node `punycode` deprecation and CLI update notices were informational; there were no migration errors.
- **Validation:** six focused migration Deno tests and four PostgreSQL R2 tests passed; the migration entrypoint/core passed Deno type checking. Live full dry-run, pilot, copy/checksum comparison, independent reads, source preservation and before/after invariants passed. No unrelated test suite or device build was run.
- **Retained evidence:** `C:/Users/David/Documents/BubuDudu Migration Reports/2026-11-01-historical-r2/complete-migration-report.json`, `migration-manifest.json`, dry-run/apply reports, independent HEAD/signed-read verification, inventories and before/after snapshots. These contain private IDs/checksums but no credentials, signed URLs or image bytes; keep them outside Git. Working evidence remains under `%TEMP%/bubududu-r2-migration-20261101`.

At this migration checkpoint every Supabase original was retained. The user subsequently confirmed historical photos display correctly and separately authorized the source cleanup recorded above. Post-cleanup device visual/download/reopen checks remain manual; retain all migration/cleanup reports and use newly uploaded disposable photos for any deletion testing.

## Daily backend cleanup - production backend cutover complete

The user reports Android upload/read/deletion validation of the previous correction. On 2026-11-01, the daily migration/function/schedule were deployed, followed by the three queue-only user handlers under explicit authorization to cut over before the first scheduled run. Physical cleanup no longer runs from these user endpoints, including when an older installed client sends cleanup requests. The updated app source removes polling; installation/device testing is separate.

**Lifecycle.** Single/batch/gallery deletion and upload abort only authenticate, authorize and commit deletion state plus receipts, then return 202. No physical object deletion or parent finalization runs in these user requests. Ready-only visibility and transactional cover replacement remain unchanged. The app removes acknowledged images/galleries immediately, reconciles rejected/ambiguous requests, and can close afterward. The cleanup hook and gallery-visit invocation are removed. Old clients' `gallery-upload cleanup` calls become authenticated no-ops after backend rollout.

**Backend.** One `bubududu-gallery-daily-cleanup` job invokes `gallery-daily-cleanup` at **03:00 Asia/Singapore (UTC+8)** daily: **`0 19 * * *` UTC**, on the preceding UTC date. It does not need a mobile user/session. Existing `gallery_storage_tombstones` receipts are extended, not replaced. Deleting rows/receipt keys remain until every distinct authorized variant is deleted. Provider, relationship, eligibility, attempt count, lease and last failure stage are durable. The additive migration backfills already-deleting Supabase/R2 rows and preserves old R2 receipts/keys; receipts whose image row was already finalized are retained as completed. No ready historical photo is migrated or queued.

The original five-minute PUT deadline plus two-minute drain is unchanged and never restarted by Delete. A photo initialized at 02:59 and queued before 03:00 is skipped until the following daily run. Legacy Supabase images without PUT deadlines are eligible immediately but still wait for backend cleanup. Expired abandoned pending uploads are marked deleting in bounded batches by the backend.

**Authentication.** A dedicated project secret API key named **`gallery_cleanup`** is required. `@supabase/server@1.9.2/core` validates `auth: 'secret:gallery_cleanup'` before constructing its admin client. This is the official library's authentication primitive; the core entrypoint avoids the wrapper's CORS import, which is incompatible with the older pinned gallery SDK. The existing SDK remains pinned. Only this new endpoint uses `verify_jwt=false`; existing user-facing functions keep JWT verification enabled. Missing/wrong keys, publishable/default keys and user JWTs are rejected. Work requests may only be empty/`{}`. An authenticated `{"action":"status"}` diagnostic reads aggregate counts only; it cannot claim work or delete objects. Callers cannot supply object keys, spaces, deadlines or batch limits. The privileged client is server-only and used only for cleanup RPCs and gallery-private deletion.

**Reliability.** Service-only RPCs claim pages of five receipts with `FOR UPDATE SKIP LOCKED` and three-minute leases. Finalization checks the token/lease, deadline and deletion state under the existing parent-before-child locks. A stale owner cannot finalize or reset another claim. At most 100 receipts are claimed; new work stops after 45 seconds. Individual network/RPC requests time out after ten seconds; reporting/failure release can extend the total run beyond the work budget. Unprocessed leases expire after interruption. Object or metadata failures retain work, release the lease with a one-hour retry backoff, and retry on the next daily run; independent receipts continue. Missing objects are idempotent, including partial thumb/orig or historical three-variant progress. Flagged parents are removed only after all children, including empty galleries. Completed R2 receipts are retained and become eligible for a defensive recheck after 23 hours, through the same daily job; completed Supabase receipts are retained without further polling. No second schedule/queue/worker is introduced.

The summary logs execution ID/time, eligible/skipped counts, completed/rechecked/failed receipts, remaining pending/eligible/recheck counts, pending parents/abandoned uploads, acknowledged object removals and duration. `objectsRemoved` counts successful deletion acknowledgements (404/empty results count zero); S3 may acknowledge a nonexistent key with 204, so it is not a byte-level audit of previously existing objects. HTTP 500 means cleanup/inventory failed; 202 means pending work remains (including young skipped receipts or due rechecks); 200 means no pending deletions, parents, abandoned work or due rechecks remain. A bounded run can take several days to drain a large backlog; retained receipts and fair next-attempt ordering prevent discarding it.

### Manual cleanup and historical migration gate - 2026-11-01, 22:12 SGT

- Under a new explicit once-only authorization, invoked the unchanged `gallery_daily_cleanup_dispatch()` exactly once. pg_net request **42**, execution **`30add5e5-66ff-48e5-b24e-f733f3f6f9dd`**, HTTP **200**, `ok=true`, `complete=true`, duration **2.420 seconds**. No functions, credentials, schedules or locks were altered.
- All five previously skipped R2 deletions were eligible and processed: **5 newly completed, 10 successful R2 DELETE acknowledgements, 0 failed/skipped, 0 remaining pending receipts, 0 deleting galleries**. Exact-ID read-only checks confirmed all five image rows and their deleting gallery were removed. Receipts remain **23 total**, all completed, intentionally retained; their keys/provider/deadlines are unchanged. The five attempt counters each advanced once and all leases were released. The other 18 receipts were unchanged.
- All **732 Supabase-backed ready images** retained identical metadata fingerprints. Ready R2 image count is **0**; historical gallery count is restored to **27**. Cron job **5** remains active at **`0 19 * * *` GMT**, with no duplicate or command/timing changes. The first genuine scheduled run is still due **2026-11-02 03:00 SGT**.
- **Migration gate not passed.** Independent HEAD/authoritative R2 absence checks for the ten keys could not be executed: R2 S3 credentials/Cloudflare token were unavailable in the process and checked project environment files; no existing Wrangler credentials or R2/Cloudflare Vault credentials were available. The server-side cleanup credentials worked, but those DELETE acknowledgements are not an independent object inventory check. No object absence is claimed from HTTP 200 alone.
- Per the explicit gate, stopped before historical migration preflight/dry-run/apply. **0 historical images/objects/bytes migrated.** No Supabase source cleanup, source mutation, recompression, provider switching, function deployment, extra cleanup invocation, commit or push occurred. The three additional Supabase objects were not investigated because the migration inventory phase was gated off.
- Local operational evidence (no credentials): `%TEMP%/bubududu-cleanup-gate-6ce234cf-report.json`; the five-image/ten-key independent-check manifest is `%TEMP%/bubududu-cleanup-gate-6ce234cf-object-checks.json`. Existing SQL snapshot and row checks validated receipts, ready metadata and Cron invariants. No application source changed or device visual test was performed. Completing the independent R2 check requires a usable authenticated read path; historical copy/checksum work will also require the existing R2 credentials through a private server-side environment, never chat or Expo.

### Production user-handler cutover - 2026-11-01, approximately 21:50 SGT

- **Backend cutover complete**, explicitly authorized without waiting for the first 03:00 run. Target/link/project verified as `hcrezrypvkmtzxldvsvm`; branch `migrate-photos` and the existing uncommitted working tree were preserved. No migration, Cron setup, Vault or API-key operation was repeated.
- Deployed only `delete-gallery-images` **v5**, `delete-gallery` **v14**, and `gallery-upload` **v5**. All are **ACTIVE**, all retain **verify_jwt=true**. Each rejected missing, invalid and anonymous API-JWT authentication with 401. There were no deployment errors (only the existing CLI deprecation/update notices).
- Downloaded deployed source to a separate temporary directory and compared ten entrypoint/handler/shared-helper files against local source; all match. Single/batch/gallery deletion and abort only call the authorized marking RPC and return 202; no object deletion/finalization is called. Atomic cover replacement, provider-aware receipts, ready-only visibility and original seven-minute eligibility remain unchanged. Upload initialization/finalization and read signing are preserved.
- `gallery-daily-cleanup` stays **v1 ACTIVE** with the same bundle hash and named-secret authentication. Signing functions remain v12; expense/calendar functions, their hashes/versions/auth settings and all unrelated database/Cron state are unchanged.
- Cron job **5**, `bubududu-gallery-daily-cleanup`, remains the sole matching active job, schedule **`0 19 * * *`**, effective timezone **GMT**. Next execution remains **2026-11-02 03:00 SGT / 2026-11-01 19:00 UTC**. Genuine run history was still empty. No production-wide cleanup or disposable production fixture was invoked/created; actual scheduled object deletion is **not yet verified**.
- Before/after read-only comparisons preserved all **27 galleries, 732 ready Supabase images and 18 existing R2 receipts**, including exact image/gallery metadata and receipt key/relationship fingerprints, original RPC, RLS policies, unrelated columns, and all Cron command/schedule/activity fingerprints. There are zero pending deletion rows/abandoned uploads/deleting parents at this checkpoint; 18 completed R2 receipts remain due for defensive rechecks.
- Compatibility: the existing endpoint request bodies and `{ok:true}` 2xx contract remain compatible with earlier R2 clients. Older polling receives authenticated `{ok:true,managedBy:"daily-backend"}` without physical cleanup. Original SQL guards continue rejecting client changes/deletes of queued/R2 state, so an old client cannot erase queued cleanup evidence. Older pre-R2 builds may retain stale gallery UI/provider limitations and need updating; no assumption was made that both partners already have current JavaScript. Installed-version/iOS compatibility was not device-tested; no iOS installation/distribution was performed.
- Local validation rerun: **83 Jest tests in seven focused suites**, **30 Deno/PostgreSQL tests**, focused TypeScript, six Edge Function checks, targeted ESLint/Deno lint and `git diff --check` passed. Tests cover queue-only provider/mixed/single/batch/gallery/abort behavior, covers, rejected requests, old cleanup no-op, no app polling, leases, safety deadlines, partial failure/retry and idempotency.
- Android: `adb devices -l` returned **no connected device**. No build/install/Metro process was started. Connect and authorize the intended device, then use the existing SDK setup and `npm run android:dev` below. The app source includes 202 acceptance/reconciliation and no startup/foreground/reconnect/60-second cleanup calls. This is not a device validation claim.
- This cutover changed only this document and the gallery summary in `docs/features.md`; no application/source fix was needed. No historical migration, manual photo/receipt deletion, database reset, timing change, extra recurring job, commit or push occurred.

Manual verification with the updated app: upload disposable photos and delete one at 2-3 minutes; expect immediate disappearance/202 and a durable deleting receipt, with physical files retained. Test a cover/batch and whole-gallery deletion; verify replacement covers and no gallery resurrection on refresh. Close both apps. After an eligible 03:00 backend run, inspect the real cleanup summary and verify both R2 variants (all historical Supabase variants for disposable fixtures), image metadata and flagged parent are removed in order. A photo initialized less than seven minutes before the run must wait for the following daily run. Monitor job 5, pg_net response and pending counts using the SQL below; investigate fixed failure stages without clearing receipts. A successful deployment is not proof that this scheduled physical path has run.

### Earlier backend deployment checkpoint - 2026-11-01, approximately 21:40 SGT

- Target: authenticated CLI/project link/app project all agree on `hcrezrypvkmtzxldvsvm`, BubuDudu, Singapore. Branch `migrate-photos`, HEAD `5b76fce81f225dab9015d47b9af35e94018cc62a`; existing working-tree changes remain uncommitted.
- API key correction: the actual project key is named **`gallery_cleanup`** (underscore). The handler, test key map and instructions now use `auth: 'secret:gallery_cleanup'`. The cron job name remains hyphenated. No API key or Vault entry was created, renamed, rotated or modified by this deployment.
- Preflight: CLI dry-run/history showed only `20261101000000_gallery_daily_cleanup.sql` pending. The two Vault names each exist once, the URL equals the intended project, and the key has the expected secret-key format; only boolean checks were emitted. `pg_cron` 1.6, `pg_net` 0.14.0 and Vault 0.3.1 were already installed. Effective `cron.timezone=GMT` and database `TimeZone=UTC` were verified.
- Migration applied successfully with `db push --linked --skip-vault --yes`; migration history is synchronized. All 27 galleries, 732 ready Supabase images and 18 prior R2 receipts remain. Gallery/image metadata and original receipt relationship/key fingerprints matched before/after, as did RLS policies, the original gallery RPC, unrelated public columns and pre-existing cron jobs. The eight additional receipt columns, provider constraint, indexes, enabled receipt trigger and service-only RPC permissions were verified. All 18 prior receipts are retained as completed; there are zero pending deletions/abandoned uploads/deleting parents and 18 due defensive R2 rechecks.
- Only `gallery-daily-cleanup` was deployed: **v1 ACTIVE**, `verify_jwt=false`, independently authenticated by the exact named secret. All five user-facing gallery functions retain `verify_jwt=true`. Nonmutating live probes: missing/invalid/publishable/valid-other-secret keys returned 401; valid anonymous JWT-only and a user-JWT-shaped header without a key returned 401; the actual named key with a rejected probe body returned 400. No genuine normal user JWT was supplied/extracted; the endpoint accepts only the named secret, regardless of bearer presence. Unit tests also cover the user-JWT-only rejection path.
- A Vault-backed `net.http_post` with `apikey` and `{"action":"status"}` produced pg_net request **40**, HTTP **200**, `ok=true`, `mode=status`, `readOnly=true`, no timeout/error, and the expected aggregate counts. This verifies Vault resolution, pg_net delivery, named-key authentication and privileged read access without calling prepare/claim/delete/finalize. It is **not** a scheduled cleanup execution.
- Setup SQL activated exactly one job: **ID 5**, `bubududu-gallery-daily-cleanup`, **`0 19 * * *`**, active, owned by postgres. The job invokes the private dispatcher, which reads Vault and sends an `apikey` header with `{}` to the correct endpoint. Dispatch source/permissions were verified without printing secrets. Other job IDs 1, 2 and 4 retain their prior schedules, activity and command fingerprints. No additional periodic job was created.
- Genuine run history was empty at verification. First scheduled run: **2026-11-02 03:00 SGT / 2026-11-01 19:00 UTC**. No manual production-wide cleanup, isolated data creation/deletion or historical migration was performed. A successful schedule definition and read-only probe do not prove the physical cleanup path; no waiting for the next run was performed.
- **Cutover withheld:** `delete-gallery-images` remains v4, `delete-gallery` v13, and `gallery-upload` v4, with the same deployed bundle hashes observed before this deployment. They retain the prior functioning cleanup behavior. Signing functions remain v12; unrelated function hashes/versions/settings were unchanged. Do not release/load the cleanup-free app solely on the strength of this diagnostic. Older installed clients continue using the retained handlers; after the eventual cutover their old polling calls become authenticated no-ops.
- Edge log inspection through the installed CLI is unsupported. A read-only Dashboard inspection was attempted using the computer-use skill, but its tool stopped because URL policy enforcement is unsupported for the current Firefox browser. No browser inputs followed. Inspect Dashboard > Edge Functions > gallery-daily-cleanup > Logs alongside pg_net responses and Cron history at the first real run.
- Local revalidation after the name correction/status diagnostic: **83 Jest tests**, **30 Deno/PostgreSQL tests**, focused TypeScript, six Edge entrypoint checks, targeted ESLint/Deno lint and `git diff --check` passed. The diagnostic adds one regression test proving it cannot claim/delete work. No Android build/process, commit or push was started.

At this earlier checkpoint the handler cutover was withheld. The user's later explicit instruction to deploy now superseded that timing condition, and the final cutover is recorded above. Verification of the actual scheduled physical cleanup remains outstanding.

### Controlled rollout and current status

Follow the official [scheduled functions](https://supabase.com/docs/guides/functions/schedule-functions), [Cron](https://supabase.com/docs/guides/cron), [service authentication](https://supabase.com/docs/guides/functions/auth#service-to-service-calls), and [pg_net](https://supabase.com/docs/guides/database/extensions/pg_net) documentation. The initial rollout retained the previous mechanism until the daily backend was deployed, authenticated and scheduled. The user then explicitly authorized the queue-only cutover before the first scheduled physical execution; it is complete as recorded above. The commands here are setup/reference instructions, not a request to repeat migrations, Vault changes or scheduling.

1. In the target project's Dashboard Settings > API keys, create a dedicated secret key named `gallery_cleanup` (not a publishable/anon key). The platform supplies named keys in `SUPABASE_SECRET_KEYS`; do not attempt to set this reserved variable with `supabase secrets set`. For local serving only, supply fake/test named key maps in an ignored environment file. Never expose a secret to Expo.
2. In Dashboard Vault, create `gallery_cleanup_project_url` with the target project's HTTPS URL (`https://hcrezrypvkmtzxldvsvm.supabase.co`) and `gallery_cleanup_secret_key` with that dedicated secret key. Enter values through the private UI, not a committed SQL literal or shell argument. Rotate the project key and corresponding Vault value together. Do not overwrite unrelated Vault entries. Restrict database-login access: pg_net temporarily places decrypted request headers in its internal request queue, as documented by Supabase.
3. Verify the CLI link/project and apply only the new additive migration after reviewing the dry run:

```powershell
npx supabase projects list
Get-Content supabase/.temp/project-ref
npx supabase db push --linked --dry-run --skip-vault
# Proceed only if the sole pending migration is 20261101000000_gallery_daily_cleanup.sql.
npx supabase db push --linked --skip-vault
npx supabase functions deploy gallery-daily-cleanup --project-ref hcrezrypvkmtzxldvsvm --use-api
npx supabase functions list --project-ref hcrezrypvkmtzxldvsvm
```

4. Confirm the new function is ACTIVE. Without a key, with a wrong/public key, and with a normal user JWT, POST must return 401 without cleanup. A valid named key with POST body `{"probe":true}` must return 400 (or GET must return 405), proving authentication without invoking cleanup. The authenticated `{"action":"status"}` path returns aggregate queue counts using the server-side client without prepare/claim/finalization or Storage calls. A 500 for the valid key indicates missing runtime key configuration; fix it before scheduling. Use a private HTTP client secret field; do not paste keys into saved commands/logs. Complete the controlled staging test below before a production run; a valid `{}` invocation processes ALL eligible queued work across spaces.
5. The separate SQL setup enables `pg_cron`/`pg_net`, verifies Vault entries, creates a privileged dispatch function and upserts exactly one named daily job. It does not modify unrelated jobs. Run consistently as the same `postgres` owner. Missing Vault entries fail the transaction; duplicates require operator review rather than silently deleting jobs.

```powershell
npx supabase db query --linked --file supabase/setup/gallery-daily-cleanup.sql --output json
```

6. Verify the named schedule, a genuine scheduled HTTP response, its Edge summary and queue progress. Cron SQL success alone means the HTTP request was enqueued, not that storage cleanup succeeded. Inspect the first 03:00 SGT run; the user explicitly authorized the already-completed handler cutover before that run.
7. The user-endpoint deployment below is already complete. Load/release the updated app JavaScript which removes foreground cleanup as appropriate; Android installation remains pending a connected device:

```powershell
npx supabase functions deploy delete-gallery-images delete-gallery gallery-upload --project-ref hcrezrypvkmtzxldvsvm --use-api
# User-controlled Android testing/release; do not run as part of this local implementation:
npm run android:dev
```

Existing user endpoints retain `verify_jwt=true`. Old app polling becomes a no-op after this switch; existing receipts remain compatible. Rollback: keep the daily job available while restoring the prior app/user endpoints; do not purge receipts or reverse the additive migration. Do not unschedule the job until another verified cleanup mechanism is functioning.

### Observation and controlled manual test

Run these read-only checks as an operator (no credential values selected):

```sql
select jobid,jobname,schedule,active from cron.job
where jobname='bubududu-gallery-daily-cleanup';
select d.runid,d.start_time,d.end_time,d.status,d.return_message
from cron.job_run_details d join cron.job j on j.jobid=d.jobid
where j.jobname='bubududu-gallery-daily-cleanup' order by d.start_time desc limit 10;
select public.gallery_cleanup_counts();
select storage_provider,count(*) from public.gallery_storage_tombstones
where completed_at is null group by storage_provider;
select last_error,count(*) from public.gallery_storage_tombstones
where completed_at is null group by last_error;
```

The dispatcher logs only the pg_net request ID in Postgres logs. Match that ID against `net._http_response` (`id,status_code,timed_out,error_msg,content,created`), and inspect the `gallery-daily-cleanup` Edge logs for the execution summary. pg_net responses are short-lived (six hours by default); inspect promptly. 401 means a missing/rotated/mismatched named key; SQL dispatch errors indicate Vault/extension configuration; `objects` means storage/network failure; `metadata` means finalization/lease/database failure. Unknown remaining counts indicate inventory failure, not an empty queue. A nonzero backlog is retained for the next daily run. No new analytics/logging table is used.

Controlled manual test **on staging with disposable fixtures only**:

1. Deploy the migration/daily function and queue-only user endpoints there; use that staging project's Vault URL in a staging copy of the setup script (the production script intentionally checks the exact production URL). Upload three photos, delete a cover/single image and a mixed batch; confirm 202, hidden images and valid replacement cover. Close the app immediately.
2. Invoke the staging endpoint with its dedicated named secret and `{}` through a private HTTP client. Before initialization + seven minutes, confirm skipped receipts and unchanged R2 objects. After the deadline, invoke again with the app closed: both R2 keys and all historical Supabase variants must be removed before image metadata; verify whole-gallery and empty-parent cleanup.
3. Repeat the request and overlap two invocations. Verify missing objects are harmless, leases are disjoint, stale owners cannot finalize, and counts remain consistent. Simulate a staging R2/Supabase variant failure and restore access: independent receipts complete, the failed receipt/keys remain, and retry after the one-hour backoff succeeds. Never weaken production credentials to simulate failures.
4. Test 02:59 initialization against a 03:00 run: it stays queued for the next daily run. Verify the scheduled execution with the app closed. Check old uploads/reads/authorization and avatars remain unchanged. Do not manually alter production rows/deadlines or clear receipts.

Local validation: **83 Jest tests (seven focused suites)** and **30 Deno/PostgreSQL tests** passed. Focused TypeScript, all six gallery entrypoint checks, changed-source ESLint/Deno lint, and `git diff --check` passed. PGlite executes the actual migrations/leases/roles and setup SQL with stubbed Cron/pg_net APIs; it does not run a real Cron worker or simulate independent PostgreSQL sessions. Mocked HTTP exercises named-key auth, timeouts, mixed providers, missing/partial objects, retries, metadata failures and bounded backlog. Hosted function deployment and Vault/pg_net read-only delivery are now verified as recorded below. The first genuine Cron cleanup, physical deletion pathway under this new endpoint and app-closed device test remain unverified.

Inspected: AGENTS.md, this storage document, the old cleanup hook and its OfflineProvider/GalleryStore call sites, gallery upload/delete handlers, shared auth/model/R2/storage/cleanup helpers, the deployed R2 migration/receipt schema, relevant focused tests and function configuration. Existing Cron references and official Supabase docs supplied setup context; no broad repository audit was performed.

Changed for daily cleanup: `stores/GalleryStore.ts`, `providers/offline-provider.tsx`, the three mutation handlers, shared `gallery-storage.ts`/`gallery-cleanup.ts`/`r2.ts`, `supabase/config.toml`, `deno.lock`, gallery endpoint/store tests, the PostgreSQL test fixture split, this document and `docs/features.md`. Added `supabase/functions/gallery-daily-cleanup/{index,handler,handler.test}.ts`, `supabase/migrations/20261101000000_gallery_daily_cleanup.sql`, `supabase/setup/gallery-daily-cleanup.sql`, `supabase/tests/gallery-daily-cleanup.test.ts`, `supabase/tests/gallery-test-db.ts`, and `tests/integration/gallery.cleanup-ownership.test.ts`. Removed `hooks/useGalleryCleanup.ts` and its polling tests. Other existing uncommitted R2 implementation changes were preserved.

## Previous foreground correction - 2026-11-01 (deployed history)

Historical record of the previous release. The current daily rollout and test procedure above supersede its foreground-only instructions and no-new-migration statement.

Manual device feedback now confirms new uploads, R2 objects, `r2` metadata and Android image display work. A separate deletion defect was confirmed through deployed source and **read-only** production SQL. No production rows/objects were changed during this investigation.

The affected image was authorized for upload at approximately 10:43:36 Singapore time, marked deleting at 10:45:13, and eligible for physical cleanup at 10:50:36. Its row was still `deleting` when inspected after eligibility, with a receipt retaining two unique keys. The original handler committed that state and replaced the cover, then converted the normal drain wait to HTTP 409. The client refreshed ready-only rows (hiding the image) and reported failure. This guard runs before R2 DeleteObject, so the initial symptom does not establish an R2 API failure. Raw invocation logs were not available through the installed CLI; read-only database state and the deterministic code path establish the acceptance/error mismatch.

Additional defects: retries only ran when visiting a gallery; cleanup did not finish a whole-gallery parent; queued galleries could reappear in list queries; stale receipt errors could block current row cleanup; post-acceptance refresh errors could be mistaken for deletion rejection.

Implemented fix:

- Once the authenticated marking RPC commits, return `{ok:true,deferred:true,remaining,failed,retryAt}` with **202 Accepted** if object/metadata cleanup is pending. Fully completed cleanup returns 200. Authorization, validation and marking failures still return errors. R2 failures after marking remain accepted/retryable, with sanitized IDs/stage/status logged and no credentials or signed URLs.
- Keep the five-minute PUT lifetime plus two-minute drain unchanged, measured from initialization, not from delete. Presigned PUTs can be reused until expiry; waiting prevents recreation of a just-deleted object, and retained receipts cover unusually late requests. There is no seven-minute sleep inside an Edge Function.
- The client hides only acknowledged deletions, reconciles server state after rejected/ambiguous requests, and does not convert a cache/read-refresh failure into a failed accepted deletion. The confirmation closes and clears selection for acceptance. Whole-gallery list reads exclude `storage_deleting=true` immediately.
- Existing `gallery-upload` cleanup now accepts an omitted `galleryId`: the authenticated user's memberships bound candidate gallery/image queries. It cleans up to 100 rows per gallery, finalizes deleting parents (including empty ones), then sweeps retained receipts. One failing receipt does not block other work; attempted receipts rotate through the existing hourly sweep.
- `useGalleryCleanup`, mounted by the existing OfflineProvider, retries on online startup, reconnect, foreground entry, and every 60 seconds while signed in, online and foregrounded. No gallery visit is needed, even if the deleted gallery was the last one. Calls do not overlap. Gallery visits also retain their existing scoped cleanup attempt. Closed/offline apps resume work next online foreground session; there is no new scheduler, worker, SQL table or native background service.
- Physical row removal still occurs only after every deduplicated object key succeeds (missing objects are idempotent). Partial R2 failures retain row/receipt keys; retries can remove a missing thumb again and finish orig. Supabase images and historical three-key images use the same lifecycle.

Local validation: **83 Jest tests in seven focused suites** and **22 Deno/PostgreSQL tests** passed. Coverage includes early/deferred acceptance, actual pre-mark rejection, R2 failures and partial-object retries, repeated requests, mixed/Supabase batches, whole-gallery finalization, cover replacement, receipt failure isolation, and online/foreground lifecycle retries. Focused TypeScript, Deno checks for all five gallery entrypoints, changed-source ESLint/Deno lint, and `git diff --check` passed. These use mocked storage HTTP and local PostgreSQL (PGlite), not production deletion. Android device validation of this correction remains pending deployment.

**That previous correction required no new SQL migration.** Its original deployed migration/RPC/receipts were unchanged. The following command was executed on 2026-11-01 with explicit deployment authorization; the app must load the updated JavaScript to gain periodic cleanup and reconciliation:

```powershell
npx supabase functions deploy delete-gallery-images delete-gallery gallery-upload --project-ref hcrezrypvkmtzxldvsvm --use-api
```

Deployment verification:

- Branch `migrate-photos`, HEAD `5b76fce81f225dab9015d47b9af35e94018cc62a`; the existing implementation is still uncommitted. App URL, local CLI project link and authenticated project listing all matched BubuDudu `hcrezrypvkmtzxldvsvm` (Singapore).
- Only `delete-gallery-images` v2, `delete-gallery` v11 and `gallery-upload` v2 were deployed. All report **ACTIVE**, with **verify_jwt=true**. Signing and unrelated function versions/update times were unchanged. No deployment errors; CLI emitted only an existing deprecated `[inbucket]` config warning and an available-update notice.
- For each deployed function, OPTIONS returned 200. Missing and malformed JWTs returned 401 at the gateway; a valid anonymous API JWT returned 401 `Invalid Authorization` from the handler. These requests used empty bodies, no normal user/service-role session, and did not reach storage/database mutation operations. No SQL migrations, historical migration, manual object/row deletion, commit or push occurred.
- The existing `npm run android:dev` workflow selected the connected Samsung SM_S942B, built successfully in 17 seconds, installed the development APK and issued its launch command. It selected port 8082 because 8081 was already occupied. At the user's request, the newly started Android/Metro process was stopped; port 8082 no longer had a listener and the pre-existing 8081 process was left untouched. The device disconnected before optional removal of the workflow's ADB reverse mapping, so that removal could not be confirmed. JavaScript bundle verification was interrupted by that stop. The source includes 202-compatible response handling, `useGalleryCleanup` mounted under OfflineProvider, and corrected deletion reconciliation, but **this correction has not been device-validated**. The user will run the workflow and tests themselves.

Manual validation using the updated development app:

1. Upload three disposable photos to a new test gallery. At 2-3 minutes, delete the cover and another image as a batch: they should disappear and the confirmation close without a failure alert. Confirm their server rows are deleting, receipt keys remain, and the surviving ready photo becomes the cover.
2. Stay online on another app screen until the PUT deadline plus two minutes and one cleanup tick (up to 60 seconds) have passed. Verify both thumb.jpg and orig.jpg disappear and the deleted image rows are removed. No repeated gallery visit is needed. This requires an active, normally signed-in app session.
3. Delete a whole disposable gallery shortly after upload. It must disappear without resurfacing on refresh; after the drain window, the foreground retry removes its objects, image rows and gallery row. Retry the same deletion request to verify idempotency.
4. On staging, simulate an R2 DeleteObject failure: expect accepted/pending cleanup with keys retained, then recovery on a later tick after restoring storage access. Reject a request before marking (nonmember/invalid IDs) and verify an error plus reconciliation, with ready images retained.
5. Check an existing Supabase image and a mixed-provider batch: eligible Supabase objects delete immediately; only recent R2 uploads defer. Use disposable fixtures for these destructive checks.
6. Background/close or disconnect during the wait, then reopen/reconnect after eligibility: cleanup should resume. Test covers, repeat requests and batch deletion. No production deletion was performed during local validation; the later authorized backend deployment is recorded above.

## Deployment verification - 2026-10-31

- Project: app URL, CLI link and authenticated project listing agree on `hcrezrypvkmtzxldvsvm` (BubuDudu, Singapore). Branch `migrate-photos`, HEAD `5b76fce81f225dab9015d47b9af35e94018cc62a`; existing implementation remains uncommitted.
- Preflight: CLI was authenticated; all four R2 secret **names** were present. The only pending migration was `20261031000000_gallery_r2.sql`; no seeds, role changes, Vault updates or unrelated migrations were applied. Live columns/generated `bytes_total`, membership policies, private gallery bucket and FKs were compatible; no incomplete variant paths, orphan image rows or invalid cover relationships were found.
- Database: migration applied successfully and migration history is now synchronized. Expected fields/defaults/checks, ready-only restrictive policy, enabled guards, receipt RLS and service-only RPC/receipt permissions were verified live.
- Existing data: all 27 galleries, 732 image records and 2,199 Supabase storage-object records remain. Original metadata fingerprints (excluding the additive lifecycle columns) and storage-object metadata fingerprints matched before/after. All 732 images remain `supabase/ready`; no cleanup receipts or R2 image rows were created.
- Functions: `sign-gallery-urls` v10, `sign-gallery-cover-urls` v10, `delete-gallery` v10, `gallery-upload` v1 and `delete-gallery-images` v1 are ACTIVE, all with `verify_jwt=true`. Unrelated expense/calendar function versions were unchanged. Live OPTIONS requests returned 200; missing/malformed JWTs returned 401 at the gateway, and valid anonymous API JWTs returned 401 from the handler's user check, confirming imports/runtime startup and Auth validation.
- Existing-photo migration preparation: the unchanged migration tool ran **dry-run only**, scoped to a two-image gallery. Six Supabase objects were downloaded/read and SHA-256 checksummed with zero failures. No R2 calls, provider changes or source deletes occurred. The local private-ID report is `%TEMP%/bubududu-r2-production-dry-run.json`. Existing backend credentials were kept in subprocess memory; no credential values were printed or saved.
- Local validation: 99 Jest tests (11 suites), 20 Deno/PostgreSQL tests, focused TypeScript, Deno checks, targeted ESLint and `git diff --check` passed. Android JavaScript/Hermes export passed (1,930 modules), and the regenerated native development APK built successfully (`:app:assembleDebug`, all four ABIs). No installation/distribution/device execution occurred.
- **Not yet verified:** real signed-in member R2 PUT/HEAD/finalize/GET/delete, actual R2 account/bucket/credential correctness, unsigned R2 access rejection, end-to-end existing-photo signing in the app, and device/offline/album behavior. Remote secret presence is not proof of successful R2 access. No normal app-user JWT was supplied and no Android device was connected. No service-role or fabricated-user bypass was used to claim application authorization worked.
- Do **not** start historical migration yet. Complete a disposable, normally authenticated device upload/read/delete cycle and the compatibility checks below first. Keep Supabase originals.

## Android development device check

The machine's `ANDROID_HOME` originally pointed one directory above its installed SDK. Use the actual SDK below for the current shell. Java 17, Android SDK 36, platform-tools and SDK manager are available there.

```powershell
Set-Location "C:\Users\David\Desktop\Personal Projects\BubuDudu"
$env:ANDROID_HOME = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
$env:Path = "$env:ANDROID_HOME\platform-tools;$env:Path"
adb devices
# Connect your intended test device, enable USB debugging, and approve its authorization prompt.
# Run this yourself when ready to build/install the development app on the selected device:
npm run android:dev
```

The dev identity is `BubuDudu (Dev)` / `com.vikeedough.bubududu.dev` / `bubududu-dev`, and it uses the verified Supabase project above. No app was installed or distributed by Codex. An already-installed dev client can instead use `$env:APP_VARIANT='dev'; npx expo start --dev-client --lan` (open it manually on the same network).

The first native build found stale generated calendar-widget XML referring to missing resources. The entire prior ignored `android/` directory was preserved at `C:/Users/David/AppData/Local/Temp/BubuDudu-android-before-r2-ea7b5db7`; Android was regenerated from the current Expo config with `APP_VARIANT=dev` and `expo prebuild --platform android --no-install`. Package/app configuration and dependencies were unchanged. The backup preserves earlier native experiments; no widget source was edited.

The native retry completed **BUILD SUCCESSFUL** in 4m 34s. APK: `android/app/build/outputs/apk/debug/app-debug.apk`. Android JavaScript export: `%TEMP%/bubududu-r2-android-export`. The successful native build command (with SDK environment set as above) was:

```powershell
$env:APP_VARIANT = 'dev'
Push-Location android
.\gradlew.bat :app:assembleDebug -PreactNativeDevServerPort=8081 --console=plain --max-workers=4
Pop-Location
```


Manual procedure (normal login; use only disposable photos for delete tests):

1. Log in normally. Open an existing Supabase gallery; check covers, grid, full viewer and a download into the BubuDudu album. Check unrelated avatars still load.
2. Create a uniquely named disposable gallery, e.g. `R2 smoke test 2026-10-31`, with three non-sensitive photos. Verify upload progress, completed thumbnails, cover and full viewer. Pending/failed images must not become covers.
3. In Supabase, inspect **only that test gallery**: new rows must be `r2/ready`, `storage_path_grid=storage_path_orig`, `bytes_grid=0`. In private `bubududu-gallery`, expect thumb.jpg and orig.jpg under each new canonical image prefix, with no separate grid.jpg. Successful finalization exercises server HEAD size/type verification; successful viewing/download exercises signed GET.
4. Check the other partner can view the test gallery, and a nonmember cannot request its images. Use ordinary user sessions, never service-role tokens to prove app authorization.
5. Reopen after backgrounding long enough to expire old URLs, then view/download again. Seed thumbnails online, reopen offline, verify cached browsing and blocked gallery writes, then reconnect.
6. Delete a test cover before seven minutes and confirm acceptance/replacement without an error. Stay online on another screen until the drain deadline plus one cleanup tick; verify objects are removed. Test batch and whole-gallery deletion on **disposable** data only. Do not delete old photos during deployment validation.
7. Only after these checks pass, review the historical migration dry-run and authorize a separate migration phase. Do not use `--apply` as part of deployment validation.

## Architecture and variants

Expo keeps Supabase Auth/Postgres. Existing `date_images` default to `storage_provider=supabase`; new app uploads explicitly use `r2`. Private GET/PUT URLs and deletes are authorized by Supabase Edge Functions. Credentials never enter the Expo bundle. Avatars are unchanged.

Canonical keys remain `spaces/{spaceId}/galleries/{galleryId}/images/{imageId}/{variant}.jpg`.

New images generate **two** JPEG files: thumb (1000px long edge, quality .70), orig (2000px, quality .90). The old 1600px grid was only a viewer fallback: grids/cards use thumb and the viewer/download uses orig. For compatibility, new rows set `storage_path_grid=storage_path_orig`, grid dimensions equal orig, and `bytes_grid=0` (no extra object). Historical three-file images retain all keys/bytes. Existing images are never re-encoded. No thumbnail/quality reduction was made. Covers reuse these objects.

Two images process concurrently; each uploads its two buffers sequentially, with a 90-second request timeout. Workers drain before reporting a batch failure. Successfully finalized images survive partial failure; new-gallery rollback is removed. An empty gallery after a wholly failed batch can be retried or deleted normally.

## Schema and security

Migration: `supabase/migrations/20261031000000_gallery_r2.sql`.

- `date_images`: constrained provider, `storage_state` (pending/ready/deleting), revision, upload deadline and expected metadata.
- `galleries.storage_deleting`: serializes deletion against initialize/finalize.
- `gallery_storage_tombstones`: service-only provider-aware deletion receipts. The daily additive migration retains old R2 receipts and adds Supabase/deleting-row coverage, eligibility, completion, retry stages and leases. No FK; gallery deletion cannot erase cleanup evidence. Retained until a separately reviewed purge.
- Existing rows and legacy client inserts default Supabase/ready. The restrictive SELECT policy hides incomplete/deleting images, composing with existing membership RLS.
- Definer triggers inspect the original database role, see hidden children, and block clients from forging R2/lifecycle state or deleting R2 records through image/gallery/space cascades. RLS does not protect columns by itself.
- Only service_role can invoke `gallery_storage_operation`. Each call rechecks a verified user's membership and locks the parent gallery. Finalization and cover updates are transactional; migration uses a full-row snapshot comparison including a revision.
- Caller JWTs are validated by `auth.getUser`, separately from gateway `verify_jwt=true`. Service clients never inherit caller authorization. Every storage key is validated against authorized space/gallery/image IDs. Cover signing checks actual authorized cover/image records, not just regex shape.

Prerequisites: existing `galleries`, `date_images`, `space_members`, membership RLS and FKs must match `docs/backend-data-model.md`. Verify live column types/defaults (especially generated `bytes_total`), policies and private bucket first using `docs/supabase-introspection.sql`. This additive migration does not rebuild legacy tables or modify their image metadata. It does not write `bytes_total`.

## Upload/read/delete protocol

`gallery-upload` actions:

1. `initialize`: caller supplies image UUID plus dimensions/byte sizes/BlurHash, never keys. Server creates an idempotent pending row and canonical 5-minute PUTs signed with JPEG Content-Type. Repeating the identity requires the same metadata; URLs cannot extend the stored deadline.
2. App PUTs directly to R2. Client retries once with the same image identity, including after a lost finalize response.
3. `finalize`: HEAD verifies both objects' sizes and JPEG content types against stored expectations. Protected RPC marks ready and selects a cover only if absent. Repeated finalize returns the same completed image. HEAD does not decode JPEG contents; migration additionally checks full SHA-256.
4. `abort`: marks pending rows deleting; never aborts completed images. Pending rows remain recoverable after app interruption. Client cannot mark them ready.
5. `cleanup`: authenticated compatibility no-op for older clients. Physical cleanup belongs exclusively to the dedicated scheduled backend after rollout.

`sign-gallery-urls` preserves `url_thumb/grid/orig`, adding `urls_expires_at` and user/space `cache_scope`; provider dispatch happens server-side. GET TTL is one hour. Covers retain the path-to-URL map. All direct client signing/deletion fallbacks are removed.

Opening the viewer or starting a download refreshes stale/missing signatures. Visible images schedule expiry refresh; failed image loads can refresh once. Downloads retry HTTP 401/403/expiry once. Reconnect refreshes the open gallery's URL state. Refresh errors do not trigger loops or convert finalized uploads into failed uploads.

Single/batch deletes call `delete-gallery-images`; whole-gallery delete calls `delete-gallery`. These mark rows deleting, atomically update the cover and retain provider-aware receipts, then return 202. They do not delete objects. The daily backend performs physical cleanup only after the unchanged PUT deadline plus two-minute drain, and removes gallery parents after their children. See the current daily section for rollout order and monitoring.

## Offline/cache behavior

SQLite version 6 adds provider/expiry/account scope without removing unrelated offline rows/outbox. Per-column checks allow an interrupted upgrade to retry. Only old unscoped gallery caches are discarded, because their account cannot be established. Photos recache after an online visit.

Cache reads require the current session user and space; Expo thumbnail/cover cache keys include user, space and immutable object key, independent of URL signatures/provider. Account changes clear gallery memory; stale asynchronous reads are rejected. The viewer continues using React Native Image; its full-image caching is platform-managed. Offline gallery is still view-only and best effort: metadata/URLs do not guarantee downloaded bytes, disk cache may evict, and uncached originals cannot be downloaded offline. Already-cached private bytes cannot be remotely revoked while a device is offline. There is no automatic photo export.

## Cloudflare configuration (user-configured)

1. Create a private R2 bucket. Keep **r2.dev public access and custom-domain public access disabled**. No Worker/custom domain is needed.
2. Create an account-owned R2 S3 API credential with **Object Read & Write**, restricted to that bucket. Keep the Access Key ID and Secret Access Key in a password manager/server secret store. No account-administration permission is required.
3. Set these server secrets: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`. Standard account S3 endpoint is used; this implementation does not configure jurisdiction-specific buckets.
4. For Expo web/browser validation, use a CORS policy like the following, replacing origins with actual trusted deployment origins. Native iOS/Android does not require browser CORS. CORS does not make the bucket public.

```json
[{"AllowedOrigins":["http://localhost:8081","https://YOUR-WEB-ORIGIN"],"AllowedMethods":["GET","PUT","HEAD"],"AllowedHeaders":["Content-Type"],"ExposeHeaders":["ETag","Content-Length","Content-Type"],"MaxAgeSeconds":3600}]
```

Docs: [R2 signing](https://developers.cloudflare.com/r2/api/s3/presigned-urls/), [aws4fetch](https://developers.cloudflare.com/r2/examples/aws/aws4fetch/), [credentials](https://developers.cloudflare.com/r2/api/tokens/), [CORS](https://developers.cloudflare.com/r2/buckets/cors/), [Supabase Auth](https://supabase.com/docs/reference/javascript/auth-getuser).

## Supabase rollout commands (deployment completed above)

Use a staging project/bucket first. Commands below are PowerShell, from the repository root; replace project ref locally. Do not print keys or use CLI debug logging. Store just the four R2 settings in the ignored `.env.r2.local` (no values are provided here).

```powershell
$galleryProjectRef = "YOUR-PROJECT-REF"
npx supabase link --project-ref $galleryProjectRef
npx supabase db push --linked --dry-run --skip-vault
# Inspect pending SQL. Proceed only if the migration list is exactly what you intend:
npx supabase db push --linked --skip-vault
npx supabase secrets set --project-ref $galleryProjectRef --env-file .env.r2.local
npx supabase functions deploy sign-gallery-urls sign-gallery-cover-urls gallery-upload delete-gallery-images delete-gallery --project-ref $galleryProjectRef --use-api
```

If the dry run lists unrelated pending migrations, apply only the reviewed gallery SQL via the SQL editor instead, and reconcile migration history separately. Do not use `--no-verify-jwt`. Built-in `SUPABASE_URL` and the backend key must be available: functions prefer `SUPABASE_SECRET_KEYS.default`, falling back to `SUPABASE_SERVICE_ROLE_KEY`. Never expose either backend key in Expo.

Deploy schema first, then all five functions, then the compatible app. Release both partners' compatible apps before enabling gallery writes or migration. Existing readers retain the old URL fields, but old clients cannot delete/update R2 metadata; their Supabase-only destructive fallbacks are incompatible and may display misleading local success. New app has no fallback. Keep Supabase originals throughout validation. No runtime remote feature flag is added; new uploads start using R2 once the updated client and configured functions are used.

## Existing-image migration

Tool: `scripts/migrate-gallery-r2.ts`. Requires Deno (or `npx --yes deno`), Supabase backend credentials, and, for apply, the four R2 credentials in the **operator's server environment**, never EXPO_PUBLIC variables. No .env file is automatically loaded. `--help` needs no credentials. Run reports outside source control: they include private object identifiers, not image bytes, URLs or keys.

```powershell
# Default is read-only with respect to BOTH cloud providers; writes a local report only.
npx --yes deno run --node-modules-dir=none --allow-env --allow-net --allow-read --allow-write scripts/migrate-gallery-r2.ts --gallery=GALLERY-UUID --report="$env:TEMP/gallery-r2-dry-run.json"
# After reviewing inventory/missing objects and validating the staging app:
npx --yes deno run --node-modules-dir=none --allow-env --allow-net --allow-read --allow-write scripts/migrate-gallery-r2.ts --apply --gallery=GALLERY-UUID --report="$env:TEMP/gallery-r2-apply.json"
```

Omit `--gallery` for all gallery image rows. Bucket inventory scans `gallery-private/spaces`, never avatars. The report associates image IDs/keys, identifies missing/incomplete variants and unreferenced inventory. Dry-run downloads sources to calculate SHA-256, so allow for Supabase transfer volume; it makes no R2 calls. No object count/size estimate is taken from the historical documentation.

Apply preserves exact object bytes, Content-Type and exposed cache/content metadata. It checks destination size and SHA-256 by downloading it; multipart ETags are not checksums. Existing identical objects are reused on resume. Different destination content fails closed rather than overwriting. Switch provider only after every referenced variant verifies, using a full-row compare under the same gallery lock as deletion. IDs, timestamps, dimensions, BlurHashes and cover keys are untouched. A failure after copying but before switching leaves tracked report entries; source remains authoritative. Resume re-reads live DB and destination rather than trusting a stale report. Preserve failed-run reports too; copies made during a concurrent deletion can require separate orphan reconciliation.

Recommended procedure: freeze both partners' gallery writes for a small batch, dry-run, fix missing/incomplete legacy records, apply one gallery, verify covers/viewer/download/delete/restart, then expand. Concurrent changes reject the provider switch; rerun inventory after resolving them. Existing R2 rows are skipped. No source object is ever deleted by this tool.

## Rollback and eventual source cleanup

Stop writes and retain mixed-provider functions/schema. Rolling back just the app to the old Supabase-only deletion code is unsafe.

For a migrated historical row, first verify every retained Supabase source matches the recorded checksum and current R2 bytes, then change only provider back to Supabase using an operator-only, reviewed transaction while writes are paused. For R2-only new uploads, copy exact referenced files back to private Supabase and verify them before switching provider. Do not drop lifecycle guards or rename IDs/keys. The forward migration command intentionally has no automatic rollback/delete mode.

After an observation period and separate approval, use retained reports plus a fresh live inventory to identify **only historical source objects whose current DB provider is R2 and whose destination checksums still match**. Back up the manifest, review covers/variants and rollback needs, then perform a separately reviewed source-only removal. Do not use bucket-wide deletion, automatically delete report entries, or delete keys for rows currently using Supabase. Keep the R2 deletion receipts until their own reviewed reconciliation. The separately authorized source cleanup tool below does not change the migration tool's preserve-source contract.

### Exact historical Supabase source cleanup

`scripts/cleanup-migrated-supabase-gallery.ts` is an operator-only cleanup, dry-run by default. It requires the retained migration directory, a new external deletion-manifest path, a durable progress-report path and a reviewed read-only snapshot helper. The helper emits current images/galleries/receipts, canonical-key references across every public application table, source object metadata, bucket definitions, other-storage fingerprint, public table names, RLS/RPC fingerprints, Cron definitions and active gallery write-lock count. It uses the operator's existing CLI login, with R2/backend environment credentials stripped from its subprocess. No database helper/RPC is installed.

```powershell
# Credentials must already be scoped to this private operator process, never Expo or logs.
deno run --node-modules-dir=none --allow-env --allow-net --allow-read --allow-write --allow-run=node scripts/cleanup-migrated-supabase-gallery.ts --migration-dir=PRIVATE_MIGRATION_DIR --manifest=PRIVATE_NEW_MANIFEST --report=PRIVATE_PROGRESS_REPORT --snapshot-helper=PRIVATE_REVIEWED_NODE_HELPER
# Only under explicit source-removal authorization, repeat those exact paths with --apply.
```

The dry-run compares historical image/gallery metadata, validates canonical three-variant paths/sizes and cover relationships, rejects conflicting references/receipt keys and verifies every R2 object by a fresh authenticated GET and SHA-256. Only a complete successful pass creates the deletion manifest; an existing manifest is never overwritten by dry-run. The manifest records exact source bucket/key, image/gallery/variant, expected bytes/hash, matching R2 key and current provider, with the protected exclusions and baseline snapshot. Its SHA-256 binds the progress report and is checked again before each batch.

Apply verifies all R2 copies again before any source removal. Each batch contains at most 100 exact manifest keys, refreshes R2 checksums, revalidates state immediately before removal, and persists intent before calling only `admin.storage.from('gallery-private').remove(keys)`. No R2 writes or application database writes exist in the tool. It independently checks each source after the response, records verified completions and unresolved keys, and stops on partial/error/unexpected acknowledgements. Resume revalidates current metadata, R2 bytes and previously completed source absence; missing sources after an interrupted request are reconciled idempotently. A changed image, gallery, receipt, protected source, bucket, policy, RPC, Cron definition or write lock fails closed.

On this Storage deployment, absent authenticated objects return HTTP 400 with structured `statusCode='404'`, `error='not_found'`, `message='Object not found'` (and `code='NoSuchKey'`). The tool confirms that body with a GET after HEAD 400; arbitrary 400, auth and transport errors are never accepted as object absence. Final reconciliation must also compare the exact remaining Storage inventory, independently checksum every R2 object again, test backend signing and preserve exclusions/other buckets/records/receipts/Cron. Inventory byte totals are logical object usage, not an assertion about immediately refreshed dashboard billing metrics. Source removal ends the option of switching back to Supabase without first restoring and verifying the originals from R2.

## Validation

```powershell
npx jest --runInBand tests/stores/GalleryStore.test.ts tests/hooks/useGalleryContent.test.ts tests/hooks/useGalleryList.test.ts tests/utils/gallery-storage.test.ts tests/utils/gallery-cache.test.ts tests/utils/gallery.test.ts tests/utils/generateImageVariants.test.ts tests/utils/shrinkImage.test.ts tests/utils/runWithConcurrency.test.ts tests/integration/gallery.open-delete-flow.test.tsx tests/perf/gallery.render-count.test.tsx
npx tsc --noEmit -p tsconfig.gallery.json
npx --yes deno check --node-modules-dir=none supabase/functions/gallery-daily-cleanup/index.ts supabase/functions/gallery-upload/index.ts supabase/functions/sign-gallery-urls/index.ts supabase/functions/sign-gallery-cover-urls/index.ts supabase/functions/delete-gallery-images/index.ts supabase/functions/delete-gallery/index.ts scripts/migrate-gallery-r2.ts
npx --yes deno test --node-modules-dir=none --allow-env --allow-read supabase/functions/_shared/gallery.test.ts supabase/functions/gallery-daily-cleanup/handler.test.ts supabase/tests/gallery-r2.test.ts supabase/tests/gallery-daily-cleanup.test.ts
git diff --check
```

Node 24's bundled SQLite executes the real cache migration in the cache test. PGlite (test-only, fetched into Deno's cache) executes actual PostgreSQL migration/roles/triggers; no live project or Docker is needed. Deno tests mock HTTP and do not need `--allow-net`; pinned server/test packages are recorded in `deno.lock`. `tsconfig.gallery.json` avoids the root app config's pre-existing inclusion of Deno sources; Deno checks those separately.

Local tests cannot establish deployed schema/RLS, real R2 headers/presigning, Auth signing-key/gateway settings, CORS, device memory/decoding, photo-library permissions or true multi-connection database races. On staging: test both accounts and a nonmember, legacy/mixed galleries, portrait/landscape/small images, expired URLs, interrupted/partial uploads, immediate deletion plus retry after seven minutes, concurrent finalize/delete, failed storage requests, migrations/resume, logout/account switch, and offline restart after seeding caches. Inspect receipts and both providers' inventories. Then repeat iOS/Android album saves and web CORS if supported. Avatars must continue using Supabase unchanged.

## Exact changed-file manifest

- `.gitignore`
- `components/gallery/AddNewGalleryModal.tsx`
- `components/gallery/GalleryImageItem.tsx`
- `components/gallery/GalleryImageViewerModal.tsx`
- `components/gallery/GalleryItem.tsx`
- `components/gallery/DeleteImagesModal.tsx`
- `deno.lock`
- `docs/README.md`
- `docs/backend-data-model.md`
- `docs/features.md`
- `docs/gallery-storage.md`
- `docs/offline-first.md`
- `hooks/useGalleryContent.ts`
- `hooks/useGalleryImageRefresh.ts`
- `jest.config.js`
- `providers/auth-provider.tsx`
- `providers/offline-provider.tsx`
- `scripts/gallery-migration-core.ts`
- `scripts/gallery-migration.test.ts`
- `scripts/migrate-gallery-r2.ts`
- `stores/GalleryStore.ts`
- `supabase/config.toml`
- `supabase/functions/_shared/gallery-auth.ts`
- `supabase/functions/_shared/gallery-cleanup.ts`
- `supabase/functions/_shared/gallery-model.ts`
- `supabase/functions/_shared/gallery-storage.ts`
- `supabase/functions/_shared/gallery.test.ts`
- `supabase/functions/_shared/r2.ts`
- `supabase/functions/delete-gallery-images/handler.ts`
- `supabase/functions/delete-gallery-images/index.ts`
- `supabase/functions/delete-gallery/handler.ts`
- `supabase/functions/delete-gallery/index.ts`
- `supabase/functions/gallery-upload/handler.ts`
- `supabase/functions/gallery-upload/index.ts`
- `supabase/functions/sign-gallery-cover-urls/handler.ts`
- `supabase/functions/sign-gallery-cover-urls/index.ts`
- `supabase/functions/sign-gallery-urls/handler.ts`
- `supabase/functions/sign-gallery-urls/index.ts`
- `supabase/migrations/20261031000000_gallery_r2.sql`
- `supabase/tests/gallery-r2.test.ts`
- `tests/hooks/useGalleryContent.test.ts`
- `tests/integration/gallery.open-delete-flow.test.tsx`
- `tests/stores/GalleryStore.test.ts`
- `tests/utils/gallery-cache.test.ts`
- `tests/utils/gallery-storage.test.ts`
- `tests/utils/gallery.test.ts`
- `tests/utils/generateImageVariants.test.ts`
- `tests/utils/runWithConcurrency.test.ts`
- `tsconfig.gallery.json`
- `utils/gallery-storage.ts`
- `utils/gallery.ts`
- `utils/generateImageVariants.ts`
- `utils/offline/local-db.ts`
- `utils/runWithConcurrency.ts`

## Gallery feature audit 2026-11-02

### A Executive summary

The current Gallery has a sound private-storage lifecycle and several frontend reliability gaps. Its strongest areas are authenticated provider-aware signing/deletion, durable HTTP 202 deletion acceptance, ready-only reads, stable account/space keys for Expo Image thumbnails, bounded per-job uploads, and retaining partial upload success. The weakest areas are overlapping asynchronous requests, whole-snapshot SQLite replacement, visible error/retry states, and bulk media feedback. Keep the deployed R2/Supabase/daily-cleanup architecture.

Only the zero-selection action visibility and directly related selection lifecycle were changed in this audit. All other findings below are recommendations. No production database/storage operation, credential access, deployment, migration, Cron operation, commit or push was performed. There is no confirmed P0/P1 authorization or data-loss defect from this feature review; this is not a claim of comprehensive infrastructure security verification.

Evidence labels: **D1–D7** are isolated local reproductions using actual frontend/store code, mocked cloud/native APIs and an in-memory SQLite database. **Code trace** means the failure follows the inspected branch/state transitions, without a device reproduction. Device-dependent risks are separated below. No FPS, latency percentage or native memory benchmark was invented.

The complete lifecycle maps to these files:

| Flow | Responsible files |
| --- | --- |
| List, search, date sorting, covers, pull refresh | `app/(tabs)/(gallery)/gallery.tsx`; `hooks/useGalleryList.ts`; `GalleryListHeader`, `GalleryListControls`, `GalleryListGrid`, `GalleryItem`; `GalleryStore.loadInitialGalleries/loadMoreGalleries` |
| Create gallery and select/remove preview photos | `components/gallery/AddNewGalleryModal.tsx`; `utils/gallery.ts:pickMultipleImages`; `GalleryStore.addNewGallery` |
| Add/upload photos, partial success, progress | `useGalleryContent.handleAddImages`; `GalleryStore.uploadGalleryImages`; `generateImageVariants`, `shrinkImage`, `generateBlurhash`, `runWithConcurrency`; `utils/gallery-storage.ts:uploadR2Image` |
| Authenticated upload lifecycle | `supabase/functions/gallery-upload/handler.ts`; shared auth/model helpers; existing guarded SQL operation |
| Open gallery, image paging and sort | `app/(tabs)/(gallery)/galleryContent.tsx`; `useGalleryContent`; `GalleryImageGrid`, `GalleryImageItem`; image page actions in `GalleryStore` |
| Full image, swipe/zoom, close, viewer paging | `components/gallery/GalleryImageViewerModal.tsx`; installed `react-native-zoom-toolkit` Gallery; `useGalleryImageRefresh` |
| Selection, counts, clear, blur and gallery change | `hooks/useGalleryContent.ts`; `GalleryEditControls`, `GalleryLocationBar`, `GalleryImageItem`; detail route |
| Save originals to device | `useGalleryContent.handleDownloadImages`; `utils/gallery.ts`; Expo FileSystem and MediaLibrary |
| Single/batch delete, accepted vs rejected state | `DeleteImagesModal`; `GalleryStore.deleteMultipleGalleryImages`; authenticated deletion handler and ready-row reconciliation |
| Whole-gallery delete and cover replacement | Detail route confirmation; `handleDeleteGallery`; `GalleryStore.deleteGallery`; existing transactional backend operation |
| Gallery detail edits | `EditGalleryDetailsModal`; hook/store update actions; route metadata snapshot |
| Cache/reopen/account/offline/reconnect | `utils/offline/local-db.ts`; `GalleryStore`; gallery hooks; relevant `AuthProvider`/`OfflineProvider`; auth client |

### B Known bug fixed

**Root cause:** the route rendered actions using only `editMode`; `GalleryEditControls` disabled buttons at zero rather than hiding the entire container. A body tap could deselect the final image without leaving edit mode, whereas the circle handler did exit. Raw selected IDs could outlive the corresponding rows or gallery. Selection was component-local, but a blurred, retained stack screen had no explicit cleanup.

**Implemented behavior:**

- `app/(tabs)/(gallery)/galleryContent.tsx:158` requires both edit mode and a positive valid selected count. `components/gallery/GalleryEditControls.tsx:25` independently returns `null` at zero, so no button or empty action-bar container remains.
- `hooks/useGalleryContent.ts:105` derives IDs/counts from selected IDs that still exist in the current gallery rows. A settled refresh prunes removed IDs; temporary initial-refresh clearing does not erase the underlying selection.
- Both deselection paths now exit edit mode after the last valid selection disappears. Existing long-press entry is unchanged; no entry control was hidden or removed.
- `hooks/useGalleryContent.ts:62` centralizes clear/reset, including the image-delete confirmation. Gallery-ID changes and navigation blur clear selection. Successful image deletion continues using `onCleared`; downloads retain their existing final reset. An empty download request returns before signing or permission work.
- Download/Delete still operate only on the selected ID list, and counts reflect that same list.

The interaction model follows the pre-existing circle behavior: deselecting everything exits selection mode. It does not introduce a persistent empty selection mode or a new toolbar design.

**Regression coverage:** zero/null container, one/multiple selections and exact counts, disabled actions during download, deselecting the last image through body and circle, Clear, removed rows, successful deletion, temporary refresh, route-ID change, blur/return and empty download. Nine new regression cases were added; the prior test that accepted an unknown selected ID now expects that ID to be excluded. The existing accepted/rejected deletion integration behavior still passes.

### C Confirmed findings not implemented

#### C01 P2 Older requests can replace newer search or sort results

**Source:** `stores/GalleryStore.ts:335`, `:345`, `:443`; `hooks/useGalleryList.ts:23`. **Reproduce:** start a slow search, change search/sort, let the newer request finish first, then the older one. **Root cause:** `galleryGeneration` invalidates account clears, not requests within the same account/query. There is no per-query sequence/cancellation check before cache/publication; stale `finally` blocks also clear current loading flags. **Impact:** visible results/cursor/cache can belong to the wrong query. **Fix:** capture account/space/query and a per-list request revision; publish rows, errors and loading completion only for the current request. Apply the same ownership rule to per-gallery initial/page refreshes. **Evidence:** D1 reproduced newer query text paired with older result rows. High confidence.

#### C02 P2 Partial query results overwrite the complete offline collection

**Source:** `stores/GalleryStore.ts:444`, `:689`; `utils/offline/local-db.ts:702`, `:708`, `:749`. **Reproduce:** cache two galleries, search for one online, then go offline and clear search. The other gallery is gone from cache. First-page refresh/reopen similarly replaces previously accumulated image pages with at most 20 rows. **Root cause:** a query/page window is treated as the authoritative complete entity set. **Impact:** previously browsed galleries/photos disappear offline; pagination/cover refresh reduces cached coverage. **Fix:** distinguish entity upserts from query/page membership and verified deletion; do not clear a whole space/gallery for a partial page. No server/schema change is required for the first frontend correction. **Evidence:** D2 reproduced cache shrinking from two galleries to one after a filtered read. High confidence.

#### C03 P2 Concurrent SQLite rewrites can restore deleted offline metadata

**Source:** `utils/offline/local-db.ts:749`, especially `:757`; `stores/GalleryStore.ts:1055`, `:1084`, `:1092`. **Reproduce:** an older cache writer deletes the collection and pauses before inserting a soon-deleted image; the newer deletion writer replaces the cache without that image; the older writer resumes and reinserts it. **Root cause:** awaited DELETE/individual INSERT statements have neither an atomic transaction nor a versioned/serialized write owner. **Impact:** an accepted-deleted image can reappear in offline metadata; interruption may also leave a partial cache. This does not undo the server deletion or create a ready database row. **Fix:** serialize/version writes per captured account/space/gallery and commit each snapshot atomically; prevent obsolete snapshots from overwriting newer deletion results. A transaction alone does not solve every out-of-order snapshot arrival. **Evidence:** D4 reproduced the deleted ID reappearing using actual SQLite SQL and controlled interleaving. High confidence; native scheduling frequency unmeasured.

#### C04 P2 Image errors can be presented as an empty or silently unsigned gallery

**Source:** `stores/GalleryStore.ts:634`, `:653`, `:782`; `components/gallery/GalleryImageGrid.tsx:119`; `app/(tabs)/(gallery)/galleryContent.tsx:175`; `hooks/useGalleryContent.ts:72`. **Reproduce:** fail the first image query without cached rows; loading ends and the grid says “No photos here yet.” Alternatively fail signing: unsigned rows replace/cache the result, with no signing error UI. **Root cause:** the grid receives loading/rows but no error/retry contract, and the hook does not expose per-gallery failures. Undefined image sources have no useful fetch to recover automatically; the refresh hook has no expiry timer for unsigned rows. SQLite exceptions can additionally reject the fire-and-forget initial load. **Impact:** users can mistake a failure for no photos, see blank/blur-only cells, and have no content-screen pull-to-refresh or explicit retry. **Fix:** separate loading/empty/read-error/signing-error states, retain usable cached URLs, handle the initial promise and add a bounded retry/refresh control. **Evidence:** code trace and existing store tests that deliberately return unsigned rows. High confidence in the error-state mismatch.

#### C05 P2 Fresh URL checks still trigger full cache rewrites

**Source:** `utils/gallery-storage.ts:25`; `stores/GalleryStore.ts:1041`; `hooks/useGalleryContent.ts:213`; `hooks/useGalleryImageRefresh.ts:9`. **Reproduce:** open one photo whose URLs are fresh in a gallery with multiple loaded rows. **Root cause:** even when no signer call is needed, `refreshSignedImages` recreates objects, then the store publishes an array and rewrites every cached row. Per-photo expiry requests have different deduplication keys, so their whole-gallery cache rewrites can overlap. **Impact:** unnecessary JS/render work and DELETE plus N INSERT operations on routine viewing, amplified at expiry. **Fix:** return identity on a true no-op, compare changed URLs, batch expiry work per gallery and update only changed cached rows through the C03 writer. **Evidence:** D3 observed zero signer requests but one cache DELETE and three INSERTs when refreshing one fresh photo among three. High confidence; no device speedup claimed.

#### C06 P2 Cover expiry refreshes reset pagination and can fan out requests

**Source:** `components/gallery/GalleryItem.tsx:18`, `:26`; `stores/GalleryStore.ts:345`, `:444`, `:570`. **Reproduce:** load more than ten galleries and leave covers mounted near the expiry deadline. Each cover's timer/error calls `refreshGalleries`, which loads only page one. **Root cause:** object URL renewal is implemented as a full list reload without shared deduplication. **Impact:** the visible collection/cursor/cache can collapse to the first page, lose scroll context, and issue overlapping list/signing work. **Fix:** renew cover URLs for affected loaded gallery IDs in a shared request while preserving entities, paging and position. **Evidence:** direct call-chain trace; per-card timer multiplicity follows the component instances. High confidence in pagination reset; device request timing unmeasured.

#### C07 P2 Bulk downloads lose partial success and retry stale local URLs inefficiently

**Source:** `utils/gallery.ts:88`, `:99`, `:106`, `:112`; `hooks/useGalleryContent.ts:254`, `:269`. **Reproduce:** save photo one, fail photo two. The utility alerts and returns zero although one asset was saved; the hook clears the entire selection in `finally`. Missing originals are silently skipped. **Root cause:** one batch catch discards accumulated results, and the caller has only a count rather than per-image outcomes. During expiry recovery, refreshing all selected URLs does not update the loop's original array, so later photos can each try an old URL and force another full-selection refresh. **Impact:** inaccurate feedback, difficult failed-only retry, possible duplicate album saves and redundant signing. **Fix:** return saved/failed/skipped IDs, retain failed selections, report partial results/progress, and reuse refreshed URLs for remaining items. **Evidence:** D5 reproduced one successful native-mock save with a returned count of zero. Expiry amplification is a code trace. High confidence.

#### C08 P2 Ascending sort is only local and can change the viewer's active photo on paging

**Source:** `hooks/useGalleryContent.ts:81`; `stores/GalleryStore.ts:630`, `:748`; `components/gallery/GalleryImageViewerModal.tsx:134`, `:236`. **Reproduce:** open a gallery with more than 20 photos, choose ascending order, then fetch an older page while viewing near the end. **Root cause:** server paging always fetches descending/newest rows; ascending only sorts the loaded subset. Older pages are inserted before existing ascending items. The installed zoom toolkit keeps a numeric active/scroll index; `initialIndex` is initialization, not a controlled image-ID anchor. **Impact:** “ascending” initially omits the actual oldest photos, new pages prepend unexpectedly, and the same numeric viewer index may refer to another photo. **Fix:** make sort direction part of paging/cursor state and explicitly preserve the viewed image ID/scroll anchor when data changes. **Evidence:** deterministic ordering trace plus installed `react-native-zoom-toolkit/src/components/gallery/Gallery.tsx:72`, `:179`. High confidence in ordering; native visual jump not device-tested.

#### C09 P2 Viewer pagination cannot retry an unchanged failed page

**Source:** `components/gallery/GalleryImageViewerModal.tsx:132`, `:155`; `stores/GalleryStore.ts:758`. **Reproduce:** reaching the end requests the next page; it fails, so length remains unchanged; swipe away/back or close/reopen the viewer. **Root cause:** `lastLoadMoreLengthRef` is set before requesting and never released/reset on failure or viewer reopen. **Impact:** the viewer stops requesting that page until another path changes image count. **Fix:** track in-flight state rather than permanently suppressing a length, expose a retry outcome/control, and reset the request guard appropriately. **Evidence:** D6 rendered the actual modal with native dependencies stubbed; all subsequent same-length attempts, including reopen, left the request count at one. High confidence.

#### C10 P2 Add-photo operations can overlap within the same gallery

**Source:** `hooks/useGalleryContent.ts:127`; `stores/GalleryStore.ts:951`, `:959`, `:994`; `app/(tabs)/(gallery)/galleryContent.tsx:145`; `components/gallery/GalleryControls.tsx:60`. **Reproduce:** start a slow upload, tap Add again, select more/the same photos. **Root cause:** the store records `isUploadingByGalleryId` but has no re-entry guard, the hook does not subscribe to it, and the route does not pass `actionsDisabled`. Each call starts two workers and its own finally can clear the shared boolean while another remains active. **Impact:** duplicated user jobs/photos, misleading busy state and more than the intended simultaneous image processing. Internal retry idempotency still works within each individual upload identity. **Fix:** enforce a per-gallery operation owner in the store and expose busy state to the existing controls; return per-photo outcomes for failed-only retry. **Evidence:** unguarded call-chain trace. High confidence in re-entry; native load impact unmeasured.

#### C11 P2 Picker rejection is unhandled and can strand the add-gallery preview spinner

**Source:** `components/gallery/AddNewGalleryModal.tsx:203`, `:216`, `:220`; `hooks/useGalleryContent.ts:133`; `utils/gallery.ts:13`. **Reproduce:** let a native permission/picker promise reject. The add-gallery `.then` has no rejection/finally path, so `isAddingImages` stays true when previews exist; Add Images awaits the picker outside its try/catch. The picker also remains enabled while `isAddingImages` is true. Ordinary permission denial silently returns like cancellation. **Root cause:** error and picker ownership are not represented separately from a successful/cancelled result. **Impact:** unhandled rejection, stuck loading state, repeated picker requests, or confusing lack of feedback. **Fix:** one guarded try/catch/finally picker action, separate cancel/denied/error results, and a settings hint when appropriate. **Evidence:** direct promise/state trace; cancellation itself is handled correctly. High confidence.

#### C12 P2 Whole-gallery confirmation remains active during deletion

**Source:** `app/(tabs)/(gallery)/galleryContent.tsx:123`; `hooks/useGalleryContent.ts:149`, `:164`; `components/common/ConfirmModal.tsx:29`; `components/common/CenteredModal.tsx:41`. **Reproduce:** press confirmation twice while the first request is pending. **Root cause:** the route omits `isConfirming={isDeleting}`, and the handler has no synchronous in-flight owner. Each successful call can execute `router.back`. Android modal Back also invokes `onClose` even when the inner action buttons are busy. **Impact:** duplicate requests and potentially more than one back navigation; users can dismiss an in-flight destructive confirmation without a clear operation state. Backend idempotency limits server damage but does not fix navigation. **Fix:** bind confirming/disabled state and add an operation guard; make dismissal behavior explicit. **Evidence:** D7 invoked the actual hook twice before completion and observed two delete calls and two router back calls. The modal busy-state omission is a code trace. High confidence; no native Back gesture test.

#### C13 P2 Reconnect refreshes image URLs without reconciling ready image records

**Source:** `hooks/useGalleryContent.ts:75`, `:90`; `providers/offline-provider.tsx:18`; `stores/GalleryStore.ts:1041`. **Reproduce:** leave a gallery open, have the partner delete a photo, disconnect/reconnect or return from background. **Root cause:** reconnect only renews URLs for existing local IDs; the provider refreshes gallery lists, not the current image collection. There is no gallery image realtime/focus/foreground reconciliation. Fresh URLs can bypass a signer request entirely. **Impact:** already-deleted rows can remain visible until reopen/another explicit mutation refresh; metadata plus a URL can misleadingly look like offline availability. **Fix:** event-driven ready-row reconciliation on focus/reconnect/foreground, with page/scroll preservation and honest cached-byte availability. Do not reintroduce physical cleanup calls or periodic deletion polling. **Evidence:** inspected subscriptions/effects and refresh call chain. High confidence in the stale-row path; partner/device scenario remains manual.

#### C14 P2 Selection accessibility and action contrast are insufficient

**Source:** `components/gallery/GalleryImageItem.tsx:30`, `:52`; `components/gallery/GalleryHeader.tsx:24`; `components/gallery/GalleryEditControls.tsx:71`, `:77`, `:86`; `components/CustomText.tsx:24`; gallery modal inputs. **Reproduce:** inspect selection using a screen reader or increase system font size; selected circles expose no label, checkbox role or checked state, and gallery text opts out of scaling. Small icon-only controls have no useful labels in several paths. **Root cause:** selection is communicated primarily through gesture and color; fixed sizing and default text behavior do not expose its semantics. **Impact:** selection/status/navigation can be difficult or unclear for assistive-technology and low-vision users. **Fix:** label photos/actions, expose checkbox/selected/busy state and a discoverable selection action; allow bounded gallery-specific font scaling and adaptive hit areas. Preserve the theme while correcting contrast. **Evidence:** missing props are directly inspectable; color-token calculation gives brown text `#9D6100` on Delete `#BF7B7B` **1.53:1**, and on Download `#FFCC7D` **3.42:1**. Both are below the normal-text 4.5:1 benchmark in [W3C contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html). Native screen-reader traversal was not tested. API guidance: [React Native 0.81 accessibility](https://reactnative.dev/docs/0.81/accessibility).

#### C15 P3 Cover BlurHash is passed as an image URI rather than a BlurHash source

**Source:** `components/gallery/GalleryItem.tsx:43`; installed `node_modules/expo-image/src/Image.tsx:253` and `utils/resolveSources.tsx:18`. **Reproduce:** render a gallery whose stored cover hash is the ordinary string returned by `generateBlurhash`. **Root cause:** the card passes that string directly as `placeholder`; the installed resolver converts ordinary strings to `{uri: string}` and recognizes hashes only through an explicit hash object or hash URI scheme. Photo cells already use `{blurhash: ...}`. **Impact:** cover loading lacks the intended decoded BlurHash placeholder and may show a blank surface until the actual cover arrives; the valid cover URL itself is unaffected. **Fix:** use the existing explicit BlurHash source form on cards, with a resolver/component regression test. **Evidence:** deterministic installed SDK source trace, not a device screenshot. High confidence in source interpretation.

### D UI and UX improvements ranked by value

| Priority / impact | Current evidence | Proposed behavior | Effort |
| --- | --- | --- | --- |
| P2 High | C04 image read/signing error appears empty/blank | Inline error with Retry, keep valid cached content, content pull refresh, honest offline message | M |
| P2 High | C07 progress is mostly an indeterminate Download spinner; partial success becomes zero | Show saved/total, partial result and retry failed only; keep already successful photos out of retry | M |
| P2 High | C10–C12 busy controls/picker/confirmation ownership | Disable existing conflicting actions, visibly identify busy state, handle permission/error separately from Cancel | S–M |
| P2 High | C14 selection is long-press-only, unlabeled circles; poor active-action contrast | Add accessible selection action/hint, checked state/count announcements and theme-compatible readable text | M |
| P2 Medium | Viewer `:93` uses a native Image without per-image loading/error state; modal spinner `:227` tracks mount readiness, not image decoding | Thumbnail/BlurHash while original loads, per-page Retry/error, retain working image during URL renewal | M |
| P2 Medium, native validation needed | Absolute actions `components/gallery/GalleryEditControls.tsx:59`; grid has no bottom content inset | Reserve action-bar space only when it is present; verify last row is not obscured and small-screen taps remain reachable | S |
| P3 Medium | Confirmations say generic “Are you sure?” / Yes / No, without photo count; gallery deletion UI does not explain removal timing | “Delete N photos” / Delete / Cancel; immediate removal acknowledged without implying synchronous physical cleanup | S |
| P3 Medium | Returning/reopening reloads first image page; viewer has no visible index/count feedback | Preserve gallery scroll/photo anchor where useful; show loaded index and avoid pretending the loaded length is the total | M |
| P3 Low–medium | Add modal is full-width/max-height 100%, edit modal uses a capped centered form; thumbnail sizes are module-level window measurements | Reuse existing form sizing/insets, use actual available width, verify tablet/split-screen; keep existing palette/radii/typeface | S–M |
| P3 Optional | Card shows title/location but not its gallery date | Add a compact date only if it improves identifying memories; retain existing title truncation and soft card style | S |

No restyle or new icon/image format is proposed. Headers already use the documented 24px Raleway style and background token. Existing search debounce, title truncation, keyboard-scroll forms and safe-area roots are useful. Keep them. Card BlurHash currently passes a bare string (`components/gallery/GalleryItem.tsx:43`), unlike the explicit `{blurhash: ...}` used by image cells; standardize this on the supported Expo source form when doing the image-state batch.

### E Performance findings

The highest-value optimizations are eliminating proven work, not adding memo wrappers everywhere:

1. **C05/C06:** no-op URL checks should perform no state/cache write. Collect visible expiry IDs into bounded gallery-level signing requests and renew covers without reloading list pages. Current exact-ID-set deduplication does not combine individual image requests.
2. **C03:** serialize/version cache publication and use atomic batches. Current per-row DELETE/INSERT replacement has O(loaded rows) SQL work per URL renewal and a confirmed interleaving defect.
3. **C01:** discard obsolete queries before signing/caching; otherwise a debounced search still wastes a full old query/signing/write path and can publish the wrong result.
4. **Viewer cache:** thumbnails/covers use Expo Image with account/space/object `cacheKey`; the viewer uses React Native Image with only its signed URI (`components/gallery/GalleryImageViewerModal.tsx:93`). It therefore does not opt into that stable Expo cache identity/policy. Evaluate Expo Image inside the existing zoom page, with the same private scope, known dimensions, loading placeholder and bounded three-page window. URL changes are a cache-efficiency risk; no duplicate-download count was measured on device.
5. **Upload allocations:** `utils/generateImageVariants.ts:21` reads each JPEG as base64 then decodes it; installed Expo FileSystem already exposes `File.arrayBuffer()` (`node_modules/expo-file-system/src/FileSystem.ts:117`). A scoped buffer-read change can remove base64 intermediates without changing JPEG bytes/quality. `shrinkImage` renders the source for each variant; profile sharing dimension/decode work before changing it. Grid aliases orig's buffer rather than encoding a third new file: do not remove historical grid files or claim three current encodes.
6. **C07:** reuse refreshed URLs during a long download batch, cache album lookup per batch and report per-item progress. Keep conservative/bounded download concurrency; unlimited parallel MediaLibrary writes are not justified.

**Separate backend performance follow-up — P3, recommendation only:** `supabase/functions/sign-gallery-cover-urls/handler.ts:18` awaits gallery/member/image lookups per cover and `:30` calls `signImages` for every variant although only the thumb URL is returned. Ten valid historical covers follow 30 PostgREST lookups and generate 20 unused grid/orig signatures. These are code-path counts, not measured latency or R2 GETs. A separately authorized future backend change could batch authorized lookups and sign only the thumb while retaining canonical-key/provider/membership validation. Do not change that handler as part of the frontend batches.

Useful existing mechanisms: FlashList 2 virtualization, memoized cells, memoized row grouping and handlers, store selectors, two workers per upload job, and the viewer's `windowSize=3`. Two existing render-count guardrails pass. They use a nonvirtualized FlashList mock and prove noop child memoization, not FPS, scrolling smoothness, native image decoding, or recycling correctness. Do not add obsolete FlashList v1 sizing props or rewrite the lists based on those tests alone.

### F Offline reliability and potential risks

**Confirmed weaknesses:** C02/C03 affect cache coverage/consistency, C04 affects error recovery, C07 affects partial downloads, C09 stalls viewer paging, and C13 leaves stale metadata after reconnect. Offline filtering currently checks whether a URL exists (`hooks/useGalleryContent.ts:90`), not whether thumbnail/original bytes are on disk. A cached URL must not be labeled “available offline.” Expired signed capabilities do not prevent a stable-key cached thumbnail from rendering, but they also do not guarantee that bytes survived native cache eviction. No image-byte prefetch/availability manifest currently exists.

**R01 Native memory/temp retention — risk, not a measured crash:** generated thumb/orig JPEGs, BlurHash PNGs and downloaded cache JPEGs have no explicit finally cleanup (`utils/generateImageVariants.ts`, `generateBlurhash.ts`, `utils/gallery.ts:56`). `shrinkImage`/BlurHash release references on success but not every exception path. Cache storage may be reclaimed by the OS; permanent growth/peak memory was not benchmarked. Add explicit file ownership/cleanup and exception-safe release, then profile large originals with the real concurrency limit. Android FileSystem can leave a partial file after an interrupted download; the installed API documents that iOS uses a temporary file and moves it only on success. Account for that platform difference.

**Image processing and interrupted jobs:** new uploads still make thumb JPEG 1000px/.70 and orig JPEG 2000px/.90; historical grid objects remain supported, and small images are re-encoded without upscaling. No new format or quality reduction is justified by this audit. There is no explicit EXIF-copy/orientation policy in the app layer; verify rotated portrait/landscape, HEIC/iCloud assets and correct output dimensions on both platforms before changing native processing. Upload identities and selected local URIs are held in memory, not a durable resume queue. On process termination, already-finalized rows remain on the server, pending uploads rely on the existing backend abandonment cleanup, and the user must reopen/repick remaining photos. Durable resumability or cancellation would be a separately reviewed frontend enhancement, not an additional cleanup worker.

**R02 Layout and gesture validation:** the action overlay has no reserved grid bottom inset; 28px back/close buttons and small selection circles have no expanded hit area. Static window widths should be tested on tablets/split view, not described as a normal rotation bug: the current app explicitly locks portrait (`app.json:6`). Test keyboard resizing and inset behavior in the full-height Add form, zoom/paging gestures and Android Back. No screenshots/device rendering were used to claim measured clipping.

**R03 Account/space cancellation:** account changes clear the store and advance `galleryGeneration`; SQLite rejects mismatched `cache_scope`, and thumbnail keys include account/space. These are real protections, and the actual SQLite isolation test passes. No cross-account photo disclosure was demonstrated. Remaining risks are unguarded old error/finally updates, a space change not advancing the same generation, already-started native/upload work surviving blur/sign-out, and cache/tmp retention policy. Capture operation ownership and reject stale completions without weakening signed-read membership checks. Do not invent a new public image cache.

**R04 Error retry budget/foreground:** `hooks/useGalleryImageRefresh.ts:11` resets its one-error retry ref only when image ID changes. A failed attempt while offline can consume that budget; background timer/native image retry behavior needs real-device verification. Reset/rearm only with a deliberate success/new-capability policy that avoids infinite failed-request loops. Add event-driven metadata refresh for C13 rather than an app cleanup timer.

**Backend contract review:** the inspected handlers validate JWTs with Auth, check space membership, validate gallery/image canonical keys and filter ready rows. The client has no Supabase fallback for rejected R2 operations. HTTP 202 means a durable receipt/marking transaction was accepted; client hiding is correct, and physical deletion belongs to the daily backend. The SQL rejects aborting an already-ready upload, protecting a finalize response lost in transit. No correctness/authentication backend fix was identified; the separate P3 performance recommendation in E is not part of the frontend implementation batches. This audit did not remotely verify deployments, Cron execution or live receipts.

**Android/iOS media review:** current installed `expo-media-library` supports `createAssetAsync(uri, album)` on iOS as well as Android; its iOS module accepts an album ID and adds the asset. Creating a new album with the fourth local-URI argument is also implemented. Do not label these calls inherently Android-only. Actual limited/denied/add-only permissions, first/existing album saves, Android MediaStore behavior and iOS Photos behavior still need device tests. Photo picking requests images only; Android configuration also declares video/legacy storage permissions, so review the merged native permissions in the platform batch before removing anything.

### G Code quality and maintainability

- `stores/GalleryStore.ts` combines paged queries, signing, cache publication, upload orchestration and mutations in one global error/loading model. Introduce small typed frontend helpers for the repeated read/sign/result handling and operation ownership; keep the existing store/API architecture. Avoid a generic data framework or full rewrite.
- Initial/load-more image signing is duplicated instead of consistently using `refreshSignedImages`, leading to different failure contracts (C04/C05). Consolidate only after defining cached fallback and per-gallery errors.
- SQLite APIs are named “replace” but callers pass partial query windows (C02); make authoritative replacement versus partial upsert explicit. Bind cache writes to a captured scope/version, not a mutable current session lookup alone.
- Picker handlers, busy state and media outcomes are spread across components/hook/store. Reuse a narrow picker result type and per-item operation results. Keep new UI behavior independent of backend changes.
- The cover-signing warning says “falling back per-path” (`stores/GalleryStore.ts:194`) although that insecure fallback was intentionally removed. Correct the diagnostic wording in a future cleanup; do not restore a provider-blind fallback.

### H Test coverage and important gaps

**Passing application checks:** 116 tests across 13 focused gallery suites, including nine new regression cases. Existing coverage includes queued deletion acceptance/rejection, no client physical cleanup, provider-aware upload protocol, signed URL refresh, pagination branches, selection/download flow, actual SQLite v5-to-v6 isolation, image variant bytes/dimensions and concurrency stopping after failure. Mocked cell render guardrails also pass.

**Additional evidence:** seven temporary diagnostic observations passed. They deliberately assert the current bad behavior to reproduce D1–D7; they are outside the repository, are not desired-behavior regression tests, and must not be mistaken for fixes. Retain their evidence at `%TEMP%/bubududu-gallery-audit-20261102` and invert the relevant assertions when implementing the corresponding future fix.

**Next tests with meaningful value:** out-of-order initial/search/page/delete/sign completions; scope changes while awaiting; atomic/versioned cache writes under controlled interleaving and interruption; filtered/page cache coverage; actual error-versus-empty screen output; a signing failure with useful cached URLs; viewer retry/reopen/ascending prepend anchor; per-gallery concurrent upload rejection; picker promise rejection/cancel/denied; duplicate confirmation navigation; partial/multi-expiry downloads; generated/downloaded temp cleanup; event-driven partner deletion reconciliation.

**Mock limitations:** hook tests use selector mocks, not real store subscriptions; store upload tests replace the concurrency worker with sequential iteration (the real worker has separate tests); the previous hook test named “downloads without signing” only proved its mocked helper avoided the mocked API. Native FileSystem mocks always return one fake downloaded URI and do not model Android partial files or iOS Photos permissions. FlashList mocks do not virtualize. New visibility tests render the actual action component; focus tests model blur cleanup but do not validate a physical navigation gesture.

### I Prioritized improvement roadmap

Effort is relative: S = small change with focused tests; M = coordinated frontend/store change; L = several independent changes plus device validation. It is not a calendar estimate.

| Group / priority | Finding | Category | Affected files | User impact | Estimated effort | Recommended action |
| --- | --- | --- | --- | --- | --- | --- |
| Correctness first / P2 | C01 request ownership | State/concurrency | `stores/GalleryStore.ts`; gallery hooks | Wrong search/pages and stale completions | M | Per-query/per-gallery scoped request revisions |
| Correctness first / P2 | C03 cache ordering/atomicity | Cache/integrity | `utils/offline/local-db.ts`; store cache callers | Deleted/offline metadata resurrects | M | Versioned serialized atomic publication |
| Correctness first / P2 | C02 partial cache replacement | Offline correctness | Same files | Previously viewed content disappears offline | M | Upsert entities; separate page/query membership |
| Correctness first / P2 | C10–C12 operation re-entry/errors | Operation ownership | Content hook, Add modal, detail route | Duplicate jobs/back navigation; stuck picker | S–M | Guard operations and bind existing busy controls |
| High-value UX / P2 | C04/C13 error and stale-record recovery | Reliability/feedback | Grid, hook, store, offline lifecycle | Failure looks empty; partner changes remain stale | M | Explicit per-gallery read state and event-driven reconciliation |
| High-value UX / P2 | C07 honest media outcomes | Downloads | `utils/gallery.ts`; hook/actions | Partial success reported as total failure | M | Saved/failed IDs, progress and failed-only retry |
| High-value UX / P2 | C08/C09 viewer/page correctness | Paging/navigation | Store/hook/viewer | Wrong oldest-first behavior; no retry | M | Paging sort contract and stable image anchor/retry |
| High-value UX / P2 | C14 accessibility/contrast | Accessibility | Gallery controls/cells/forms | Selection and text difficult to use | M | Semantics, font scaling, readable theme tokens |
| Performance / P2 | C05/C06 renew only necessary URLs | SQL/network | Store, image/cover refresh hooks | SQL/network amplification and pagination resets | M | No-op identity, incremental cache updates, shared signing |
| Performance / P3 | R01 buffers/native refs/temp files | Memory/disk risk | Media utilities/upload worker | Memory/disk pressure risk | M | Byte reads, ownership cleanup, measured native profiling |
| Visual polish / P3 | C15 wrong cover placeholder | Image loading | `components/gallery/GalleryItem.tsx` | Missing intended loading placeholder | S | Explicit BlurHash source and component test |
| Visual polish / P3 | R02 overlay/insets/form consistency | Adaptive layout | Grids, action bar, Add/Edit modals | Obscured last row or awkward small-screen layout | S–M | Reserve action space, available-width layout, device check |
| Optional / P3 | Scroll resume, card date, bounded prefetch | Discovery/cache | List/viewer/cache hooks | Faster return/discovery/offline predictability | M | Product decision after correctness work; retain private scope |

No confirmed critical security fix is being deferred. The correctness group comes first because failures were reproduced and can invalidate the apparent result of otherwise working R2 operations.

### J Proposed implementation batches for review

**Batch 1 — async publication and cache integrity (C01–C03).** Files: `stores/GalleryStore.ts`, `utils/offline/local-db.ts`, store/SQLite tests. Behavior: each operation owns its captured scope/query/revision; stale completions cannot publish rows/errors/loading; cache snapshots are ordered and atomic; query windows do not evict unrelated cached entities. Acceptance: invert D1/D2/D4, retain accepted deletion hiding across restart/offline, and preserve account/space isolation. Risks: cache eviction semantics, cursor ownership and loading flags. Validation: actual in-memory SQLite interleaving/interruption tests, deferred API promises, existing store/cache suites and gallery TS. No backend/schema rollout needed for the first scoped implementation.

**Batch 2 — stateful recovery and action ownership (C04, C10–C13).** Files: content hook/route, Add modal, image grid/controls, store error/read state; focused screen/hook tests. Behavior: Retry versus empty/offline states; metadata reconcile on focus/reconnect; one picker/upload/delete owner per relevant operation; confirmations cannot double-navigate. Acceptance: failed read never says empty, picker rejection releases loading, second upload/delete does not start, partner-deleted rows reconcile without client cleanup calls. Risks: retained navigation state, cancelled effects and partial deletion batches. Validation: controlled async UI tests plus Android Back/foreground/network device scenarios.

**Batch 3 — downloads and temporary resources (C07, R01).** Files: `utils/gallery.ts`, `utils/generateImageVariants.ts`, `shrinkImage.ts`, `generateBlurhash.ts`, download hook/action progress, focused media tests. Behavior: accurate saved/failed IDs, failed-only retry, refreshed URL reuse, safe cleanup of owned temp files/native references; byte-buffer read avoids base64. Acceptance: partial success remains visible, expiry recovery is bounded, no shared source URI is deleted, JPEG dimensions/quality/bytes policy remains unchanged. Risks: Android partial files, iOS album behavior, concurrent asset creation and retry duplicates. Validation: file-operation mocks modelling each platform, byte/variant regressions, permission-denied/limited tests and real album/download checks on both platforms. Do not add formats or reduce quality.

**Batch 4 — image signing/cache/viewer (C05/C06/C08/C09).** Files: store, URL-refresh hook, `GalleryItem`, image grid/viewer, signing helper callers and tests. Behavior: renew only affected capabilities, retain loaded pages and active image ID, no-op URL checks do not write SQL, failed paging can retry; evaluate stable-scoped Expo Image in the existing zoom page. Acceptance: invert D3/D6, no first-page collapse at cover expiry, ascending pages are genuinely ordered, stable private cache identity through renewal. Risks: zoom gestures, image source switching and multiple simultaneous expiry timers. Validation: fake timers/deferred signers, viewer identity tests, actual cache operation counts, then native swipe/zoom/scroll profiling. Preserve historical thumb/grid/orig paths.

**Batch 5 — accessible visual consistency (C14, R02).** Files: gallery cells/actions/header/location bar/list controls/Add/Edit dialogs; gallery-specific text props and UI tests. Behavior: accessible selection/checked/busy state, readable existing-theme labels, usable hit areas, unobscured last row and adaptive form/grid sizing. Acceptance: TalkBack/VoiceOver can enter/select/clear/confirm; system text size does not hide actions; small Android/iPhone and supported iPad layouts remain usable. Risks: text wrapping and nested touch/gesture behavior. Validation: semantic component tests, contrast calculations, screenshot/device QA including reduced motion. Keep the app's current design language and avoid global typography changes to unrelated features.

Only Batch 0 (the selection fix in B) is implemented. Batches 1–5 require a later implementation request; they are not bundled into this change.

### K Validation and scope record

**Files inspected:** all three gallery routes; all 15 `components/gallery` files; `useGalleryContent`, `useGalleryList`, `useGalleryImageRefresh`, `usePullToRefresh`; `GalleryStore`; `utils/gallery`, `gallery-storage`, `generateImageVariants`, `generateBlurhash`, `shrinkImage`, `runWithConcurrency`; relevant gallery schema/cache/clear routines in `utils/offline/local-db`; relevant auth/offline providers, auth client and space-ID helpers; common Confirm/Centered/Action modal controls and `CustomText`; color tokens and app configuration; all 13 focused test suites, Jest setup and mocks. Backend inspection was limited to upload, image/cover signing, image/gallery deletion/auth/model/storage helpers and the existing guarded SQL needed to understand those contracts. Installed Expo Image, FileSystem, MediaLibrary, Expo Router and zoom toolkit source/types supplied version-specific API checks. Repository/storage/offline/style documentation was read first.

**Only eight repository files changed during this audit:** `app/(tabs)/(gallery)/galleryContent.tsx`; `components/gallery/GalleryEditControls.tsx`; `hooks/useGalleryContent.ts`; `tests/hooks/useGalleryContent.test.ts`; `tests/integration/gallery.open-delete-flow.test.tsx`; new `tests/components/GalleryEditControls.test.tsx`; `docs/gallery-storage.md`; `docs/features.md`. Existing uncommitted R2/migration work is retained. Audit diagnostics/configs/baseline hashes are temporary files outside Git. No migration script, dependency, Edge Function, RLS, database schema, credential or Cron setting was edited.

**Commands/results:**

```text
npx jest --runInBand tests/components/GalleryEditControls.test.tsx tests/hooks/useGalleryContent.test.ts tests/integration/gallery.open-delete-flow.test.tsx
  3 suites / 33 tests passed
npx jest --runInBand tests/stores/GalleryStore.test.ts tests/hooks/useGalleryList.test.ts tests/utils/gallery-storage.test.ts tests/utils/gallery-cache.test.ts tests/utils/gallery.test.ts tests/utils/generateImageVariants.test.ts tests/utils/shrinkImage.test.ts tests/utils/runWithConcurrency.test.ts tests/perf/gallery.render-count.test.tsx tests/integration/gallery.cleanup-ownership.test.ts
  10 suites / 83 tests passed
npx jest --config %TEMP%/bubududu-gallery-audit-20261102/jest.audit.cjs --runInBand
  7 isolated diagnostic observations passed (current defects, not regression fixes)
npx tsc --noEmit -p tsconfig.gallery.json
  passed
npx tsc --noEmit -p %TEMP%/bubududu-gallery-audit-20261102/tsconfig.audit.json
  passed; includes gallery routes plus explicit existing UPNG ambient declaration
npx eslint hooks/useGalleryContent.ts components/gallery/GalleryEditControls.tsx "app/(tabs)/(gallery)/galleryContent.tsx"
  passed (changed production files clean)
npx eslint tests/components/GalleryEditControls.test.tsx tests/hooks/useGalleryContent.test.ts tests/integration/gallery.open-delete-flow.test.tsx
  passed with 0 errors; 13 existing require/import-placement warnings in the older mock-based suites
git diff --check
  passed
```

**Not device-tested:** actual navigation/Android Back, TalkBack/VoiceOver, font scaling, modal/keyboard/inset clipping, swipe/zoom anchoring, native cache eviction/reuse, photo permissions/MediaStore/Photos, background interruption, original download/album persistence, large-original memory/scroll FPS, and live partner/account transitions. No Android/iOS build, install or Metro process was started. Production R2/database/Cron success in earlier checkpoints is historical context, not a new production verification by this audit.


## Gallery audit implementation follow-up — 2026-11-02

All C01–C15 have local implementations and regression coverage. This section supersedes the historical audit's **open client findings**, not its historical production observations. No backend, SQL migration, RLS, Cron, migration/cleanup script, credentials or compression policy changed in this implementation. Device validation is still required; no Metro/build/install/deployment was run.

| Finding | Status | Main files and behavior | Regression coverage | Remaining device validation |
| --- | --- | --- | --- | --- |
| C01 | Implemented | `stores/GalleryStore.ts`: account/space, query/direction, cursor and revision ownership; stale results/errors/finally cannot publish | `GalleryStore.requests.test.ts`: out-of-order searches/pages, image/list sort replacement, account/space switches, independent galleries, accepted deletion | Live account/space switching and navigation |
| C02 | Implemented | Store + `utils/offline/local-db.ts`: partial entity upserts preserve offline coverage; separately verify missing known ready IDs before tombstoning | `gallery-cache-integrity.test.ts`, `GalleryStore.recovery.test.ts`: offline reopen, partial collections, partner-deleted rows | Offline reopen/cache eviction on both platforms |
| C03 | Implemented | Local DB v7 adds deletion flags in existing gallery tables; atomic serialized commits, request owners, deletion revisions and durable tombstones reject obsolete restoration | Actual in-memory SQLite interruption/race, parent/child deletion, disjoint partial upserts and independent gallery tests | Installed native exclusive-transaction connection; web transaction fallback remains unvalidated |
| C04 | Implemented | Store errors + `GalleryImageGrid.tsx`/content hook: cached images survive read/signing failures; visible Retry, pull refresh and honest offline notice | Recovery/grid/hook tests cover failure vs empty, retry, cached URLs and rejected initial promises | Native offline byte-cache behavior |
| C05 | Implemented | `gallery-storage.ts`, `gallery-renewal.ts`, store: fresh signing is a true no-op; item promises batch/deduplicate renewal per authorization scope; only changed rows persist | `GalleryStore.renewal-paging.test.ts`: zero publications/writes/network for fresh URLs, one overlapping signing request, unchanged identity | Native image disk-cache reuse |
| C06 | Implemented | Store `refreshCoverUrls`, `GalleryItem.tsx`: renew affected paths, retain list/pages/cursor, batch card timers, retain old URLs and offer failure retry | Renewal tests retain 22 galleries/cursor, batch simultaneous cards, preserve state on signer error | Scroll context after actual cover expiry |
| C07 | Implemented | `utils/gallery.ts`, content hook/actions: structured saved/failed/skipped IDs and progress; unsuccessful-only retry; one shared expiry renewal; sequential saves; cancellation and owned-temp cleanup | Download/media/hook tests cover partial success, permission denial, missing originals, cancellation, cleanup failure and renewed URLs | Android MediaStore/iOS Photos, limited permissions, albums and interruption |
| C08 | Implemented | Store direction-specific creation-time/ID server queries/cursors; hook sort action; viewer active-ID anchor; distant cached IDs cannot skip an unfetched cursor gap | Renewal/paging and viewer tests cover both 40-row directions, tied dates, changed order/appends, stale sort request, sparse cache | Large galleries and native swipe position |
| C09 | Implemented | `GalleryImageViewerModal.tsx`, refresh hook: pending request owner, bounded automatic attempt, explicit retry and reopen reset; original loading/thumb/error feedback | Viewer tests: duplicate prevention, failed request retry/reopen, ID anchor, expired/read-error recovery | Zoom/swipe and image decoding on Android/iOS |
| C10 | Implemented | Store per-gallery upload symbols + hook busy controls: duplicate re-entry blocked; unrelated gallery jobs independent; finally releases only its owner | Recovery/hook tests: duplicate/parallel uploads and picker entry; existing partial-upload/concurrency protocol coverage | Rapid native taps and partial upload interruption |
| C11 | Implemented | `AddNewGalleryModal.tsx`, content hook, picker utility: synchronous guard, catch/finally, cancel vs failure, denied permission/settings guidance and closed-picker revision | Hook/component picker cancel/reject/busy tests; existing picker permission tests | Native picker cancel, denial, Settings return and preview |
| C12 | Implemented | Store/hook/delete modal guards; route confirming state; `ConfirmModal.tsx` disables pending Back/cancel; shared action semantics | Double-delete hook, confirmation Back model, existing accepted/rejected HTTP 202 store/integration tests | Android hardware Back and actual navigation |
| C13 | Implemented | Focus/foreground/reconnect ready-row reconciliation deduplicated per gallery/direction; preserve offline rows/loaded image count; no mobile cleanup or polling | Hook lifecycle/reconnect, store metadata pruning, cleanup-ownership integration guard | Two-partner changes during offline/background use |
| C14 | Implemented | Gallery cells, headers/actions/forms, route and shared confirmation opt-in: labels, checked/selected/busy states, count announcements, visible selection entry, 44px controls, bounded 1.5× local scaling, measured bottom inset, available-width cells and capped/scrollable form | Accessibility, contrast, action visibility, grid inset and modal tests; existing render-count tests | TalkBack/VoiceOver traversal, large text, safe areas, keyboard and small-screen/tablet layout |
| C15 | Implemented | `GalleryItem.tsx`: explicit validated `placeholder={{ blurhash }}`; invalid/missing hashes omitted; signed actual cover retained | `GalleryAccessibility.test.tsx`: valid/invalid/missing hash and actual URL | Native placeholder transition |

### Implementation boundaries and behavior

- Search/first-page results are partial upserts, **not** authoritative collection replacement. Confirmed missing/deleted IDs create local tombstones in the existing cache tables. No new server schema or local table is required. Local SQLite `user_version` advances from 6 to 7 additively; interrupted v5 upgrades still preserve the outbox.
- Native SQLite uses the installed `withExclusiveTransactionAsync` API (separate connection). Gallery commits share the single SQLite writer, while request and deletion revisions remain scoped by account/space/collection. Ordinary disjoint partial upserts do not cancel one another; deletion revisions invalidate older snapshots and tombstones prevent later resurrection. Web retains its supported nonexclusive transaction fallback and has not been device/browser tested here.
- Metadata refresh starts on focus return, foreground return or reconnect while focused. Overlapping reconciliation is deduplicated. There is no timer/polling for metadata or physical cleanup. The unchanged daily backend job remains the sole physical deletion scheduler with the seven-minute safety window.
- Renewal updates URL fields without overwriting current metadata, selection, cursor or loaded pages. Cached ready IDs outside the contiguous fetched server window remain on disk without moving the pagination cursor over unseen rows. A focus refresh preserves the loaded image count where possible; inserts/deletes can still alter visible positions.
- Download progress counts confirmed native save calls. Successful IDs leave selection, unsuccessful IDs remain selected for retry. A native Photos/MediaStore failure after a platform-side commit cannot be made transactional by this JavaScript code; album persistence needs native testing. Active native file downloads cannot be aborted through this API, so cancellation stops subsequent saves and cleans the owned temporary target when the current call settles.
- Generated JPEG/PNG files and native manipulation references are released in `finally`. Direct `File.arrayBuffer()` reads avoid the former base64 intermediate. Dimensions, JPEG qualities, two-object uploads, historical three-variant reads and BlurHash components/output are unchanged. Byte-read/policy/BlurHash fixture tests passed; no native memory, FPS or JPEG codec benchmark is claimed.
- React Native Image remains inside the zoom toolkit. The installed toolkit exposes `GalleryRefType.setIndex`, used for active-ID anchoring. Type checking and stubbed component tests cannot establish native gesture/measurement compatibility for an Expo Image renderer replacement, so that optional replacement is deferred. Original loading/error/thumbnail/retry improvements use the established renderer.
- Scaling is enabled only in gallery components and via an optional confirmation prop. Global `CustomText` behavior remains unchanged. Active Download/Delete text uses existing darker theme colors; normal-text contrast is regression-tested at ≥4.5:1. The measured action overlay height is reserved in FlashList content only when selection is nonempty.

### Focused validation and device checklist

Run the complete gallery-focused set, including the worker utility used by uploads:

```powershell
$galleryTests = rg --files tests | Where-Object { $_ -match '(?i)gallery|generateImageVariants|generateBlurhash|shrinkImage|runWithConcurrency' }
npx jest --runInBand --runTestsByPath $galleryTests
npx tsc --noEmit -p tsconfig.gallery.json
# This focused configuration also includes the gallery routes.
git diff --check
```

Local validation results and the complete implementation file inventory are recorded below after the final run. Jest native modules are stubbed; SQLite integrity tests execute actual Node in-memory SQLite. The audit's old diagnostic assertions of broken behavior were not used as passing regressions.

Device checklist (Android and iOS; use disposable photos for destructive UI tests):

1. Open historical three-variant and new two-variant galleries; search/sort quickly, page oldest/newest past 40 photos, refresh, switch gallery/account/space while a read is pending. Verify no stale rows appear and the viewer stays on the same photo as pages append.
2. Browse multiple galleries/pages, go offline, reopen them; distinguish missing cached bytes from metadata. Reconnect/foreground after a partner deletes or modifies content; verify ready metadata reconciles without repeated visits or physical-cleanup calls.
3. Simulate a read/signing/load-more failure. Check retained thumbnails, visible Retry, one pending page request, successful retry and close/reopen recovery. Renew covers near expiry after loading several list pages; check cursor/scroll retention. Check original loading, thumb fallback, explicit image retry, zoom and swipe.
4. Rapidly tap Add/picker/Save/Delete. Cancel/deny the picker, return from Settings, test partial upload failure and independent galleries. Confirm one delete request/back navigation; Android Back cannot dismiss a pending confirmation. HTTP 202 hides accepted content without a false failure; verify whole-gallery and cover replacement using disposable photos.
5. Save multiple selected photos with one failure/missing/expired URL and deny permissions. Verify saved/total progress, partial success, only unsuccessful photos remain selected, and retry does not resave successful IDs. Check Photos/MediaStore album persistence and background/navigation cancellation.
6. Test TalkBack/VoiceOver selection, deselecting the last item, Clear/navigation, action labels/busy state and counts. With zero selected, Download/Delete and their container must be absent. At larger system text sizes, verify the last row is reachable above the action bar, safe areas, keyboard-scrolled forms, small widths and tablet layouts. Check valid/missing cover BlurHash loading.

No native build, installation or production action is part of these checks automatically.

### Final local validation — 2026-11-02

- Complete focused gallery run: **24 suites / 173 tests passed; 0 failed, 0 skipped**. Includes store/hooks/components/integration, real SQLite cache races/upgrades, media/download utilities, upload worker and render-count guardrails. No whole-repository suite was run.
- `npx tsc --noEmit -p tsconfig.gallery.json`: passed, including all gallery routes and the shared frontend dependencies they import.
- Targeted ESLint across all implementation TS/TSX and Jest setup: **0 errors**, 17 warnings limited to Jest require-style mocks/setup and one existing unused test fixture. Application source has no lint warnings.
- `git diff --check`: passed. Git's LF/CRLF notices are informational; no whitespace violations were reported.
- Concrete tested counts: fresh URL renewal = **0 signer requests, 0 store publications, 0 SQLite writes**; two overlapping image renewals = **1 batched signer call and exactly 2 changed-row inserts**; two card renewals = **1 signer call while retaining 22 loaded galleries and the same page object**; duplicate same-gallery upload = **1 job**, different-gallery jobs remain independent; expired download URLs = **1 shared renewal** for remaining IDs. No latency/FPS/native-memory benchmarks are claimed.
- Starting branch `migrate-photos` and pre-existing dirty work retained. Hash comparison verified **59 protected baseline files unchanged**, covering backend/setup/migrations/scripts, providers, package manifests/locks and ignore configuration. No dependency additions, credentials access, server mutations, deployment, build/install, commit or push occurred. Temporary diagnostics/results are outside the repository.

### Complete file inventory for this implementation

Paths below are relative to the repository. “Modified” is measured against the working-tree snapshot at the start of this implementation, including previously untracked R2 files; it does not attribute older R2 changes to this work.

**Modified (35):**

- `app/(tabs)/(gallery)/galleryContent.tsx`
- `components/common/ConfirmModal.tsx`
- `components/common/ModalActionButtons.tsx`
- `components/gallery/AddNewGalleryModal.tsx`
- `components/gallery/DeleteImagesModal.tsx`
- `components/gallery/EditGalleryDetailsModal.tsx`
- `components/gallery/GalleryControlButton.tsx`
- `components/gallery/GalleryControls.tsx`
- `components/gallery/GalleryEditControls.tsx`
- `components/gallery/GalleryHeader.tsx`
- `components/gallery/GalleryImageGrid.tsx`
- `components/gallery/GalleryImageItem.tsx`
- `components/gallery/GalleryImageViewerModal.tsx`
- `components/gallery/GalleryItem.tsx`
- `components/gallery/GalleryListGrid.tsx`
- `components/gallery/GalleryListHeader.tsx`
- `components/gallery/GalleryLocationBar.tsx`
- `docs/features.md`
- `docs/gallery-storage.md`
- `hooks/useGalleryContent.ts`
- `hooks/useGalleryImageRefresh.ts`
- `jest.setup.ts`
- `stores/GalleryStore.ts`
- `tests/hooks/useGalleryContent.test.ts`
- `tests/integration/gallery.open-delete-flow.test.tsx`
- `tests/stores/GalleryStore.test.ts`
- `tests/utils/gallery-cache.test.ts`
- `tests/utils/gallery.test.ts`
- `tsconfig.gallery.json`
- `utils/gallery-storage.ts`
- `utils/gallery.ts`
- `utils/generateBlurhash.ts`
- `utils/generateImageVariants.ts`
- `utils/offline/local-db.ts`
- `utils/shrinkImage.ts`

**Added (12):**

- `tests/components/GalleryAccessibility.test.tsx`
- `tests/components/GalleryConfirmModal.test.tsx`
- `tests/components/GalleryImageGrid.test.tsx`
- `tests/components/GalleryViewer.test.tsx`
- `tests/stores/GalleryStore.recovery.test.ts`
- `tests/stores/GalleryStore.renewal-paging.test.ts`
- `tests/stores/GalleryStore.requests.test.ts`
- `tests/utils/gallery-cache-integrity.test.ts`
- `tests/utils/gallery-downloads.test.ts`
- `tests/utils/gallery-media.test.ts`
- `utils/gallery-media.ts`
- `utils/gallery-renewal.ts`


## Gallery original styling restored — 2026-11-02

At the user's request, the visual changes made during C01–C15 were restored from the original Git style definitions (`5b76fce`, the current HEAD), after checking the working-tree diff and the implementation's earlier baseline. This follow-up supersedes the preceding C14 notes about enlarged visible controls, bounded font scaling, darker action text and altered layout. Only style properties, gallery-local typography props and preview sizing logic were changed; functional handlers and the R2/cache architecture were retained.

| Element | Recovered original values |
| --- | --- |
| List/detail Gallery heading | 24px Raleway ExtraBold; date 12px Medium; header bottom margin 20 and gap 10 |
| Card | Title 14px Bold / lineHeight 18; location 10px SemiBold; existing colors, padding and radii unchanged |
| Detail title/date/location | Title 20px Bold; date 10px Medium / marginTop 5; location 10px SemiBold |
| Search | 14px Raleway Regular; original input styling/scaling unchanged |
| Action/Clear labels | Download/Delete 16px SemiBold in original brown `#9D6100`; Clear 10px Medium; original line heights and alignment |
| Add form | Labels/inputs 12px, actions 14px, upload prompt 16px, preview instruction 10px; original Raleway weights; padding 30, width/maxHeight 100%, footer gap 20, buttons width 120, palette circles 20px / gap 10 / opacity .5 (selected 1) |
| Edit form | Title 20px Bold; subtitle/labels 12px; inputs/actions 14px; original 90%/380px width cap, padding 22 and 112px action widths retained |
| Confirmation | Original title 16px, body 13px, actions 14px and 83px action width, using the existing shared defaults; busy/Back guards unchanged |
| Back/viewer close | 28×28px, radius 999, original white surface/border; invisible hitSlop 8; viewer top margin 40 |
| Standard circular actions / photo Sort | 40×40px / 32×32px; radius 999, padding 10, existing icon assets/sizes and white border styling; invisible hitSlop 6 |
| Photo selection indicator | Padding 10 and border 1.5 produce the original approximately 23px empty circle; white border, radius 999, top/right 5; selected `rgba(255,255,255,0.7)`, unselected transparent; no separate opacity/checkmark existed; invisible hitSlop 11 |
| Spacing/grid | Detail root and inner horizontal padding 25, bottom margin 50; original title/control gap 10, location action gap 8 and bottom margin 20; Clear padding 5/horizontal 10; no added 12px grid-row gap; original image size `(windowWidth - 110) / 2` and row separator 15 |
| Selection action bar | Original button padding 10/horizontal 20, radius 15, backgrounds `#FFCC7D` / `#BF7B7B`, container gap 10 and bottom 10; measured bottom content inset remains |

Gallery `CustomText` again uses its original fixed-size default; Add/Edit inputs explicitly retain their original `allowFontScaling={false}` behavior. No shared global typography or unrelated tabs were edited. Original Download/Delete colors replace the previous contrast assertions as explicitly requested; regression tests now pin the recovered original styles while continuing to check accessibility semantics. Existing labels, roles, checked/selected/busy/disabled states, selection announcements, accessible selection actions, long press and multi-selection remain. Current selection-entry behavior, error/retry/progress UI, zero-selection hiding and final-row inset remain functional.

Recovery checks compared **all 105 original named StyleSheet entries** across the gallery components and detail route: **zero differences**. No original style value was unavailable; icon assets were not changed. The new retry/notice styles have no pre-C01–C15 counterpart and remain with their recovery functionality. This is source/component verification, not physical-device or pixel comparison.

Modified UI files: `app/(tabs)/(gallery)/galleryContent.tsx`; `components/gallery/{AddNewGalleryModal,DeleteImagesModal,EditGalleryDetailsModal,GalleryControlButton,GalleryControls,GalleryEditControls,GalleryHeader,GalleryImageGrid,GalleryImageItem,GalleryImageViewerModal,GalleryItem,GalleryListGrid,GalleryListHeader,GalleryLocationBar}.tsx`. Regression assertions were updated/extended in `tests/components/GalleryAccessibility.test.tsx`. The list route/search component, shared components, store/hooks, offline database, protocols, backend and dependencies are unchanged by this styling correction.


Styling correction validation: **24 gallery-focused Jest suites / 177 tests passed, 0 failed/skipped**; gallery TypeScript (including routes) passed; targeted ESLint passed with **0 errors / 3 existing require-style test-mock warnings** and no application-source warnings; `git diff --check` passed. The final diff and starting-snapshot hashes confirm **18 files changed: 15 gallery UI files, one component regression test and two documentation files**. No added files, shared/global UI edits, store/cache/protocol/backend changes, dependency changes, Android build/install, deployment, commit or push. Physical-device visual comparison remains pending.
