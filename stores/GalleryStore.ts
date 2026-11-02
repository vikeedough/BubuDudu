import { create } from "zustand";

import { supabase } from "@/api/clients/supabaseClient";
import { toast } from "@/toast/api";
import { removeGalleryTempFiles } from "@/utils/gallery-media";
import { createGalleryRenewalQueue } from "@/utils/gallery-renewal";
import { applySignedImageFields, galleryRequest, needsUrlRefresh, refreshSignedImages, uploadR2Image } from "@/utils/gallery-storage";
import { generateBlurhash } from "@/utils/generateBlurhash";
import { generateVariants } from "@/utils/generateImageVariants";
import {
    currentGalleryScope,
    invalidateCachedGalleries,
    invalidateCachedGalleryImages,
    getCachedGalleries,
    getCachedGalleryImages,
    replaceCachedGalleries,
    replaceCachedGalleryImages,
} from "@/utils/offline/local-db";
import { getIsOnline } from "@/utils/offline/network";
import { runWithConcurrency } from "@/utils/runWithConcurrency";
import { getSpaceId } from "@/utils/secure-store";

const GALLERIES_PAGE_SIZE = 10;
const IMAGES_PAGE_SIZE = 20;
let galleryGeneration = 0;
const renewImages = createGalleryRenewalQueue<Partial<GalleryImage>>();
const renewCovers = createGalleryRenewalQueue<string>();
const readRevisions = new Map<string, number>();
const hiddenImages = new Map<string, Set<string>>();
const hiddenGalleries = new Set<string>();
const uploadJobs = new Map<string, symbol>();
const deleteJobs = new Map<string, symbol>();
const reconciliations = new Map<string, Promise<GalleryImage[]>>();

async function readImageWindow(galleryId: string, count: number, current: () => Promise<boolean>, ascending: boolean) {
    const rows: GalleryImage[] = [];
    let cursor: GalleryImage | undefined;
    while (rows.length < count && await current()) {
        const limit = Math.min(200, count - rows.length);
        let query = supabase.from("date_images").select("*").eq("gallery_id", galleryId).eq("storage_state", "ready");
        if (cursor) query = query.or(`created_at.${ascending ? "gt" : "lt"}.${quotePostgrest(cursor.created_at)},and(created_at.eq.${quotePostgrest(cursor.created_at)},id.${ascending ? "gt" : "lt"}.${quotePostgrest(cursor.id)})`);
        const { data, error } = await query.order("created_at", { ascending }).order("id", { ascending }).limit(limit);
        if (error) return { data: rows, error, hasMore: false };
        const page = (data ?? []) as GalleryImage[];
        rows.push(...page);
        if (page.length < limit) return { data: rows, error: null, hasMore: false };
        cursor = page[page.length - 1];
    }
    return { data: rows, error: null, hasMore: rows.length >= count };
}


function beginGalleryRead(key: string, identity: () => string = () => "") {
    const generation = galleryGeneration;
    const revision = (readRevisions.get(key) ?? 0) + 1;
    readRevisions.set(key, revision);
    const snapshot = identity();
    let scope: string | null = null;
    const current = () => generation === galleryGeneration && readRevisions.get(key) === revision && identity() === snapshot;
    return {
        current,
        get scope() { return scope; },
        async capture() { scope = await currentGalleryScope(); return current() && scope ? scope : null; },
        async valid() { return current() && !!scope && await currentGalleryScope() === scope && current(); },
        cache() { return scope ? { scope, current } : undefined; },
    };
}
function invalidateGalleryReads(galleryId?: string) {
    const key = galleryId ? `images/${galleryId}` : "list";
    readRevisions.set(key, (readRevisions.get(key) ?? 0) + 1);
}


function mergeUniqueById<T extends { id: string }>(prev: T[], next: T[]): T[] {
    if (next.length === 0) return prev;
    if (prev.length === 0) return next;

    const updated = new Map(next.map((item) => [item.id, item]));
    const merged = prev.map((item) => updated.get(item.id) ?? item);
    const seen = new Set(prev.map((item) => item.id));
    for (const item of next) if (!seen.has(item.id)) { seen.add(item.id); merged.push(item); }
    return merged;
}

function chunk<T>(items: T[], size: number): T[][] {
    if (items.length === 0) return [];
    const out: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
        out.push(items.slice(i, i + size));
    }
    return out;
}

function isNonEmptyString(value: unknown): value is string {
    return typeof value === "string" && value.length > 0;
}

function getErrorMessage(err: unknown, fallback: string): string {
    if (err instanceof Error) return err.message;
    if (
        err &&
        typeof err === "object" &&
        "message" in err &&
        typeof (err as { message?: unknown }).message === "string"
    ) {
        return String((err as { message: string }).message);
    }
    return fallback;
}

function extractDateOnly(value: string): string | null {
    const isoDatePrefix = /^(\d{4}-\d{2}-\d{2})/.exec(value)?.[1];
    if (isoDatePrefix) return isoDatePrefix;

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toISOString().slice(0, 10);
}

function getGallerySortDate(value: string | Date | null | undefined): string | null {
    if (value instanceof Date) return value.toISOString();
    return isNonEmptyString(value) ? value : null;
}

function quotePostgrest(value: string): string {
    return `"${value.replace(/"/g, '\\"')}"`;
}

export type Gallery = {
    id: string;
    space_id: string;
    title: string;
    date: string | Date;
    date_date?: string | null;
    color: string;
    location: string;

    cover_image_path: string | null;
    cover_image_thumb_path: string | null;
    cover_image_blur_hash: string | null;

    cover_thumb_url?: string | null;
    cache_scope?: string;
    cover_expires_at?: string;

    created_at?: string;
    storage_deleting?: boolean;
};

