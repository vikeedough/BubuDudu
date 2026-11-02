// Async fakes implement the production IO contract without real network/file access.
// deno-lint-ignore-file require-await
import { strict as assert } from "node:assert";
import {
    buildManifest,
    cleanup,
    type CleanupIO,
    type Manifest,
    parseArgs,
    type Progress,
    PROJECT,
    type Snapshot,
    sourceResult,
    validateState,
    verifyCopies,
} from "./cleanup-migrated-supabase-gallery.ts";
import { imageKeys } from "../supabase/functions/_shared/gallery-model.ts";
import { sha256 } from "./gallery-migration-core.ts";

async function fixture() {
    const id = "33333333-3333-4333-8333-333333333333",
        gid = "22222222-2222-4222-8222-222222222222",
        sid = "11111111-1111-4111-8111-111111111111";
    const keys = imageKeys(sid, gid, id), bytes = new Uint8Array([1, 2, 3]);
    const entries = await Promise.all(
        (Object.keys(keys) as (keyof typeof keys)[]).map(async (variant) => ({
            bucket: "gallery-private" as const,
            imageId: id,
            galleryId: gid,
            variant,
            sourceKey: keys[variant],
            r2Key: keys[variant],
            bytes: bytes.length,
            sha256: await sha256(bytes),
            storageProvider: "r2" as const,
        })),
    );
    const row = {
        id,
        gallery_id: gid,
        storage_provider: "r2",
        storage_state: "ready",
        storage_path_thumb: keys.thumb,
        storage_path_grid: keys.grid,
        storage_path_orig: keys.orig,
        bytes_thumb: 3,
        bytes_grid: 3,
        bytes_orig: 3,
        blur_hash: "unchanged",
    };
    const before: Snapshot = {
        images: [row],
        galleries: [{
            id: gid,
            space_id: sid,
            storage_deleting: false,
            cover_image_thumb_path: keys.thumb,
            cover_image_path: keys.grid,
        }],
        receipts: [],
        references: entries.map((e) => ({
            table_name: "date_images",
            row_id: id,
            column_name: `storage_path_${e.variant}`,
            object_key: e.sourceKey,
        })),
        source_objects: entries.map((e) => ({ name: e.sourceKey, metadata: { size: 3 } })),
        source_bucket: { id: "gallery-private" },
        buckets: [],
        cron_jobs: [[5, "bubududu-gallery-daily-cleanup", "0 19 * * *", true]],
        public_tables: ["date_images", "galleries"],
        active_gallery_writers: 0,
        other_storage_fingerprint: "same",
    };
    const manifest: Manifest = {
        version: 1,
        project: PROJECT,
        createdAt: "now",
        migrationSha256: "digest",
        entries,
        excluded: [],
        before: structuredClone(before),
    };
    const state = structuredClone(before), source = new Set(entries.map((e) => e.sourceKey));
    const progress: Progress = { manifestSha256: "digest", completed: [], batches: [], failed: [] };
    const requests: string[][] = [], saves: Progress[] = [];
    const io: CleanupIO = {
        snapshot: async () => state,
        readR2: async () => bytes,
        sourceStatus: async (key) => source.has(key) ? 200 : 404,
        remove: async (keys) => {
            requests.push(keys);
            keys.forEach((k) => source.delete(k));
            return { acknowledged: keys, error: false };
        },
        save: async (p) => {
            saves.push(structuredClone(p));
        },
        assertManifest: async () => {},
    };
    return { manifest, state, source, progress, io, requests, saves, bytes };
}
Deno.test("source cleanup defaults dry; unknown flags rejected; dry-run never removes", async () => {
    assert.equal(parseArgs([]).apply, false);
    assert.equal(parseArgs(["--apply"]).apply, true);
    assert.throws(() => parseArgs(["--bucket=avatars"]));
    const f = await fixture();
    await cleanup(f.manifest, f.progress, f.io);
    assert.equal(f.requests.length, 0);
    assert.equal(f.source.size, 3);
});
Deno.test("missing or same-size wrong R2 bytes stops before any deletion", async () => {
    for (const target of [null, new Uint8Array([3, 2, 1])]) {
        const f = await fixture();
        f.io.readR2 = async () => target;
        await assert.rejects(cleanup(f.manifest, f.progress, f.io, true), /R2 checksum/);
        assert.equal(f.requests.length, 0);
    }
});
Deno.test("source scope rejects forged/duplicate/excluded keys, provider reversion and receipts", async () => {
    for (
        const change of [
            (f: Awaited<ReturnType<typeof fixture>>) => {
                f.manifest.entries[0].sourceKey = "avatars/victim.jpg";
            },
            (f: Awaited<ReturnType<typeof fixture>>) => {
                f.manifest.entries.push(f.manifest.entries[0]);
            },
            (f: Awaited<ReturnType<typeof fixture>>) => {
                f.manifest.excluded.push({ key: f.manifest.entries[0].sourceKey, bytes: 3 });
            },
            (f: Awaited<ReturnType<typeof fixture>>) => {
                f.state.images[0].storage_provider = "supabase";
            },
            (f: Awaited<ReturnType<typeof fixture>>) => {
                f.state.receipts.push({
                    object_keys: [f.manifest.entries[0].sourceKey],
                    completed_at: null,
                });
            },
            (f: Awaited<ReturnType<typeof fixture>>) => {
                f.state.references.push({
                    table_name: "profiles",
                    row_id: "other",
                    column_name: "avatar_url",
                    object_key: f.manifest.entries[0].sourceKey,
                });
            },
        ]
    ) {
        const f = await fixture();
        change(f);
        await assert.rejects(cleanup(f.manifest, f.progress, f.io, true));
        assert.equal(f.requests.length, 0);
    }
});
Deno.test("metadata/cover/Cron/lock changes reject; revalidation immediately before removal", async () => {
    for (const field of ["blur_hash", "storage_state"]) {
        const f = await fixture();
        f.state.images[0][field] = "changed";
        assert.throws(() => validateState(f.manifest, f.state));
    }
    const f = await fixture();
    let snapshots = 0;
    f.io.snapshot = async () => {
        if (++snapshots === 3) f.state.active_gallery_writers = 1;
        return f.state;
    };
    await assert.rejects(cleanup(f.manifest, f.progress, f.io, true), /Active gallery writer/);
    assert.equal(f.requests.length, 0);
    const g = await fixture();
    g.state.galleries[0].cover_image_path = "wrong";
    assert.throws(() => validateState(g.manifest, g.state));
    const h = await fixture();
    h.state.cron_jobs = [];
    assert.throws(() => validateState(h.manifest, h.state));
});
Deno.test("partial Storage failure reconciles individual keys and stops; safe resume", async () => {
    const f = await fixture();
    const remove = f.io.remove;
    f.io.remove = async (keys) => {
        f.source.delete(keys[0]);
        return { acknowledged: [keys[0]], error: true };
    };
    await assert.rejects(cleanup(f.manifest, f.progress, f.io, true), /incomplete/);
    assert.equal(f.progress.completed.length, 1);
    assert.equal(f.progress.failed.length, 2);
    assert.equal(f.progress.sourceDeletionComplete, undefined);
    f.io.remove = remove;
    await cleanup(f.manifest, f.progress, f.io, true);
    assert.equal(f.progress.completed.length, 3);
    assert.equal(f.progress.failed.length, 0);
    const calls = f.requests.length;
    await cleanup(f.manifest, f.progress, f.io, true);
    assert.equal(f.requests.length, calls);
});
Deno.test("HTTP success alone insufficient; unknown auth errors never count as absence", async () => {
    const f = await fixture();
    f.io.remove = async (keys) => ({ acknowledged: keys, error: false });
    await assert.rejects(cleanup(f.manifest, f.progress, f.io, true), /incomplete/);
    assert.equal(f.progress.completed.length, 0);
    assert.equal(
        sourceResult(400, { statusCode: "404", error: "not_found", message: "Object not found" }),
        404,
    );
    assert.equal(
        sourceResult(400, { statusCode: "403", error: "not_found", message: "Object not found" }),
        400,
    );
    assert.equal(sourceResult(403), 403);
});
Deno.test("interruption records requested keys before removal; manifest changes stop", async () => {
    const f = await fixture();
    f.io.remove = async () => {
        throw new Error("interrupted");
    };
    await assert.rejects(cleanup(f.manifest, f.progress, f.io, true), /interrupted/);
    assert.equal(f.saves.at(-1)?.failed.length, 3);
    assert.equal(f.saves.at(-1)?.batches[0].reconciled, false);
    const g = await fixture();
    g.io.assertManifest = async () => {
        throw new Error("manifest changed");
    };
    await assert.rejects(cleanup(g.manifest, g.progress, g.io, true));
    assert.equal(g.requests.length, 0);
});
Deno.test("fresh complete verification finishes before deleting; bounded requests", async () => {
    const f = await fixture();
    let reads = 0;
    f.io.readR2 = async () => {
        reads++;
        return f.bytes;
    };
    await verifyCopies(f.manifest.entries, f.io.readR2);
    assert.equal(reads, 3);
    await cleanup(f.manifest, f.progress, f.io, true);
    assert.equal(f.progress.sourceDeletionComplete, true);
    assert.equal(f.source.size, 0);
    assert.ok(f.requests.every((r) => r.length <= 100));
});
Deno.test("manifest creation rejects changed migration rows/missing historical hashes", async () => {
    const f = await fixture();
    const historical = {
        manifest: [{
            id: f.manifest.entries[0].imageId,
            gallery_id: f.manifest.entries[0].galleryId,
            variants: f.manifest.entries.map((e) => ({
                variant: e.variant,
                key: e.sourceKey,
                expected_bytes: e.bytes,
                storage_bytes: e.bytes,
            })),
            source_checksums: f.manifest.entries.map((e) => ({
                key: e.sourceKey,
                bytes: e.bytes,
                sha256: e.sha256,
            })),
        }],
        unreferenced_objects: [],
    };
    assert.equal(buildManifest(historical, f.state, f.state, "hash").entries.length, 3);
    const changed = structuredClone(f.state);
    changed.images[0].blur_hash = "changed";
    assert.throws(() => buildManifest(historical, f.state, changed, "hash"));
    historical.manifest[0].source_checksums = [];
    assert.throws(() => buildManifest(historical, f.state, f.state, "hash"));
});

