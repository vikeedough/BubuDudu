import * as SQLite from "expo-sqlite";

import type {
    Expense,
    ExpenseBudget,
    ExpenseCategory,
    List,
    Milestone,
    Profile,
    Quote,
    Wheel,
} from "@/api/endpoints/types";
import type { Gallery, GalleryImage } from "@/stores/GalleryStore";

const DB_NAME = "bubududu-offline.db";
const DB_VERSION = 4;

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export type OutboxEntity =
    | "lists"
    | "wheel"
    | "milestones"
    | "profile_note"
    | "expenses"
    | "expense_categories"
    | "expense_budgets";
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

type CachedExpenseCategoryRow = Omit<ExpenseCategory, "is_default"> & {
    is_default: number;
};

type CachedExpenseRow = Omit<
    Expense,
    | "amount"
    | "base_amount"
    | "exchange_rate"
    | "paid_by"
> & {
    paid_by?: string | null;
    amount: number | string;
    base_amount: number | string | null;
    exchange_rate: number | string | null;
};

type CachedExpenseBudgetRow = Omit<ExpenseBudget, "amount"> & {
    amount: number | string;
};

export type CachedExchangeRate = {
    from_currency: string;
    to_currency: string;
    rate: number;
    rate_date: string;
    fetched_at: string;
};

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

function expenseCategoryUpdatedAt(
    category: Partial<ExpenseCategory> & { updated_at?: string | null },
) {
    return normalizeTimestamp(category.updated_at ?? category.created_at);
}

function expenseUpdatedAt(expense: Partial<Expense> & { updated_at?: string | null }) {
    return normalizeTimestamp(expense.updated_at ?? expense.created_at ?? expense.paid_at);
}

function expenseBudgetUpdatedAt(
    budget: Partial<ExpenseBudget> & { updated_at?: string | null },
) {
    return normalizeTimestamp(budget.updated_at ?? budget.created_at);
}

