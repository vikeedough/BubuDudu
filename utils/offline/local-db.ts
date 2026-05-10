import type { List, Milestone, Profile, Quote, Wheel } from "@/api/endpoints/types";
import type { Gallery, GalleryImage } from "@/stores/GalleryStore";
import * as SQLite from "expo-sqlite";

const DB_NAME = "bubududu-offline.db";
const DB_VERSION = 1;

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export type OutboxEntity = "lists" | "wheel" | "milestones" | "profile_note";
export type OutboxOperation = "insert" | "update" | "delete" | "upsert";

export type OutboxItem = {
    id: string;
    entity: OutboxEntity;
    entity_id: string;
    operation: OutboxOperation;
    payload_json: string;
    created_at: string;
    attempts: number;
    last_error: string | null;
};

type CachedListRow = List & {
    updated_at?: string | null;
    deleted_at?: string | null;
};

type CachedWheelRow = Omit<Wheel, "choices"> & {
    choices_json: string;
    updated_at?: string | null;
    deleted_at?: string | null;
};

type CachedMilestoneRow = {
    id: string | number;
    space_id: string;
    title: string;
    date: string;
    updated_at?: string | null;
    deleted_at?: string | null;
};

type CachedProfileRow = Profile & {
    space_id: string;
    updated_at?: string | null;
    deleted_at?: string | null;
};

type CachedQuoteRow = Quote & {
    space_id: string;
};

type CachedGalleryRow = Omit<Gallery, "date"> & {
    date: string;
};

type CachedGalleryImageRow = GalleryImage;

function normalizeTimestamp(value: string | null | undefined): string {
    return value ?? new Date(0).toISOString();
}

function listUpdatedAt(list: Partial<List> & { updated_at?: string | null }) {
    return normalizeTimestamp(list.updated_at ?? list.last_updated_at);
}

function wheelUpdatedAt(wheel: Partial<Wheel> & { updated_at?: string | null }) {
    return normalizeTimestamp(wheel.updated_at ?? wheel.created_at);
}

function milestoneUpdatedAt(
    milestone: Partial<Milestone> & { updated_at?: string | null },
) {
    return normalizeTimestamp(milestone.updated_at ?? milestone.date);
}

function profileUpdatedAt(profile: Partial<Profile> & { updated_at?: string | null }) {
    return normalizeTimestamp(profile.updated_at ?? profile.note_updated_at ?? profile.created_at);
}

function parseChoices(value: string | null | undefined): string[] {
    if (!value) return [];
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
    } catch {
        return [];
    }
}

