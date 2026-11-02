import * as SQLite from "expo-sqlite";

import { secureStoreUtilsMock } from "@/tests/mocks/secureStore";
import { supabaseMock } from "@/tests/mocks/supabase";
import { getOfflineDb, getCachedGalleries, getCachedGalleryImages, replaceCachedGalleries, replaceCachedGalleryImages } from "@/utils/offline/local-db";

// Execute the real SQLite upgrade/queries via Node's bundled SQLite, without a device or packages.
const { DatabaseSync } = (process as any).getBuiltinModule("node:sqlite");
describe("gallery SQLite upgrade and account isolation", () => {
    it("upgrades an interrupted v5 cache, preserves outbox, and isolates cached photos by account/space", async () => {
        const db = new DatabaseSync(":memory:");
        db.exec(`PRAGMA user_version=5;
            CREATE TABLE galleries_cache(id TEXT PRIMARY KEY,space_id TEXT,title TEXT,date TEXT,date_date TEXT,color TEXT,location TEXT,
                cover_image_path TEXT,cover_image_thumb_path TEXT,cover_image_blur_hash TEXT,cover_thumb_url TEXT,created_at TEXT,cache_scope TEXT);
            CREATE TABLE gallery_images_cache(id TEXT PRIMARY KEY,gallery_id TEXT,storage_path_thumb TEXT,storage_path_grid TEXT,storage_path_orig TEXT,
                blur_hash TEXT,created_at TEXT,width_thumb INT,height_thumb INT,width_grid INT,height_grid INT,width_orig INT,height_orig INT,
                bytes_thumb INT,bytes_grid INT,bytes_orig INT,bytes_total INT,url_thumb TEXT,url_grid TEXT,url_orig TEXT);
            CREATE TABLE sync_outbox(id TEXT PRIMARY KEY,entity TEXT,entity_id TEXT,operation TEXT,payload_json TEXT,attempts INT,created_at TEXT,last_error TEXT);
            INSERT INTO sync_outbox VALUES('preserve','wheel','id','update','{}',0,'today',NULL);
            INSERT INTO galleries_cache(id,space_id,title) VALUES('unscoped','space','old-account');`);
        const adapter = {
            execAsync: async (sql: string) => db.exec(sql),
            runAsync: async (sql: string, ...args: any[]) => db.prepare(sql).run(...args),
            getAllAsync: async (sql: string, ...args: any[]) => db.prepare(sql).all(...args),
            getFirstAsync: async (sql: string, ...args: any[]) => db.prepare(sql).get(...args),
        };
        (SQLite.openDatabaseAsync as jest.Mock).mockResolvedValueOnce(adapter);
        supabaseMock.auth.getSession.mockResolvedValue({ data: { session: { user: { id: "account-a" } } } });
        secureStoreUtilsMock.getSpaceId.mockResolvedValue("space");
        await getOfflineDb();
        expect(db.prepare("PRAGMA user_version").get().user_version).toBe(7);
        expect(db.prepare("SELECT count(*) n FROM sync_outbox").get().n).toBe(1);
        expect(await getCachedGalleries("space")).toEqual([]);
        await replaceCachedGalleries("space", [{ id: "g", space_id: "space", title: "Trip", date: "2026-10-31", color: "pink", location: "Home",
            cache_scope: "account-a/space", cover_image_path: "orig", cover_image_thumb_path: "thumb", cover_image_blur_hash: null }]);
        await replaceCachedGalleryImages("g", [{ id: "i", gallery_id: "g", created_at: "today", blur_hash: null,
            storage_path_thumb: "thumb", storage_path_grid: "orig", storage_path_orig: "orig", storage_provider: "r2", cache_scope: "account-a/space", url_thumb: "private" }]);
        expect((await getCachedGalleries("space"))[0].title).toBe("Trip");
        expect((await getCachedGalleryImages("g"))[0].storage_provider).toBe("r2");
        supabaseMock.auth.getSession.mockResolvedValue({ data: { session: { user: { id: "account-b" } } } });
        expect(await getCachedGalleries("space")).toEqual([]);
        expect(await getCachedGalleryImages("g")).toEqual([]);
        supabaseMock.auth.getSession.mockResolvedValue({ data: { session: { user: { id: "account-a" } } } });
        secureStoreUtilsMock.getSpaceId.mockResolvedValue("another-space");
        expect(await getCachedGalleryImages("g")).toEqual([]);
        db.close();
    });
});