export type GalleryImage = {
    id: string;
    gallery_id: string;
    storage_provider?: "supabase" | "r2";
    storage_state?: "pending" | "ready" | "deleting";
    urls_expires_at?: string;
    cache_scope?: string;

    storage_path_thumb: string;
    storage_path_grid: string;
    storage_path_orig: string;

    blur_hash: string | null;
    created_at: string;

    width_thumb?: number | null;
    height_thumb?: number | null;
    width_grid?: number | null;
    height_grid?: number | null;
    width_orig?: number | null;
    height_orig?: number | null;

    bytes_thumb?: number | null;
    bytes_grid?: number | null;
    bytes_orig?: number | null;
    bytes_total?: number | null;

    url_thumb?: string;
    url_grid?: string;
    url_orig?: string;
};

function updateGalleryInList(
    galleries: Gallery[],
    updatedGallery: Gallery,
): Gallery[] {
    return galleries.map((gallery) =>
        gallery.id === updatedGallery.id
            ? {
                  ...gallery,
                  ...updatedGallery,
                  cover_thumb_url:
                      updatedGallery.cover_thumb_url ??
                      gallery.cover_thumb_url ??
                      null,
              }
            : gallery,
    );
}

function omitRecordKey<T>(
    record: Record<string, T>,
    key: string,
): Record<string, T> {
    const { [key]: _removed, ...rest } = record;
    return rest;
}

async function attachSignedCoverThumbUrls(galleries: Gallery[]): Promise<Gallery[]> {
    if (galleries.length === 0) return [];

    const session = await supabase.auth.getSession();
    const userId = session?.data?.session?.user.id;
    const withCoverThumbUrl = galleries.map((gallery) => ({
        ...gallery,
        cover_thumb_url: null,
        cache_scope: userId ? `${userId}/${gallery.space_id}` : undefined,
    }));

    const thumbPaths = Array.from(
        new Set(
            withCoverThumbUrl
                .map((gallery) => gallery.cover_image_thumb_path)
                .filter(isNonEmptyString),
        ),
    );

    if (thumbPaths.length === 0) return withCoverThumbUrl;

    const signedByPath: Record<string, string> = {};

    const { data: batchSigned, error: batchErr } = await supabase.functions.invoke(
        "sign-gallery-cover-urls",
        {
            body: {
                paths: thumbPaths,
            },
        },
    );

    if (batchErr) {
        console.warn("Batch cover signing failed, falling back per-path", batchErr);
    } else if (batchSigned && typeof batchSigned === "object") {
        for (const path of thumbPaths) {
            const maybeUrl = (batchSigned as Record<string, unknown>)[path];
            if (typeof maybeUrl === "string" && maybeUrl.length > 0) {
                signedByPath[path] = maybeUrl;
            }
        }
    }

    // A failed authenticated signer must never fall back to provider-blind storage access.
    return withCoverThumbUrl.map((gallery) => {
        const thumbPath = gallery.cover_image_thumb_path;
        if (!isNonEmptyString(thumbPath)) return gallery;
        return {
            ...gallery,
            cover_thumb_url: signedByPath[thumbPath] ?? null,
            cache_scope: userId ? `${userId}/${gallery.space_id}` : undefined,
            cover_expires_at: new Date(Date.now() + 3600000).toISOString(),
        };
    });
}

export type GalleryState = {
    galleries: Gallery[];
    galleriesQuery: { searchText: string; sortDir: "asc" | "desc" };
    galleriesPage: {
        cursor: { date: string; id: string } | null;
        hasMore: boolean;
        isLoadingInitial: boolean;
        isLoadingMore: boolean;
    };

    imagesByGalleryId: Record<string, GalleryImage[]>;
    imagesPageByGalleryId: Record<
        string,
        {
            cursor: { created_at: string; id: string } | null;
            hasMore: boolean;
            isLoadingInitial: boolean;
            isLoadingMore: boolean;
        }
    >;

    imageSortByGalleryId: Record<string, "asc" | "desc">;
    setImageSort: (galleryId: string, direction: "asc" | "desc") => Promise<GalleryImage[]>;
    refreshCoverUrls: (ids: string[], force?: boolean) => Promise<void>;
    imageErrorsByGalleryId: Record<string, string | null>;
    galleryError: string | null;
    reconcileGalleryImages: (galleryId: string) => Promise<GalleryImage[]>;

    isLoadingGalleries: boolean;
    isLoadingImagesByGalleryId: Record<string, boolean>;
    isUploadingByGalleryId: Record<string, boolean>;
    error: string | null;

    // Actions
    fetchGalleries: () => Promise<Gallery[]>;
    fetchGalleryImages: (galleryId: string) => Promise<GalleryImage[]>;

    // Pagination actions (new)
    setGalleriesQuery: (
        partial: Partial<{ searchText: string; sortDir: "asc" | "desc" }>,
    ) => void;
    loadInitialGalleries: () => Promise<Gallery[]>;
    loadMoreGalleries: () => Promise<Gallery[]>;
    refreshGalleries: () => Promise<Gallery[]>;

    loadInitialGalleryImages: (galleryId: string) => Promise<GalleryImage[]>;
    loadMoreGalleryImages: (galleryId: string) => Promise<GalleryImage[]>;
    refreshGalleryImages: (galleryId: string) => Promise<GalleryImage[]>;

    addNewGallery: (input: {
        title: string;
        date: string;
        color: string;
        location: string;
    }) => Promise<Gallery | null>;
    updateGalleryDetails: (input: {
        galleryId: string;
        title: string;
        date: string;
        location: string;
    }) => Promise<Gallery | null>;

    uploadGalleryImages: (
        galleryId: string,
        images: string[],
    ) => Promise<boolean>;

    deleteOneGalleryImage: (
        galleryId: string,
        imageId: string,
    ) => Promise<boolean>;
    deleteMultipleGalleryImages: (
        galleryId: string,
        imageIds: string[],
    ) => Promise<boolean>;

    deleteGallery: (
        galleryId: string,
        options?: { showToast?: boolean },
    ) => Promise<boolean>;

    refreshImageUrls: (galleryId: string, ids?: string[], force?: boolean) => Promise<GalleryImage[]>;

    // Helpers
    clear: () => void;
};