async function migrate(db: SQLite.SQLiteDatabase) {
    const row = await db.getFirstAsync<{ user_version: number }>(
        "PRAGMA user_version",
    );
    const currentVersion = row?.user_version ?? 0;
    if (currentVersion >= DB_VERSION) return;

    await db.execAsync(`
        PRAGMA journal_mode = WAL;

        CREATE TABLE IF NOT EXISTS lists_cache (
            id TEXT PRIMARY KEY NOT NULL,
            space_id TEXT NOT NULL,
            type TEXT NOT NULL,
            content TEXT NOT NULL,
            last_updated_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            deleted_at TEXT
        );
        CREATE INDEX IF NOT EXISTS lists_cache_space_idx
            ON lists_cache (space_id, updated_at);

        CREATE TABLE IF NOT EXISTS wheels_cache (
            id TEXT PRIMARY KEY NOT NULL,
            space_id TEXT NOT NULL,
            title TEXT NOT NULL,
            choices_json TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            deleted_at TEXT
        );
        CREATE INDEX IF NOT EXISTS wheels_cache_space_idx
            ON wheels_cache (space_id, updated_at);

        CREATE TABLE IF NOT EXISTS milestones_cache (
            id TEXT PRIMARY KEY NOT NULL,
            space_id TEXT NOT NULL UNIQUE,
            title TEXT NOT NULL,
            date TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            deleted_at TEXT
        );

        CREATE TABLE IF NOT EXISTS profiles_cache (
            id TEXT NOT NULL,
            space_id TEXT NOT NULL,
            name TEXT,
            avatar_url TEXT,
            avatar_border_color TEXT,
            created_at TEXT,
            note TEXT,
            note_updated_at TEXT,
            date_of_birth TEXT,
            updated_at TEXT NOT NULL,
            deleted_at TEXT,
            PRIMARY KEY (id, space_id)
        );
        CREATE INDEX IF NOT EXISTS profiles_cache_space_idx
            ON profiles_cache (space_id, updated_at);

        CREATE TABLE IF NOT EXISTS quotes_cache (
            id TEXT PRIMARY KEY NOT NULL,
            space_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            quote TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS quotes_cache_space_idx
            ON quotes_cache (space_id, created_at);

        CREATE TABLE IF NOT EXISTS galleries_cache (
            id TEXT PRIMARY KEY NOT NULL,
            space_id TEXT NOT NULL,
            title TEXT NOT NULL,
            date TEXT NOT NULL,
            date_date TEXT,
            color TEXT NOT NULL,
            location TEXT NOT NULL,
            cover_image_path TEXT,
            cover_image_thumb_path TEXT,
            cover_image_blur_hash TEXT,
            cover_thumb_url TEXT,
            created_at TEXT
        );
        CREATE INDEX IF NOT EXISTS galleries_cache_space_idx
            ON galleries_cache (space_id, date);

        CREATE TABLE IF NOT EXISTS gallery_images_cache (
            id TEXT PRIMARY KEY NOT NULL,
            gallery_id TEXT NOT NULL,
            storage_path_thumb TEXT,
            storage_path_grid TEXT,
            storage_path_orig TEXT,
            blur_hash TEXT,
            created_at TEXT NOT NULL,
            width_thumb INTEGER,
            height_thumb INTEGER,
            width_grid INTEGER,
            height_grid INTEGER,
            width_orig INTEGER,
            height_orig INTEGER,
            bytes_thumb INTEGER,
            bytes_grid INTEGER,
            bytes_orig INTEGER,
            bytes_total INTEGER,
            url_thumb TEXT,
            url_grid TEXT,
            url_orig TEXT
        );
        CREATE INDEX IF NOT EXISTS gallery_images_cache_gallery_idx
            ON gallery_images_cache (gallery_id, created_at);

        CREATE TABLE IF NOT EXISTS sync_outbox (
            id TEXT PRIMARY KEY NOT NULL,
            entity TEXT NOT NULL,
            entity_id TEXT NOT NULL,
            operation TEXT NOT NULL,
            payload_json TEXT NOT NULL,
            created_at TEXT NOT NULL,
            attempts INTEGER NOT NULL DEFAULT 0,
            last_error TEXT
        );
        CREATE INDEX IF NOT EXISTS sync_outbox_created_idx
            ON sync_outbox (created_at);

        PRAGMA user_version = ${DB_VERSION};
    `);
}

export async function getOfflineDb() {
    if (!dbPromise) {
        dbPromise = SQLite.openDatabaseAsync(DB_NAME).then(async (db) => {
            await migrate(db);
            return db;
        });
    }
    return dbPromise;
}

export async function clearOfflineData() {
    const db = await getOfflineDb();
    await db.execAsync(`
        DELETE FROM sync_outbox;
        DELETE FROM gallery_images_cache;
        DELETE FROM galleries_cache;
        DELETE FROM quotes_cache;
        DELETE FROM profiles_cache;
        DELETE FROM milestones_cache;
        DELETE FROM wheels_cache;
        DELETE FROM lists_cache;
    `);
}

export async function getCachedLists(spaceId: string): Promise<List[]> {
    const db = await getOfflineDb();
    const rows = await db.getAllAsync<CachedListRow>(
        `SELECT * FROM lists_cache
         WHERE space_id = ? AND deleted_at IS NULL
         ORDER BY updated_at DESC`,
        spaceId,
    );
    return rows.map((row) => ({
        id: row.id,
        type: row.type,
        content: row.content,
        last_updated_at: row.last_updated_at,
        space_id: row.space_id,
    }));
}

