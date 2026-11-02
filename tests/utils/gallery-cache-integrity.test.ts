import * as SQLite from "expo-sqlite";

import { secureStoreUtilsMock } from "@/tests/mocks/secureStore";
import { supabaseMock } from "@/tests/mocks/supabase";
import { currentGalleryScope, getOfflineDb, getCachedGalleries, getCachedGalleryImages, replaceCachedGalleries, replaceCachedGalleryImages, invalidateCachedGalleries, invalidateCachedGalleryImages } from "@/utils/offline/local-db";
const { DatabaseSync } = (process as any).getBuiltinModule("node:sqlite");
const db = new DatabaseSync(":memory:");
let failId: string | null = null;
let pause: null | { id: string; started: () => void; wait: Promise<void> } = null;
const adapter: any = {
    execAsync: async (sql: string) => db.exec(sql),
    runAsync: async (sql: string, ...args: any[]) => {
        if (sql.includes("INSERT INTO gallery_images_cache") && args[0] === failId) throw new Error("disk interruption");
        if (pause && sql.includes("INSERT INTO gallery_images_cache") && args[0] === pause.id) {
            const barrier = pause; pause = null; barrier.started(); await barrier.wait;
        }
        return db.prepare(sql).run(...args);
    },
    getAllAsync: async (sql: string, ...args: any[]) => db.prepare(sql).all(...args),
    getFirstAsync: async (sql: string, ...args: any[]) => db.prepare(sql).get(...args),
    withExclusiveTransactionAsync: async (task: any) => {
        db.exec("BEGIN");
        try { await task(adapter); db.exec("COMMIT"); }
        catch (error) { db.exec("ROLLBACK"); throw error; }
    },
};
const image = (id: string, gallery_id = "g") => ({ id, gallery_id, created_at: "2026-01-01", blur_hash: null, storage_path_thumb: "thumb", storage_path_grid: "grid", storage_path_orig: "orig", cache_scope: "a/space", url_thumb: "private" });
const gallery = (id: string) => ({ id, space_id: "space", title: id, location: "home", date: "2026-01-01", color: "pink", cover_image_path: null, cover_image_thumb_path: null, cover_image_blur_hash: null, cache_scope: "a/space" });
const owner = { scope: "a/space", current: () => true };
const deferred = () => { let resolve!: () => void; const promise = new Promise<void>(r => { resolve = r; }); return { promise, resolve }; };
beforeAll(async () => { (SQLite.openDatabaseAsync as jest.Mock).mockResolvedValue(adapter); await getOfflineDb(); });
beforeEach(() => {
    failId = null; pause = null;
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session: { user: { id: "a" } } } });
    secureStoreUtilsMock.getSpaceId.mockResolvedValue("space");
    db.exec("DELETE FROM gallery_images_cache; DELETE FROM galleries_cache;");
});
afterAll(() => db.close());
it("partial gallery/image upserts preserve previously browsed entities on offline reopen", async () => {
    await replaceCachedGalleries("space", [gallery("g"), gallery("other")], owner);
    await replaceCachedGalleries("space", [gallery("g")], owner);
    await replaceCachedGalleryImages("g", [image("old"), image("new")], owner);
    await replaceCachedGalleryImages("g", [image("new")], owner);
    expect((await getCachedGalleries("space")).map(g => g.id).sort()).toEqual(["g", "other"]);
    expect((await getCachedGalleryImages("g")).map(i => i.id).sort()).toEqual(["new", "old"]);
});
it("accepted image/gallery tombstones reject stale upserts, including after reopening the cache", async () => {
    await replaceCachedGalleries("space", [gallery("g")], owner);
    await replaceCachedGalleryImages("g", [image("gone"), image("keep")], owner);
    await invalidateCachedGalleryImages("g", ["gone"], owner);
    await replaceCachedGalleryImages("g", [image("gone"), image("keep")], owner);
    expect((await getCachedGalleryImages("g")).map(i => i.id)).toEqual(["keep"]);
    await invalidateCachedGalleries("space", ["g"], owner);
    await replaceCachedGalleries("space", [gallery("g")], owner);
    await replaceCachedGalleryImages("g", [image("late-child")], owner);
    expect(await getCachedGalleries("space")).toEqual([]);
    expect(await getCachedGalleryImages("g")).toEqual([]);
});
it("rolls back a stale paused writer before committing a newer deletion", async () => {
    const started = deferred(), release = deferred();
    pause = { id: "gone", started: started.resolve, wait: release.promise };
    const older = replaceCachedGalleryImages("g", [image("gone"), image("keep")], owner);
    await started.promise;
    const deletion = invalidateCachedGalleryImages("g", ["gone"], owner);
    release.resolve(); await Promise.all([older, deletion]);
    expect(await getCachedGalleryImages("g")).toEqual([]);
    await replaceCachedGalleryImages("g", [image("gone"), image("keep")], owner);
    expect((await getCachedGalleryImages("g")).map(i => i.id)).toEqual(["keep"]);
});
it("does not cancel a durable deletion when a later stale upsert is queued", async () => {
    const deletion = invalidateCachedGalleryImages("g", ["gone"], owner);
    const stale = replaceCachedGalleryImages("g", [image("gone")], owner);
    await Promise.all([deletion, stale]);
    expect(await getCachedGalleryImages("g")).toEqual([]);
});
it("an interrupted write rolls back every row and subsequent independent galleries still commit", async () => {
    await replaceCachedGalleryImages("g", [image("original")], owner);
    failId = "failure";
    await expect(replaceCachedGalleryImages("g", [image("first"), image("failure")], owner)).rejects.toThrow("disk interruption");
    expect((await getCachedGalleryImages("g")).map(i => i.id)).toEqual(["original"]);
    failId = null;
    await Promise.all([replaceCachedGalleryImages("g", [image("next")], owner), replaceCachedGalleryImages("other", [image("independent", "other")], owner)]);
    expect((await getCachedGalleryImages("other"))[0].id).toBe("independent");
});
it("rejects scope changes and obsolete owners before publishing private rows", async () => {
    expect(await currentGalleryScope()).toBe("a/space");
    await replaceCachedGalleryImages("g", [image("old")], { scope: "a/space", current: () => false });
    secureStoreUtilsMock.getSpaceId.mockResolvedValue("different");
    await replaceCachedGalleryImages("g", [image("wrong-space")], owner);
    expect(await getCachedGalleryImages("g")).toEqual([]);
    secureStoreUtilsMock.getSpaceId.mockResolvedValue("space");
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session: { user: { id: "b" } } } });
    await replaceCachedGalleryImages("g", [image("wrong-account")], owner);
    expect(await getCachedGalleryImages("g")).toEqual([]);
    expect(db.prepare("SELECT count(*) n FROM gallery_images_cache").get().n).toBe(0);
});

it("concurrent disjoint URL/entity upserts in the same gallery retain both changes", async () => {
    await Promise.all([replaceCachedGalleryImages("g", [image("a")], owner), replaceCachedGalleryImages("g", [image("b")], owner)]);
    expect((await getCachedGalleryImages("g")).map(i => i.id).sort()).toEqual(["a", "b"]);
    await Promise.all([replaceCachedGalleries("space", [gallery("g")], owner), replaceCachedGalleries("space", [gallery("other")], owner)]);
    expect((await getCachedGalleries("space")).map(g => g.id).sort()).toEqual(["g", "other"]);
});