export const useGalleryStore = create<GalleryState>((set, get) => ({
    galleries: [],
    galleriesQuery: { searchText: "", sortDir: "desc" },
    galleriesPage: {
        cursor: null,
        hasMore: true,
        isLoadingInitial: false,
        isLoadingMore: false,
    },

    imagesByGalleryId: {},
    imageSortByGalleryId: {},
    imagesPageByGalleryId: {},

    imageErrorsByGalleryId: {},
    galleryError: null,
    isLoadingGalleries: false,
    isLoadingImagesByGalleryId: {},
    isUploadingByGalleryId: {},
    error: null,

    clear: () => {
        galleryGeneration++;
        readRevisions.clear();
        hiddenImages.clear();
        hiddenGalleries.clear();
        uploadJobs.clear();
        deleteJobs.clear();
        reconciliations.clear();
        set({
            galleries: [],
            galleriesQuery: { searchText: "", sortDir: "desc" },
            galleriesPage: {
                cursor: null,
                hasMore: true,
                isLoadingInitial: false,
                isLoadingMore: false,
            },
            imagesByGalleryId: {},
            imageSortByGalleryId: {},
            imagesPageByGalleryId: {},
            imageErrorsByGalleryId: {},
            galleryError: null,
            isLoadingGalleries: false,
            isLoadingImagesByGalleryId: {},
            isUploadingByGalleryId: {},
            error: null,
        });
    },

    setGalleriesQuery: (partial) => {
        set((state) => ({
            galleriesQuery: {
                ...state.galleriesQuery,
                ...partial,
            },
        }));
        void get().loadInitialGalleries();
    },

    loadInitialGalleries: async () => {
        const owner = beginGalleryRead("list", () => JSON.stringify(get().galleriesQuery));
        const querySnapshot = { ...get().galleriesQuery };
        set({
            galleryError: null,
            isLoadingGalleries: true,
            error: null,
            galleriesPage: {
                cursor: null,
                hasMore: true,
                isLoadingInitial: true,
                isLoadingMore: false,
            },
        });

        try {
            const scope = await owner.capture();
            const spaceId = scope?.split("/")[1];
            if (!spaceId) {
                if (!owner.current()) return [];
                set({
                    galleries: [],
                    isLoadingGalleries: false,
                    galleriesPage: {
                        cursor: null,
                        hasMore: false,
                        isLoadingInitial: false,
                        isLoadingMore: false,
                    },
                });
                return [];
            }

            const { searchText, sortDir } = querySnapshot;
            const ascending = sortDir === "asc";
            const online = getIsOnline();

            let query: any = null;
            if (online) {
                query = supabase
                    .from("galleries")
                    .select("*")
                    .eq("space_id", spaceId)
                    .eq("storage_deleting", false);

                if (searchText.trim().length > 0) {
                    query = query.ilike("title", `%${searchText}%`);
                }

                query = query
                    .order("date", { ascending })
                    .order("id", { ascending })
                    .limit(GALLERIES_PAGE_SIZE);
            }

            const cached = await getCachedGalleries(spaceId);
            const cachedForQuery = cached
                .filter((gallery) => !gallery.storage_deleting)
                .filter((gallery) =>
                    searchText.trim().length === 0
                        ? true
                        : gallery.title
                              .toLowerCase()
                              .includes(searchText.trim().toLowerCase()),
                )
                .sort((a, b) => {
                    const aDate = getGallerySortDate(a.date) ?? "";
                    const bDate = getGallerySortDate(b.date) ?? "";
                    return ascending
                        ? aDate.localeCompare(bDate)
                        : bDate.localeCompare(aDate);
                });

            if (!await owner.valid()) return [];
            if (cachedForQuery.length > 0) {
                set({
                    galleries: cachedForQuery,
                    galleriesPage: {
                        cursor: null,
                        hasMore: false,
                        isLoadingInitial: false,
                        isLoadingMore: false,
                    },
                });
            }

            if (!online) {
                return cachedForQuery;
            }

            const { data, error } = await query;
            if (!await owner.valid()) return [];
            if (error) {
                console.error("Error loading initial galleries:", error);
                set({ error: error.message, galleryError: error.message });
                return cachedForQuery;
            }

            if (!searchText.trim()) {
                const found = new Set(((data as Gallery[]) ?? []).map((row) => row.id));
                for (const batch of chunk(cached.filter((row) => !found.has(row.id)), 200)) {
                    if (!await owner.valid()) return [];
                    const checked = await supabase.from("galleries").select("id").eq("space_id", spaceId).eq("storage_deleting", false).in("id", batch.map((row) => row.id));
                    if (!await owner.valid()) return [];
                    if (!checked.error && Array.isArray(checked.data)) {
                        const removed = batch.filter((row) => !checked.data.some((ready) => ready.id === row.id)).map((row) => row.id);
                        removed.forEach((id) => hiddenGalleries.add(id));
                        await invalidateCachedGalleries(spaceId, removed, owner.cache());
                    }
                }
            }

            const signed = await attachSignedCoverThumbUrls(
                ((data as Gallery[]) ?? []).filter((row) => !hiddenGalleries.has(row.id)),
            );

            if (!await owner.valid()) return [];
            await replaceCachedGalleries(spaceId, signed, owner.cache());
            if (!await owner.valid()) return [];

            const last = signed[signed.length - 1];
            const cursorDate = getGallerySortDate(last?.date);
            const cursor = cursorDate
                ? { date: cursorDate, id: String(last.id) }
                : null;

            set({
                galleries: signed,
                galleriesPage: {
                    cursor,
                    hasMore: signed.length === GALLERIES_PAGE_SIZE,
                    isLoadingInitial: false,
                    isLoadingMore: false,
                },
            });

            return signed;
        } catch (error) {
            if (await owner.valid()) set({ error: getErrorMessage(error, "Gallery could not load. Please retry."), galleryError: getErrorMessage(error, "Gallery could not load. Please retry.") });
            return get().galleries;
        } finally {
            if (owner.current() && (!owner.scope || await owner.valid())) set((state) => ({
                isLoadingGalleries: false,
                galleriesPage: {
                    ...state.galleriesPage,
                    isLoadingInitial: false,
                    isLoadingMore: false,
                },
            }));
        }
    },

    loadMoreGalleries: async () => {
        const { galleriesPage } = get();
        if (galleriesPage.isLoadingMore || galleriesPage.isLoadingInitial) {
            return get().galleries;
        }
        if (!galleriesPage.hasMore) return get().galleries;
        if (!galleriesPage.cursor) return get().galleries;

        const owner = beginGalleryRead("list", () => JSON.stringify(get().galleriesQuery));
        const querySnapshot = { ...get().galleriesQuery };
        const cursorSnapshot = galleriesPage.cursor;
        set((state) => ({
            galleriesPage: {
                ...state.galleriesPage,
                isLoadingMore: true,
            },
        }));

        try {
            if (!await owner.capture()) return [];
            const spaceId = owner.scope?.split("/")[1];
            if (!spaceId) return get().galleries;
            if (!getIsOnline()) return get().galleries;

            const { searchText, sortDir } = querySnapshot;
            const ascending = sortDir === "asc";
            const cursor = cursorSnapshot;
            if (!cursor) return get().galleries;
            const quotedCursorDate = quotePostgrest(cursor.date);
            const quotedCursorId = quotePostgrest(cursor.id);

            let query = supabase
                .from("galleries")
                .select("*")
                .eq("space_id", spaceId)
                .eq("storage_deleting", false);

            if (searchText.trim().length > 0) {
                query = query.ilike("title", `%${searchText}%`);
            }

            if (sortDir === "desc") {
                query = query.or(
                    `date.lt.${quotedCursorDate},and(date.eq.${quotedCursorDate},id.lt.${quotedCursorId})`,
                );
            } else {
                query = query.or(
                    `date.gt.${quotedCursorDate},and(date.eq.${quotedCursorDate},id.gt.${quotedCursorId})`,
                );
            }

            query = query
                .order("date", { ascending })
                .order("id", { ascending })
                .limit(GALLERIES_PAGE_SIZE);

            const { data, error } = await query;
            if (!await owner.valid()) return [];
            if (error) {
                console.error("Error loading more galleries:", error);
                set({ error: error.message, galleryError: error.message });
                return get().galleries;
            }

            const signed = await attachSignedCoverThumbUrls(
                ((data as Gallery[]) ?? []).filter((row) => !hiddenGalleries.has(row.id)),
            );

            if (!await owner.valid()) return [];
            const lastFetched = signed[signed.length - 1];
            const lastFetchedCursorDate = getGallerySortDate(lastFetched?.date);
            const nextCursor = lastFetchedCursorDate
                ? {
                      date: lastFetchedCursorDate,
                      id: String(lastFetched.id),
                  }
                : get().galleriesPage.cursor;

            set((state) => ({
                galleries: mergeUniqueById(state.galleries, signed),
                galleriesPage: {
                    cursor: nextCursor,
                    hasMore: signed.length === GALLERIES_PAGE_SIZE,
                    isLoadingInitial: false,
                    isLoadingMore: false,
                },
            }));

            await replaceCachedGalleries(spaceId, signed, owner.cache());

            return get().galleries;
        } catch (error) {
            if (await owner.valid()) set({ error: getErrorMessage(error, "Gallery could not load. Please retry."), galleryError: getErrorMessage(error, "Gallery could not load. Please retry.") });
            return get().galleries;
        } finally {
            if (owner.current() && (!owner.scope || await owner.valid())) set((state) => ({
                galleriesPage: {
                    ...state.galleriesPage,
                    isLoadingMore: false,
                },
            }));
        }
    },

    refreshGalleries: async () => {
        return await get().loadInitialGalleries();
    },

    loadInitialGalleryImages: async (galleryId: string) => {
        const direction = get().imageSortByGalleryId[galleryId] ?? "desc";
        const ascending = direction === "asc";
        const owner = beginGalleryRead(`images/${galleryId}`, () => get().imageSortByGalleryId[galleryId] ?? "desc");
        set((state) => ({
            imageErrorsByGalleryId: { ...state.imageErrorsByGalleryId, [galleryId]: null },
            imagesByGalleryId: {
                ...state.imagesByGalleryId,
                [galleryId]: state.imagesByGalleryId[galleryId] ?? [],
            },
            imagesPageByGalleryId: {
                ...state.imagesPageByGalleryId,
                [galleryId]: {
                    cursor: null,
                    hasMore: true,
                    isLoadingInitial: true,
                    isLoadingMore: false,
                },
            },
            isLoadingImagesByGalleryId: {
                ...state.isLoadingImagesByGalleryId,
                [galleryId]: true,
            },
            error: null,
        }));

        try {
            if (!await owner.capture()) return [];
            const fromDisk = await getCachedGalleryImages(galleryId);
            const cached = mergeUniqueById(fromDisk, get().imagesByGalleryId[galleryId] ?? [])
                .filter((row) => (!row.cache_scope || row.cache_scope === owner.scope) && !hiddenImages.get(galleryId)?.has(row.id));
            if (!await owner.valid()) return [];
            if (cached.length > 0) {
                set((state) => ({
                    imagesByGalleryId: {
                        ...state.imagesByGalleryId,
                        [galleryId]: cached,
                    },
                    imagesPageByGalleryId: {
                        ...state.imagesPageByGalleryId,
                        [galleryId]: {
                            cursor: null,
                            hasMore: false,
                            isLoadingInitial: false,
                            isLoadingMore: false,
                        },
                    },
                }));
            }

            if (!getIsOnline()) {
                return cached;
            }

            const { data, error, hasMore } = await readImageWindow(galleryId, Math.max(IMAGES_PAGE_SIZE, cached.length), owner.valid, ascending);
            if (!await owner.valid()) return [];
            if (error) {
                console.error("Error loading initial gallery images:", error);
                set((state) => ({ error: error.message, imageErrorsByGalleryId: { ...state.imageErrorsByGalleryId, [galleryId]: error.message } }));
                return cached;
            }

            let rows = ((data as GalleryImage[]) ?? []).filter((row) => !hiddenImages.get(galleryId)?.has(row.id));
            const missing = cached.filter((row) => !rows.some((fresh) => fresh.id === row.id));
            for (const batch of chunk(missing, 200)) {
                if (!await owner.valid()) return [];
                const checked = await supabase.from("date_images").select("*").eq("gallery_id", galleryId).eq("storage_state", "ready").in("id", batch.map((row) => row.id));
                if (!await owner.valid()) return [];
                if (checked.error || !Array.isArray(checked.data)) {
                    // Keep the contiguous server window; cached distant rows must not advance its cursor.
                    set((state) => ({ imageErrorsByGalleryId: { ...state.imageErrorsByGalleryId, [galleryId]: "Some photo changes could not be checked. Retry to refresh." } }));
                    continue;
                }
                if (!await owner.valid()) return [];
                const removed = batch.filter((row) => !checked.data.some((ready) => ready.id === row.id)).map((row) => row.id);
                if (removed.length) {
                    hiddenImages.set(galleryId, new Set([...(hiddenImages.get(galleryId) ?? []), ...removed]));
                    await invalidateCachedGalleryImages(galleryId, removed, owner.cache());
                }
                await replaceCachedGalleryImages(galleryId, checked.data as GalleryImage[], owner.cache());
            }
            rows.sort((a,b) => ascending ? a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id) : b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id));

            const knownById = new Map(cached.map((row) => [row.id, row]));
            const seeds = rows.map((row) => {
                const old = knownById.get(row.id);
                const canKeep = old && old.cache_scope === owner.scope && old.storage_provider === row.storage_provider && old.storage_path_orig === row.storage_path_orig && old.storage_path_thumb === row.storage_path_thumb;
                return { ...row, ...(canKeep ? { url_thumb: old.url_thumb, url_grid: old.url_grid, url_orig: old.url_orig, urls_expires_at: old.urls_expires_at } : {}), cache_scope: owner.scope! };
            });
            let merged: GalleryImage[] = seeds;
            if (rows.length && await owner.valid()) {
                try { merged = await refreshSignedImages(galleryId, seeds, false, owner.valid); }
                catch (error) {
                    if (await owner.valid()) set((state) => ({ imageErrorsByGalleryId: { ...state.imageErrorsByGalleryId, [galleryId]: getErrorMessage(error, "Photo links could not refresh. Retry.") } }));
                }
            }

            if (!await owner.valid()) return [];
            const last = rows[rows.length - 1];
            const cursor = last
                ? { created_at: String(last.created_at), id: String(last.id) }
                : null;

            set((state) => ({
                imagesByGalleryId: {
                    ...state.imagesByGalleryId,
                    [galleryId]: merged,
                },
                imagesPageByGalleryId: {
                    ...state.imagesPageByGalleryId,
                    [galleryId]: {
                        cursor,
                        hasMore,
                        isLoadingInitial: false,
                        isLoadingMore: false,
                    },
                },
            }));

            await replaceCachedGalleryImages(galleryId, merged, owner.cache());
            if (!await owner.valid()) return [];

            return merged;
        } catch (error) {
            if (await owner.valid()) set((state) => ({ error: getErrorMessage(error, "Photos could not load. Please retry."), imageErrorsByGalleryId: { ...state.imageErrorsByGalleryId, [galleryId]: getErrorMessage(error, "Photos could not load. Please retry.") } }));
            return get().imagesByGalleryId[galleryId] ?? [];
        } finally {
            if (owner.current() && (!owner.scope || await owner.valid())) set((state) => ({
                imagesPageByGalleryId: {
                    ...state.imagesPageByGalleryId,
                    [galleryId]: {
                        ...(state.imagesPageByGalleryId[galleryId] ?? {
                            cursor: null,
                            hasMore: true,
                            isLoadingInitial: false,
                            isLoadingMore: false,
                        }),
                        isLoadingInitial: false,
                        isLoadingMore: false,
                    },
                },
                isLoadingImagesByGalleryId: {
                    ...state.isLoadingImagesByGalleryId,
                    [galleryId]: false,
                },
            }));
        }
    },

    loadMoreGalleryImages: async (galleryId: string) => {
        const page = get().imagesPageByGalleryId[galleryId];
        if (!page) return get().loadInitialGalleryImages(galleryId);
        if (page?.isLoadingMore || page?.isLoadingInitial) {
            return get().imagesByGalleryId[galleryId] ?? [];
        }
        if (page && !page.hasMore) {
            return get().imagesByGalleryId[galleryId] ?? [];
        }
        if (page && !page.cursor) {
            return get().imagesByGalleryId[galleryId] ?? [];
        }

        const direction = get().imageSortByGalleryId[galleryId] ?? "desc";
        const ascending = direction === "asc";
        const owner = beginGalleryRead(`images/${galleryId}`, () => get().imageSortByGalleryId[galleryId] ?? "desc");
        const cursorSnapshot = page.cursor;
        set((state) => ({
            imagesPageByGalleryId: {
                ...state.imagesPageByGalleryId,
                [galleryId]: {
                    ...(state.imagesPageByGalleryId[galleryId] ?? {
                        cursor: null,
                        hasMore: true,
                        isLoadingInitial: false,
                        isLoadingMore: false,
                    }),
                    isLoadingMore: true,
                },
            },
        }));

        try {
            if (!await owner.capture()) return [];
            if (!getIsOnline()) {
                return get().imagesByGalleryId[galleryId] ?? [];
            }

            const cursor = cursorSnapshot;
            if (!cursor) return get().imagesByGalleryId[galleryId] ?? [];

            let query = supabase
                .from("date_images")
                .select("*")
                .eq("gallery_id", galleryId)
                .eq("storage_state", "ready")
                .or(
                    `created_at.${ascending ? "gt" : "lt"}.${quotePostgrest(cursor.created_at)},and(created_at.eq.${quotePostgrest(cursor.created_at)},id.${ascending ? "gt" : "lt"}.${quotePostgrest(cursor.id)})`,
                )
                .order("created_at", { ascending })
                .order("id", { ascending })
                .limit(IMAGES_PAGE_SIZE);

            const { data, error } = await query;
            if (!await owner.valid()) return [];
            if (error) {
                console.error("Error loading more gallery images:", error);
                set((state) => ({ error: error.message, imageErrorsByGalleryId: { ...state.imageErrorsByGalleryId, [galleryId]: error.message } }));
                return get().imagesByGalleryId[galleryId] ?? [];
            }

            const rows = ((data as GalleryImage[]) ?? []).filter((row) => !hiddenImages.get(galleryId)?.has(row.id));

            const knownById = new Map((get().imagesByGalleryId[galleryId] ?? []).map((row) => [row.id, row]));
            const seeds = rows.map((row) => {
                const old = knownById.get(row.id);
                const canKeep = old && old.cache_scope === owner.scope && old.storage_provider === row.storage_provider && old.storage_path_orig === row.storage_path_orig && old.storage_path_thumb === row.storage_path_thumb;
                return { ...row, ...(canKeep ? { url_thumb: old.url_thumb, url_grid: old.url_grid, url_orig: old.url_orig, urls_expires_at: old.urls_expires_at } : {}), cache_scope: owner.scope! };
            });
            let merged: GalleryImage[] = seeds;
            if (rows.length && await owner.valid()) {
                try { merged = await refreshSignedImages(galleryId, seeds, false, owner.valid); }
                catch (error) {
                    if (await owner.valid()) set((state) => ({ imageErrorsByGalleryId: { ...state.imageErrorsByGalleryId, [galleryId]: getErrorMessage(error, "Photo links could not refresh. Retry.") } }));
                }
            }

            const lastFetched = rows[rows.length - 1];
            const nextCursor = lastFetched
                ? {
                      created_at: String(lastFetched.created_at),
                      id: String(lastFetched.id),
                  }
                : cursor;

            if (!await owner.valid()) return [];
            set((state) => ({
                imagesByGalleryId: {
                    ...state.imagesByGalleryId,
                    [galleryId]: mergeUniqueById(
                        state.imagesByGalleryId[galleryId] ?? [],
                        merged,
                    ),
                },
                imagesPageByGalleryId: {
                    ...state.imagesPageByGalleryId,
                    [galleryId]: {
                        cursor: nextCursor,
                        hasMore: rows.length === IMAGES_PAGE_SIZE,
                        isLoadingInitial: false,
                        isLoadingMore: false,
                    },
                },
            }));

            await replaceCachedGalleryImages(
                galleryId,
                merged, owner.cache(),
            );

            return get().imagesByGalleryId[galleryId] ?? [];
        } catch (error) {
            if (await owner.valid()) set((state) => ({ error: getErrorMessage(error, "Photos could not load. Please retry."), imageErrorsByGalleryId: { ...state.imageErrorsByGalleryId, [galleryId]: getErrorMessage(error, "Photos could not load. Please retry.") } }));
            return get().imagesByGalleryId[galleryId] ?? [];
        } finally {
            if (owner.current() && (!owner.scope || await owner.valid())) set((state) => ({
                imagesPageByGalleryId: {
                    ...state.imagesPageByGalleryId,
                    [galleryId]: {
                        ...(state.imagesPageByGalleryId[galleryId] ?? {
                            cursor: null,
                            hasMore: true,
                            isLoadingInitial: false,
                            isLoadingMore: false,
                        }),
                        isLoadingMore: false,
                    },
                },
            }));
        }
    },

    reconcileGalleryImages: async (galleryId) => {
        const generation = galleryGeneration;
        const scope = await currentGalleryScope();
        if (!scope || generation !== galleryGeneration) return [];
        const key = `${generation}/${scope}/${galleryId}/${get().imageSortByGalleryId[galleryId] ?? "desc"}`;
        const existing = reconciliations.get(key);
        if (existing) return existing;
        const promise = get().loadInitialGalleryImages(galleryId);
        reconciliations.set(key, promise);
        void promise.finally(() => { if (reconciliations.get(key) === promise) reconciliations.delete(key); }).catch(() => undefined);
        return promise;
    },

    refreshGalleryImages: async (galleryId: string) => get().loadInitialGalleryImages(galleryId),

    fetchGalleries: async () => {
        // Legacy alias kept for compatibility; now loads the first paged screen.
        return await get().refreshGalleries();
    },

    fetchGalleryImages: async (galleryId) => get().refreshGalleryImages(galleryId),

    addNewGallery: async ({ title, date, color, location }) => {
        set({ error: null });

        const spaceId = await getSpaceId();
        if (!spaceId) {
            set({ error: "No spaceId found" });
            return null;
        }

        if (!getIsOnline()) {
            set({ error: "Gallery changes are unavailable offline." });
            return null;
        }

        const { data, error } = await supabase
            .from("galleries")
            .insert({
                space_id: spaceId,
                title,
                date,
                date_date: extractDateOnly(date),
                color,
                location,
            })
            .select("*")
            .single();

        if (error) {
            console.error("Error adding new gallery:", error);
            set({ error: error.message });
            return null;
        }

        const newGallery = data as Gallery;
        return newGallery;
    },

    updateGalleryDetails: async ({ galleryId, title, date, location }) => {
        set({ error: null });

        if (!getIsOnline()) {
            set({ error: "Gallery changes are unavailable offline." });
            return null;
        }

        const { data, error } = await supabase
            .from("galleries")
            .update({
                title,
                date,
                date_date: extractDateOnly(date),
                location,
            })
            .eq("id", galleryId)
            .select("*")
            .single();

        if (error) {
            console.error("Error updating gallery:", error);
            set({ error: error.message });
            return null;
        }

        const updatedGallery = data as Gallery;
        const previousGallery = get().galleries.find(
            (gallery) => gallery.id === galleryId,
        );
        const mergedGallery = previousGallery
            ? {
                  ...previousGallery,
                  ...updatedGallery,
                  cover_thumb_url:
                      updatedGallery.cover_thumb_url ??
                      previousGallery.cover_thumb_url ??
                      null,
              }
            : updatedGallery;

        const updatedGalleries = updateGalleryInList(
            get().galleries,
            mergedGallery,
        );
        set({ galleries: updatedGalleries });

        const spaceId = updatedGallery.space_id || (await getSpaceId());
        if (spaceId && updatedGalleries.length > 0) {
            await replaceCachedGalleries(spaceId, updatedGalleries);
        }

        return mergedGallery;
    },

    uploadGalleryImages: async (galleryId: string, images: string[]) => {
        if (uploadJobs.has(galleryId)) return false;
        const job = Symbol(galleryId);
        uploadJobs.set(galleryId, job);
        const generation = galleryGeneration;
        if (!getIsOnline()) {
            set({ error: "Gallery uploads are unavailable offline." });
            uploadJobs.delete(galleryId);
            return false;
        }

        set((state) => ({
            isUploadingByGalleryId: {
                ...state.isUploadingByGalleryId,
                [galleryId]: true,
            },
            error: null,
        }));

        const toastId = toast.show({
            title: "Uploading images...",
            message: `Uploaded 0/${images.length} images...`,
            progress: 0,
        });

        let scope: string | null = null;
        const current = async () => generation === galleryGeneration && !!scope && await currentGalleryScope() === scope;
        try {
            scope = await currentGalleryScope();
            if (!await current()) return false;
            const { data: galleryRow, error: galleryError } = await supabase
                .from("galleries")
                .select("space_id, cover_image_path, cover_image_thumb_path")
                .eq("id", galleryId)
                .single();

            if (!await current()) return false;
            if (galleryError || !galleryRow?.space_id) {
                toast.show({
                    title: "Something went wrong!",
                    message: "Gallery fetching failed. Please try again later.",
                    durationMs: 2000,
                });
                set(() => ({
                    error: galleryError?.message ?? "Gallery not found",
                }));
                return false;
            }


            const CONCURRENCY = 2;
            let completedImages = 0;

            await runWithConcurrency(
                images,
                CONCURRENCY,
                async (imageUri) => {
                    if (!await current()) throw new Error("Gallery context changed");
                    const variants = await generateVariants(imageUri);
                    try {
                        const blurHash = await generateBlurhash(variants.thumb.uri);
                        if (!await current()) throw new Error("Gallery context changed");
                        const uploaded = await uploadR2Image(galleryId, variants, blurHash);
                        if (!await current()) throw new Error("Gallery context changed");
                        const [signedImage] = await refreshSignedImages(galleryId, [uploaded], true).catch(() => [uploaded]);
                        if (!await current()) throw new Error("Gallery context changed");
                        const image = { ...signedImage, cache_scope: scope! };
                        set((state) => ({ imagesByGalleryId: {
                            ...state.imagesByGalleryId,
                            [galleryId]: [image, ...(state.imagesByGalleryId[galleryId] ?? [])],
                        } }));
                        completedImages++;
                        toast.update(toastId, {
                            message: `Uploaded ${completedImages}/${images.length} images...`,
                            progress: completedImages / images.length,
                        });
                    } finally { removeGalleryTempFiles([variants.thumb.uri, variants.orig.uri], imageUri); }
                },
            );

            return true;
        } catch (err) {
            const message = getErrorMessage(err, "Failed to upload images.");
            console.error("Error uploading gallery images:", err);
            if (await current() && uploadJobs.get(galleryId) === job) set({ error: message });
            toast.show({
                title: "Upload failed",
                message: "Please try uploading the photos again.",
                durationMs: 2500,
            });
            return false;
        } finally {

            if (await current()) {
                try { await replaceCachedGalleryImages(galleryId, get().imagesByGalleryId[galleryId] ?? [], { scope: scope!, current: () => generation === galleryGeneration }); }
                catch { /* Uploaded photos remain server-authoritative if local persistence fails. */ }
            }
            if (generation === galleryGeneration && uploadJobs.get(galleryId) === job) set((state) => ({
                isUploadingByGalleryId: {
                    ...state.isUploadingByGalleryId,
                    [galleryId]: false,
                },
            }));
            if (uploadJobs.get(galleryId) === job) uploadJobs.delete(galleryId);
            toast.dismiss(toastId);
        }
    },

    setImageSort: async (galleryId, direction) => {
        invalidateGalleryReads(galleryId);
        set((state) => ({ imageSortByGalleryId: { ...state.imageSortByGalleryId, [galleryId]: direction } }));
        return get().loadInitialGalleryImages(galleryId);
    },

    refreshCoverUrls: async (ids, force = false) => {
        const generation = galleryGeneration;
        const scope = await currentGalleryScope();
        if (!scope || !getIsOnline() || generation !== galleryGeneration) return;
        const selected = get().galleries.filter((row) => ids.includes(row.id) && row.cover_image_thumb_path &&
            (force || !row.cover_thumb_url || !row.cover_expires_at || Date.parse(row.cover_expires_at) - 60000 <= Date.now()));
        if (!selected.length) return;
        const paths = [...new Set(selected.map((row) => row.cover_image_thumb_path!))];
        const urls = await renewCovers(`${generation}/${scope}/covers`, paths, async (paths) => {
            if (generation !== galleryGeneration || await currentGalleryScope() !== scope) throw new Error("Gallery context changed");
            return galleryRequest("sign-gallery-cover-urls", { paths });
        });
        if (generation !== galleryGeneration || await currentGalleryScope() !== scope) return;
        const signed = new Map(paths.map((path, index) => [path, urls[index]]));
        const changed: Gallery[] = [];
        const galleries = get().galleries.map((row) => {
            const url = row.cover_image_thumb_path && signed.get(row.cover_image_thumb_path);
            if (!url || url === row.cover_thumb_url) return row;
            const updated = { ...row, cover_thumb_url: url, cover_expires_at: new Date(Date.now() + 3600000).toISOString(), cache_scope: scope };
            changed.push(updated); return updated;
        });
        if (!changed.length) return;
        set({ galleries });
        await replaceCachedGalleries(changed[0].space_id, changed, { scope, current: () => generation === galleryGeneration });
    },

    refreshImageUrls: async (galleryId, ids, force = false) => {
        const generation = galleryGeneration;
        const revision = readRevisions.get(`images/${galleryId}`);
        const scope = await currentGalleryScope();
        const current = () => generation === galleryGeneration && readRevisions.get(`images/${galleryId}`) === revision;
        if (!scope || !current()) return [];
        const selected = (get().imagesByGalleryId[galleryId] ?? []).filter((image) => !ids || ids.includes(image.id));
        const needs = selected.filter((image) => force || needsUrlRefresh(image));
        if (!getIsOnline() || !needs.length) return selected;
        const signed = await renewImages(`${generation}/${scope}/${galleryId}`, needs.map((image) => image.id), async (imageIds) => {
            if (!current() || await currentGalleryScope() !== scope) throw new Error("Gallery context changed");
            return galleryRequest("sign-gallery-urls", { galleryId, imageIds });
        });
        if (!current() || await currentGalleryScope() !== scope) return [];
        if (signed.some((row) => !row.url_orig && !row.url_thumb && !row.url_grid)) throw new Error("Photo links unavailable. Please retry.");
        const byId = new Map(needs.map((image, index) => [image.id, { old: image, signed: signed[index] }]));
        const changed: GalleryImage[] = [];
        const rows = (get().imagesByGalleryId[galleryId] ?? []).map((image) => {
            const result = byId.get(image.id);
            if (!result || image.storage_path_orig !== result.old.storage_path_orig || image.storage_path_thumb !== result.old.storage_path_thumb) return image;
            const refreshed = applySignedImageFields(image, result.signed);
            if (refreshed === image) return image;
            const updated = { ...refreshed, cache_scope: scope };
            changed.push(updated); return updated;
        });
        if (changed.length) {
            set((state) => ({ imagesByGalleryId: { ...state.imagesByGalleryId, [galleryId]: rows } }));
            await replaceCachedGalleryImages(galleryId, changed, { scope, current });
        }
        return rows.filter((image) => !ids || ids.includes(image.id));
    },

    deleteOneGalleryImage: async (galleryId, imageId) => {
        return await get().deleteMultipleGalleryImages(galleryId, [imageId]);
    },

    deleteMultipleGalleryImages: async (galleryId, imageIds) => {
        if (!getIsOnline()) { set({ error: "Gallery changes are unavailable offline." }); return false; }
        const generation = galleryGeneration;
        const scope = await currentGalleryScope();
        const current = async () => generation === galleryGeneration && !!scope && await currentGalleryScope() === scope;
        if (!await current()) return false;
        const accepted = new Set<string>();
        let failure: unknown;
        set({ error: null });
        const hideAccepted = () => {
            if (generation !== galleryGeneration) return;
            set((state) => ({ imagesByGalleryId: { ...state.imagesByGalleryId,
                [galleryId]: (state.imagesByGalleryId[galleryId] ?? []).filter((image) => !accepted.has(image.id)),
            } }));
        };
        try {
            for (const batch of chunk([...new Set(imageIds)], 200)) {
                if (!await current()) return false;
                // Both 200 complete and 202 durable acceptance are successful user deletions.
                await galleryRequest("delete-gallery-images", { galleryId, imageIds: batch });
                if (!await current()) return true;
                batch.forEach((id) => accepted.add(id));
                invalidateGalleryReads(galleryId);
                hiddenImages.set(galleryId, new Set([...(hiddenImages.get(galleryId) ?? []), ...batch]));
                await Promise.allSettled([invalidateCachedGalleryImages(galleryId, batch, scope ? { scope, current: () => generation === galleryGeneration } : undefined)]);
                if (!await current()) return true;
                hideAccepted();
                await Promise.allSettled([replaceCachedGalleryImages(galleryId, get().imagesByGalleryId[galleryId] ?? [])]);
            }
        } catch (error) { failure = error; }
        // A refresh/cache error cannot turn an already-accepted deletion into rejection.
        // Reconcile even rejected or ambiguous requests; never hide unaccepted IDs locally.
        if (await current()) {
            await Promise.allSettled([get().refreshGalleryImages(galleryId), get().refreshGalleries()]);
            if (!await current()) return !failure;
            hideAccepted();
            await Promise.allSettled([replaceCachedGalleryImages(galleryId, get().imagesByGalleryId[galleryId] ?? [])]);
            if (await current()) set({ error: failure ? getErrorMessage(failure, "Could not accept the deletion. Please try again.") : null });
        }
        return !failure;
    },

    deleteGallery: async (galleryId, options = {}) => {
        if (!getIsOnline()) { set({ error: "Gallery changes are unavailable offline." }); return false; }
        if (deleteJobs.has(galleryId)) return false;
        const job = Symbol(galleryId); deleteJobs.set(galleryId, job);
        try {
            const generation = galleryGeneration;
            const scope = await currentGalleryScope();
            const current = async () => generation === galleryGeneration && !!scope && await currentGalleryScope() === scope;
            if (!await current()) return false;
            set({ error: null });
            let result;
            try { result = await galleryRequest("delete-gallery", { galleryId }); }
            catch (error) {
                if (await current()) {
                    await Promise.allSettled([get().refreshGalleryImages(galleryId), get().refreshGalleries()]);
                    if (await current()) set({ error: getErrorMessage(error, "Could not accept the deletion. Please try again.") });
                }
                return false;
            }
            if (!await current()) return true;
            invalidateGalleryReads(galleryId);
            invalidateGalleryReads();
            hiddenGalleries.add(galleryId);
            const deleted = get().galleries.find((gallery) => gallery.id === galleryId);
            set((state) => ({
                galleries: state.galleries.filter((gallery) => gallery.id !== galleryId),
                imagesByGalleryId: omitRecordKey(state.imagesByGalleryId, galleryId),
                imagesPageByGalleryId: omitRecordKey(state.imagesPageByGalleryId, galleryId),
            }));
            await Promise.allSettled([(async () => {
                const spaceId = deleted?.space_id ?? await getSpaceId();

                if (spaceId && scope && generation === galleryGeneration) await invalidateCachedGalleries(spaceId, [galleryId], { scope, current: () => generation === galleryGeneration });
            })()]);
            if (options.showToast !== false) toast.show({ title: "Gallery removed",
                message: result.deferred ? "Photo cleanup is queued for the daily backend job." : "The gallery has been successfully deleted!",
                durationMs: 2000 });
            return true;
        } finally { if (deleteJobs.get(galleryId) === job) deleteJobs.delete(galleryId); }
    },
}));