export async function replaceCachedLists(spaceId: string, lists: List[]) {
    const db = await getOfflineDb();
    await db.runAsync("DELETE FROM lists_cache WHERE space_id = ?", spaceId);
    for (const list of lists) {
        await upsertCachedList(list);
    }
}

export async function upsertCachedList(
    list: List & { updated_at?: string | null; deleted_at?: string | null },
) {
    const db = await getOfflineDb();
    const updatedAt = listUpdatedAt(list);
    await db.runAsync(
        `INSERT OR REPLACE INTO lists_cache
            (id, space_id, type, content, last_updated_at, updated_at, deleted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        list.id,
        list.space_id,
        list.type,
        list.content,
        list.last_updated_at,
        updatedAt,
        list.deleted_at ?? null,
    );
}

export async function markCachedListDeleted(listId: string, deletedAt: string) {
    const db = await getOfflineDb();
    await db.runAsync(
        "UPDATE lists_cache SET deleted_at = ?, updated_at = ? WHERE id = ?",
        deletedAt,
        deletedAt,
        listId,
    );
}

export async function getCachedWheels(spaceId: string): Promise<Wheel[]> {
    const db = await getOfflineDb();
    const rows = await db.getAllAsync<CachedWheelRow>(
        `SELECT * FROM wheels_cache
         WHERE space_id = ? AND deleted_at IS NULL
         ORDER BY created_at DESC`,
        spaceId,
    );
    return rows.map((row) => ({
        id: row.id,
        title: row.title,
        choices: parseChoices(row.choices_json),
        created_at: row.created_at,
        space_id: row.space_id,
    }));
}

export async function replaceCachedWheels(spaceId: string, wheels: Wheel[]) {
    const db = await getOfflineDb();
    await db.runAsync("DELETE FROM wheels_cache WHERE space_id = ?", spaceId);
    for (const wheel of wheels) {
        await upsertCachedWheel(wheel);
    }
}

export async function upsertCachedWheel(
    wheel: Wheel & { updated_at?: string | null; deleted_at?: string | null },
) {
    const db = await getOfflineDb();
    const updatedAt = wheelUpdatedAt(wheel);
    await db.runAsync(
        `INSERT OR REPLACE INTO wheels_cache
            (id, space_id, title, choices_json, created_at, updated_at, deleted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        wheel.id,
        wheel.space_id,
        wheel.title,
        JSON.stringify(wheel.choices ?? []),
        wheel.created_at,
        updatedAt,
        wheel.deleted_at ?? null,
    );
}

export async function markCachedWheelDeleted(wheelId: string, deletedAt: string) {
    const db = await getOfflineDb();
    await db.runAsync(
        "UPDATE wheels_cache SET deleted_at = ?, updated_at = ? WHERE id = ?",
        deletedAt,
        deletedAt,
        wheelId,
    );
}

export async function getCachedMilestone(
    spaceId: string,
): Promise<Milestone | null> {
    const db = await getOfflineDb();
    const row = await db.getFirstAsync<CachedMilestoneRow>(
        `SELECT * FROM milestones_cache
         WHERE space_id = ? AND deleted_at IS NULL
         LIMIT 1`,
        spaceId,
    );
    if (!row) return null;
    const numericId = Number(row.id);
    return {
        id: Number.isFinite(numericId) ? numericId : (row.id as any),
        title: row.title,
        date: row.date,
    };
}

export async function upsertCachedMilestone(
    spaceId: string,
    milestone: Milestone & { updated_at?: string | null; deleted_at?: string | null },
) {
    const db = await getOfflineDb();
    const updatedAt = milestoneUpdatedAt(milestone);
    await db.runAsync(
        `INSERT OR REPLACE INTO milestones_cache
            (id, space_id, title, date, updated_at, deleted_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        String(milestone.id ?? spaceId),
        spaceId,
        milestone.title,
        milestone.date,
        updatedAt,
        milestone.deleted_at ?? null,
    );
}

export async function getCachedProfiles(spaceId: string): Promise<Profile[]> {
    const db = await getOfflineDb();
    const rows = await db.getAllAsync<CachedProfileRow>(
        `SELECT * FROM profiles_cache
         WHERE space_id = ? AND deleted_at IS NULL
         ORDER BY updated_at DESC`,
        spaceId,
    );
    return rows.map(({ space_id: _spaceId, updated_at: _updatedAt, deleted_at: _deletedAt, ...profile }) => profile);
}

export async function getCachedProfile(
    spaceId: string,
    profileId: string,
): Promise<Profile | null> {
    const db = await getOfflineDb();
    const row = await db.getFirstAsync<CachedProfileRow>(
        `SELECT * FROM profiles_cache
         WHERE space_id = ? AND id = ? AND deleted_at IS NULL
         LIMIT 1`,
        spaceId,
        profileId,
    );
    if (!row) return null;
    const { space_id: _spaceId, updated_at: _updatedAt, deleted_at: _deletedAt, ...profile } = row;
    return profile;
}

export async function replaceCachedProfiles(spaceId: string, profiles: Profile[]) {
    const db = await getOfflineDb();
    await db.runAsync("DELETE FROM profiles_cache WHERE space_id = ?", spaceId);
    for (const profile of profiles) {
        await upsertCachedProfile(spaceId, profile);
    }
}

export async function upsertCachedProfile(
    spaceId: string,
    profile: Profile & { updated_at?: string | null; deleted_at?: string | null },
) {
    const db = await getOfflineDb();
    const updatedAt = profileUpdatedAt(profile);
    await db.runAsync(
        `INSERT OR REPLACE INTO profiles_cache
            (
                id, space_id, name, avatar_url, avatar_border_color, created_at,
                note, note_updated_at, date_of_birth, updated_at, deleted_at
            )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        profile.id,
        spaceId,
        profile.name ?? null,
        profile.avatar_url ?? null,
        profile.avatar_border_color ?? null,
        profile.created_at ?? null,
        profile.note ?? null,
        profile.note_updated_at ?? null,
        profile.date_of_birth ?? null,
        updatedAt,
        profile.deleted_at ?? null,
    );
}

export async function updateCachedProfileNote(input: {
    spaceId: string;
    userId: string;
    note: string;
    noteUpdatedAt: string;
}) {
    const existing = await getCachedProfile(input.spaceId, input.userId);
    await upsertCachedProfile(input.spaceId, {
        id: input.userId,
        name: existing?.name ?? null,
        avatar_url: existing?.avatar_url ?? null,
        avatar_border_color: existing?.avatar_border_color ?? null,
        created_at: existing?.created_at ?? input.noteUpdatedAt,
        note: input.note,
        note_updated_at: input.noteUpdatedAt,
        date_of_birth: existing?.date_of_birth ?? null,
        updated_at: input.noteUpdatedAt,
    } as Profile & { updated_at: string });
}

export async function getCachedQuotes(spaceId: string): Promise<Quote[]> {
    const db = await getOfflineDb();
    return await db.getAllAsync<CachedQuoteRow>(
        `SELECT id, created_at, quote FROM quotes_cache
         WHERE space_id = ?
         ORDER BY created_at DESC`,
        spaceId,
    );
}

export async function replaceCachedQuotes(spaceId: string, quotes: Quote[]) {
    const db = await getOfflineDb();
    await db.runAsync("DELETE FROM quotes_cache WHERE space_id = ?", spaceId);
    for (const quote of quotes) {
        await db.runAsync(
            `INSERT OR REPLACE INTO quotes_cache (id, space_id, created_at, quote)
             VALUES (?, ?, ?, ?)`,
            quote.id,
            spaceId,
            quote.created_at,
            quote.quote,
        );
    }
}

export async function getCachedGalleries(spaceId: string): Promise<Gallery[]> {
    const db = await getOfflineDb();
    const rows = await db.getAllAsync<CachedGalleryRow>(
        `SELECT * FROM galleries_cache
         WHERE space_id = ?
         ORDER BY date DESC`,
        spaceId,
    );
    return rows.map((row) => ({ ...row, date: row.date }));
}

export async function replaceCachedGalleries(
    spaceId: string,
    galleries: Gallery[],
) {
    const db = await getOfflineDb();
    await db.runAsync("DELETE FROM galleries_cache WHERE space_id = ?", spaceId);
    for (const gallery of galleries) {
        await db.runAsync(
            `INSERT OR REPLACE INTO galleries_cache
                (
                    id, space_id, title, date, date_date, color, location,
                    cover_image_path, cover_image_thumb_path,
                    cover_image_blur_hash, cover_thumb_url, created_at
                )
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            gallery.id,
            gallery.space_id,
            gallery.title,
            gallery.date instanceof Date ? gallery.date.toISOString() : gallery.date,
            gallery.date_date ?? null,
            gallery.color,
            gallery.location,
            gallery.cover_image_path ?? null,
            gallery.cover_image_thumb_path ?? null,
            gallery.cover_image_blur_hash ?? null,
            gallery.cover_thumb_url ?? null,
            gallery.created_at ?? null,
        );
    }
}

export async function getCachedGalleryImages(
    galleryId: string,
): Promise<GalleryImage[]> {
    const db = await getOfflineDb();
    return await db.getAllAsync<CachedGalleryImageRow>(
        `SELECT * FROM gallery_images_cache
         WHERE gallery_id = ?
         ORDER BY created_at DESC`,
        galleryId,
    );
}

export async function replaceCachedGalleryImages(
    galleryId: string,
    images: GalleryImage[],
) {
    const db = await getOfflineDb();
    await db.runAsync(
        "DELETE FROM gallery_images_cache WHERE gallery_id = ?",
        galleryId,
    );
    for (const image of images) {
        await db.runAsync(
            `INSERT OR REPLACE INTO gallery_images_cache
                (
                    id, gallery_id, storage_path_thumb, storage_path_grid,
                    storage_path_orig, blur_hash, created_at,
                    width_thumb, height_thumb, width_grid, height_grid,
                    width_orig, height_orig, bytes_thumb, bytes_grid,
                    bytes_orig, bytes_total, url_thumb, url_grid, url_orig
                )
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            image.id,
            image.gallery_id,
            image.storage_path_thumb ?? null,
            image.storage_path_grid ?? null,
            image.storage_path_orig ?? null,
            image.blur_hash ?? null,
            image.created_at,
            image.width_thumb ?? null,
            image.height_thumb ?? null,
            image.width_grid ?? null,
            image.height_grid ?? null,
            image.width_orig ?? null,
            image.height_orig ?? null,
            image.bytes_thumb ?? null,
            image.bytes_grid ?? null,
            image.bytes_orig ?? null,
            image.bytes_total ?? null,
            image.url_thumb ?? null,
            image.url_grid ?? null,
            image.url_orig ?? null,
        );
    }
}

export async function enqueueOutbox(item: Omit<OutboxItem, "attempts" | "last_error">) {
    const db = await getOfflineDb();
    await db.runAsync(
        `INSERT OR REPLACE INTO sync_outbox
            (id, entity, entity_id, operation, payload_json, created_at, attempts, last_error)
         VALUES (?, ?, ?, ?, ?, ?, 0, NULL)`,
        item.id,
        item.entity,
        item.entity_id,
        item.operation,
        item.payload_json,
        item.created_at,
    );
}

export async function getPendingOutbox(): Promise<OutboxItem[]> {
    const db = await getOfflineDb();
    return await db.getAllAsync<OutboxItem>(
        "SELECT * FROM sync_outbox ORDER BY created_at ASC",
    );
}

export async function getPendingOutboxCount(): Promise<number> {
    const db = await getOfflineDb();
    const row = await db.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) as count FROM sync_outbox",
    );
    return row?.count ?? 0;
}

export async function removeOutboxItem(id: string) {
    const db = await getOfflineDb();
    await db.runAsync("DELETE FROM sync_outbox WHERE id = ?", id);
}

export async function markOutboxItemFailed(id: string, message: string) {
    const db = await getOfflineDb();
    await db.runAsync(
        `UPDATE sync_outbox
         SET attempts = attempts + 1, last_error = ?
         WHERE id = ?`,
        message,
        id,
    );
}