Deno.test("more than 100 exact objects uses bounded requests; unknown source status stops", async () => {
    const f = await fixture();
    const original = f.state.images[0];
    f.state.images = [];
    f.manifest.entries = [];
    f.state.references = [];
    f.state.source_objects = [];
    f.source.clear();
    for (let n = 0; n < 34; n++) {
        const id = `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
        const row: Record<string, unknown> = { ...original, id };
        const keys = imageKeys(String(f.state.galleries[0].space_id), String(row.gallery_id), id);
        for (const variant of ["thumb", "grid", "orig"] as const) {
            row[`storage_path_${variant}`] = keys[variant];
            f.source.add(keys[variant]);
            f.manifest.entries.push({
                bucket: "gallery-private",
                sourceKey: keys[variant],
                r2Key: keys[variant],
                imageId: id,
                galleryId: String(row.gallery_id),
                variant,
                bytes: 3,
                sha256: await sha256(f.bytes),
                storageProvider: "r2",
            });
            f.state.references.push({
                table_name: "date_images",
                row_id: id,
                column_name: `storage_path_${variant}`,
                object_key: keys[variant],
            });
            f.state.source_objects.push({ name: keys[variant], metadata: { size: 3 } });
        }
        f.state.images.push(row);
    }
    f.state.galleries[0].cover_image_thumb_path = f.state.images[0].storage_path_thumb;
    f.state.galleries[0].cover_image_path = f.state.images[0].storage_path_grid;
    f.manifest.before = structuredClone(f.state);
    await cleanup(f.manifest, f.progress, f.io, true);
    assert.deepEqual(f.requests.map((r) => r.length), [100, 2]);
    const g = await fixture();
    g.io.sourceStatus = async () => 401;
    await assert.rejects(cleanup(g.manifest, g.progress, g.io, true), /Unknown source state/);
    assert.equal(g.requests.length, 0);
});
