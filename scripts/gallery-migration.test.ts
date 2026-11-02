import { strict as assert } from "node:assert";
import { imageKeys, type ImageRow } from "../supabase/functions/_shared/gallery-model.ts";
import { migrateImage, type MigrationIO } from "./gallery-migration-core.ts";
import { parseArgs } from "./migrate-gallery-r2.ts";

const space = "11111111-1111-4111-8111-111111111111";
const gallery = "22222222-2222-4222-8222-222222222222";
const id = "33333333-3333-4333-8333-333333333333";
const keys = imageKeys(space, gallery, id);
const row: ImageRow = {
    id,
    gallery_id: gallery,
    storage_provider: "supabase",
    storage_state: "ready",
    storage_revision: 0,
    upload_expires_at: null,
    upload_metadata: null,
    storage_path_thumb: keys.thumb,
    storage_path_grid: keys.grid,
    storage_path_orig: keys.orig,
};
function fixture() {
    const source = new Map(Object.values(keys).map((key, i) => [key, new Uint8Array([i, 1, 2])]));
    const target = new Map<string, Uint8Array>();
    let copies = 0, switches = 0;
    const io: MigrationIO = {
        source: async (key) =>
            source.has(key)
                ? { bytes: source.get(key)!, headers: { "content-type": "image/jpeg" } }
                : null,
        target: async (key) => target.get(key) ?? null,
        copy: async (key, object) => {
            target.set(key, object.bytes);
            copies++;
        },
        switchProvider: async (snapshot) => {
            assert.equal(snapshot, row);
            switches++;
        },
    };
    return { io, source, target, copies: () => copies, switches: () => switches };
}
Deno.test("migration dry-run is default and never copies, switches or deletes", async () => {
    assert.equal(parseArgs([]).apply, false);
    assert.equal(parseArgs(["--apply"]).apply, true);
    assert.throws(() => parseArgs(["--delete-source"]));
    const f = fixture();
    const report = await migrateImage(row, space, f.io);
    assert.equal(report.status, "dry-run");
    assert.equal(report.objects.length, 3);
    assert.equal(f.copies(), 0);
    assert.equal(f.switches(), 0);
    assert.equal(f.source.size, 3);
});
Deno.test("migration verifies bytes/checksums and safely resumes a partial copy", async () => {
    const f = fixture();
    f.target.set(keys.thumb, f.source.get(keys.thumb)!);
    assert.equal((await migrateImage(row, space, f.io, true)).status, "migrated");
    assert.equal(f.copies(), 2);
    assert.equal(f.switches(), 1);
    assert.equal(f.source.size, 3);
    await migrateImage(row, space, f.io, true);
    assert.equal(f.copies(), 2);
});
Deno.test("migration rejects same-size wrong bytes without overwriting destination", async () => {
    const f = fixture();
    f.target.set(keys.thumb, new Uint8Array([9, 9, 9]));
    await assert.rejects(() => migrateImage(row, space, f.io, true), /checksum/);
    assert.equal(f.switches(), 0);
    assert.equal(f.copies(), 0);
});
Deno.test("migration detects missing variants and keeps source on provider-switch failure", async () => {
    const f = fixture();
    f.source.delete(keys.orig);
    await assert.rejects(() => migrateImage(row, space, f.io, true), /Missing source/);
    assert.equal(f.switches(), 0);
    f.source.set(keys.orig, new Uint8Array([2, 1, 2]));
    f.io.switchProvider = async () => {
        throw new Error("record changed");
    };
    await assert.rejects(() => migrateImage(row, space, f.io, true), /record changed/);
    assert.equal(f.source.size, 3);
});
Deno.test("migration rejects forged paths, incomplete rows and skips R2/pending rows", async () => {
    const f = fixture();
    await assert.rejects(
        () =>
            migrateImage(
                { ...row, storage_path_orig: "another-space/orig.jpg" },
                space,
                f.io,
                true,
            ),
        /key/,
    );
    await assert.rejects(
        () => migrateImage({ ...row, storage_path_grid: null }, space, f.io),
        /Incomplete/,
    );
    assert.equal(
        (await migrateImage({ ...row, storage_provider: "r2" }, space, f.io, true)).status,
        "skipped",
    );
    assert.equal(
        (await migrateImage({ ...row, storage_state: "pending" }, space, f.io, true)).status,
        "skipped",
    );
});
Deno.test("migration interruption resumes verified objects without switching early", async () => {
    const f = fixture();
    const copy = f.io.copy;
    f.io.copy = async (key, object) => {
        if (key === keys.grid) throw new Error("interrupted");
        await copy(key, object);
    };
    await assert.rejects(() => migrateImage(row, space, f.io, true), /interrupted/);
    assert.equal(f.switches(), 0);
    f.io.copy = copy;
    await migrateImage(row, space, f.io, true);
    assert.equal(f.copies(), 3);
    assert.equal(f.switches(), 1);
});