function toNumber(value: number | string | null | undefined): number | null {
    if (value === null || value === undefined) return null;
    const parsed = typeof value === "number" ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : null;
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

        CREATE TABLE IF NOT EXISTS expense_categories_cache (
            id TEXT PRIMARY KEY NOT NULL,
            space_id TEXT NOT NULL,
            created_by TEXT,
            name TEXT NOT NULL,
            color TEXT NOT NULL,
            sort_order INTEGER NOT NULL DEFAULT 0,
            is_default INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            deleted_at TEXT
        );
        CREATE INDEX IF NOT EXISTS expense_categories_cache_space_idx
            ON expense_categories_cache (space_id, updated_at, deleted_at);

        CREATE TABLE IF NOT EXISTS expenses_cache (
            id TEXT PRIMARY KEY NOT NULL,
            space_id TEXT NOT NULL,
            created_by TEXT NOT NULL,
            paid_by TEXT NOT NULL,
            category_id TEXT,
            category_name TEXT NOT NULL,
            category_color TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            amount REAL NOT NULL,
            currency TEXT NOT NULL,
            base_amount REAL,
            base_currency TEXT NOT NULL,
            exchange_rate REAL,
            exchange_rate_date TEXT,
            conversion_status TEXT NOT NULL,
            paid_at TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            deleted_at TEXT
        );
        CREATE INDEX IF NOT EXISTS expenses_cache_space_paid_at_idx
            ON expenses_cache (space_id, paid_at);
        CREATE INDEX IF NOT EXISTS expenses_cache_space_sync_idx
            ON expenses_cache (space_id, updated_at, deleted_at);

        CREATE TABLE IF NOT EXISTS expense_exchange_rates_cache (
            from_currency TEXT NOT NULL,
            to_currency TEXT NOT NULL,
            rate REAL NOT NULL,
            rate_date TEXT NOT NULL,
            fetched_at TEXT NOT NULL,
            PRIMARY KEY (from_currency, to_currency)
        );

        CREATE TABLE IF NOT EXISTS expense_budgets_cache (
            id TEXT PRIMARY KEY NOT NULL,
            space_id TEXT NOT NULL,
            created_by TEXT NOT NULL,
            scope TEXT NOT NULL,
            owner_user_id TEXT,
            category_id TEXT NOT NULL,
            category_name TEXT NOT NULL,
            category_color TEXT NOT NULL,
            month TEXT NOT NULL,
            amount REAL NOT NULL,
            currency TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            deleted_at TEXT
        );
        CREATE INDEX IF NOT EXISTS expense_budgets_cache_space_month_idx
            ON expense_budgets_cache (space_id, month, deleted_at);
        CREATE INDEX IF NOT EXISTS expense_budgets_cache_space_sync_idx
            ON expense_budgets_cache (space_id, updated_at, deleted_at);

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

    const expenseColumns = await db.getAllAsync<{ name: string }>(
        "PRAGMA table_info(expenses_cache)",
    );
    const hasPaidBy = expenseColumns.some((column) => column.name === "paid_by");
    if (!hasPaidBy) {
        await db.runAsync("ALTER TABLE expenses_cache ADD COLUMN paid_by TEXT");
        await db.runAsync(
            "UPDATE expenses_cache SET paid_by = created_by WHERE paid_by IS NULL",
        );
    }

    await db.runAsync(
        "UPDATE expenses_cache SET paid_by = created_by WHERE paid_by IS NULL",
    );
    await db.runAsync(
        `CREATE INDEX IF NOT EXISTS expenses_cache_space_paid_by_paid_at_idx
         ON expenses_cache (space_id, paid_by, paid_at)`,
    );
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
        DELETE FROM expense_budgets_cache;
        DELETE FROM expense_exchange_rates_cache;
        DELETE FROM expenses_cache;
        DELETE FROM expense_categories_cache;
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

export async function getCachedExpenseCategories(
    spaceId: string,
): Promise<ExpenseCategory[]> {
    const db = await getOfflineDb();
    const rows = await db.getAllAsync<CachedExpenseCategoryRow>(
        `SELECT * FROM expense_categories_cache
         WHERE space_id = ? AND deleted_at IS NULL
         ORDER BY sort_order ASC, name ASC`,
        spaceId,
    );

    return rows.map((row) => ({
        ...row,
        is_default: Boolean(row.is_default),
    }));
}

export async function replaceCachedExpenseCategories(
    spaceId: string,
    categories: ExpenseCategory[],
) {
    const db = await getOfflineDb();
    await db.runAsync(
        "DELETE FROM expense_categories_cache WHERE space_id = ?",
        spaceId,
    );
    for (const category of categories) {
        await upsertCachedExpenseCategory(category);
    }
}

export async function upsertCachedExpenseCategory(
    category: ExpenseCategory & {
        updated_at?: string | null;
        deleted_at?: string | null;
    },
) {
    const db = await getOfflineDb();
    const updatedAt = expenseCategoryUpdatedAt(category);
    await db.runAsync(
        `INSERT OR REPLACE INTO expense_categories_cache
            (
                id, space_id, created_by, name, color, sort_order, is_default,
                created_at, updated_at, deleted_at
            )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        category.id,
        category.space_id,
        category.created_by ?? null,
        category.name,
        category.color,
        category.sort_order ?? 0,
        category.is_default ? 1 : 0,
        category.created_at,
        updatedAt,
        category.deleted_at ?? null,
    );
}

export async function markCachedExpenseCategoryDeleted(
    categoryId: string,
    deletedAt: string,
) {
    const db = await getOfflineDb();
    await db.runAsync(
        `UPDATE expense_categories_cache
         SET deleted_at = ?, updated_at = ?
         WHERE id = ?`,
        deletedAt,
        deletedAt,
        categoryId,
    );
}

function normalizeCachedExpense(row: CachedExpenseRow): Expense {
    return {
        ...row,
        paid_by: row.paid_by ?? row.created_by,
        amount: toNumber(row.amount) ?? 0,
        base_amount: toNumber(row.base_amount),
        exchange_rate: toNumber(row.exchange_rate),
    };
}

export async function getCachedExpenses(spaceId: string): Promise<Expense[]> {
    const db = await getOfflineDb();
    const rows = await db.getAllAsync<CachedExpenseRow>(
        `SELECT * FROM expenses_cache
         WHERE space_id = ? AND deleted_at IS NULL
         ORDER BY paid_at DESC, created_at DESC`,
        spaceId,
    );
    return rows.map(normalizeCachedExpense);
}

export async function replaceCachedExpenses(
    spaceId: string,
    expenses: Expense[],
) {
    const db = await getOfflineDb();
    await db.runAsync("DELETE FROM expenses_cache WHERE space_id = ?", spaceId);
    for (const expense of expenses) {
        await upsertCachedExpense(expense);
    }
}

export async function upsertCachedExpense(
    expense: Expense & { updated_at?: string | null; deleted_at?: string | null },
) {
    const db = await getOfflineDb();
    const updatedAt = expenseUpdatedAt(expense);
    await db.runAsync(
        `INSERT OR REPLACE INTO expenses_cache
            (
                id, space_id, created_by, paid_by, category_id, category_name,
                category_color, title, description, amount, currency,
                base_amount, base_currency, exchange_rate, exchange_rate_date,
                conversion_status, paid_at, created_at, updated_at, deleted_at
            )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        expense.id,
        expense.space_id,
        expense.created_by,
        expense.paid_by,
        expense.category_id ?? null,
        expense.category_name,
        expense.category_color,
        expense.title,
        expense.description ?? null,
        expense.amount,
        expense.currency,
        expense.base_amount ?? null,
        expense.base_currency,
        expense.exchange_rate ?? null,
        expense.exchange_rate_date ?? null,
        expense.conversion_status,
        expense.paid_at,
        expense.created_at,
        updatedAt,
        expense.deleted_at ?? null,
    );
}

export async function markCachedExpenseDeleted(
    expenseId: string,
    deletedAt: string,
) {
    const db = await getOfflineDb();
    await db.runAsync(
        `UPDATE expenses_cache
         SET deleted_at = ?, updated_at = ?
         WHERE id = ?`,
        deletedAt,
        deletedAt,
        expenseId,
    );
}

function normalizeCachedExpenseBudget(row: CachedExpenseBudgetRow): ExpenseBudget {
    return {
        ...row,
        amount: toNumber(row.amount) ?? 0,
    };
}

export async function getCachedExpenseBudgets(
    spaceId: string,
): Promise<ExpenseBudget[]> {
    const db = await getOfflineDb();
    const rows = await db.getAllAsync<CachedExpenseBudgetRow>(
        `SELECT * FROM expense_budgets_cache
         WHERE space_id = ? AND deleted_at IS NULL
         ORDER BY month DESC, category_name ASC`,
        spaceId,
    );
    return rows.map(normalizeCachedExpenseBudget);
}

export async function replaceCachedExpenseBudgets(
    spaceId: string,
    budgets: ExpenseBudget[],
) {
    const db = await getOfflineDb();
    await db.runAsync(
        "DELETE FROM expense_budgets_cache WHERE space_id = ?",
        spaceId,
    );
    for (const budget of budgets) {
        await upsertCachedExpenseBudget(budget);
    }
}

export async function upsertCachedExpenseBudget(
    budget: ExpenseBudget & { updated_at?: string | null; deleted_at?: string | null },
) {
    const db = await getOfflineDb();
    const updatedAt = expenseBudgetUpdatedAt(budget);
    await db.runAsync(
        `INSERT OR REPLACE INTO expense_budgets_cache
            (
                id, space_id, created_by, scope, owner_user_id, category_id,
                category_name, category_color, month, amount, currency,
                created_at, updated_at, deleted_at
            )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        budget.id,
        budget.space_id,
        budget.created_by,
        budget.scope,
        budget.owner_user_id ?? null,
        budget.category_id,
        budget.category_name,
        budget.category_color,
        budget.month,
        budget.amount,
        budget.currency,
        budget.created_at,
        updatedAt,
        budget.deleted_at ?? null,
    );
}

export async function markCachedExpenseBudgetDeleted(
    budgetId: string,
    deletedAt: string,
) {
    const db = await getOfflineDb();
    await db.runAsync(
        `UPDATE expense_budgets_cache
         SET deleted_at = ?, updated_at = ?
         WHERE id = ?`,
        deletedAt,
        deletedAt,
        budgetId,
    );
}

export async function getCachedExchangeRate(
    fromCurrency: string,
    toCurrency: string,
): Promise<CachedExchangeRate | null> {
    const db = await getOfflineDb();
    return await db.getFirstAsync<CachedExchangeRate>(
        `SELECT * FROM expense_exchange_rates_cache
         WHERE from_currency = ? AND to_currency = ?
         LIMIT 1`,
        fromCurrency,
        toCurrency,
    );
}

export async function upsertCachedExchangeRate(rate: CachedExchangeRate) {
    const db = await getOfflineDb();
    await db.runAsync(
        `INSERT OR REPLACE INTO expense_exchange_rates_cache
            (from_currency, to_currency, rate, rate_date, fetched_at)
         VALUES (?, ?, ?, ?, ?)`,
        rate.from_currency,
        rate.to_currency,
        rate.rate,
        rate.rate_date,
        rate.fetched_at,
    );
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
