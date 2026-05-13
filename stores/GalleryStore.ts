import { create } from "zustand";

import { supabase } from "@/api/clients/supabaseClient";
import { toast } from "@/toast/api";
import { generateBlurhash } from "@/utils/generateBlurhash";
import { generateVariants } from "@/utils/generateImageVariants";
import {
    getCachedGalleries,
    getCachedGalleryImages,
    replaceCachedGalleries,
    replaceCachedGalleryImages,
} from "@/utils/offline/local-db";
import { getIsOnline } from "@/utils/offline/network";
import { runWithConcurrency } from "@/utils/runWithConcurrency";
import { getSpaceId } from "@/utils/secure-store";

const GALLERY_BUCKET = "gallery-private";
const SIGN_TTL_SECONDS = 60 * 60;
const GALLERIES_PAGE_SIZE = 10;
const IMAGES_PAGE_SIZE = 20;
const BULK_DELETE_THRESHOLD = 10;
const STORAGE_REMOVE_CHUNK_SIZE = 100;
const DELETE_IMAGES_CONCURRENCY = 4;

function mergeUniqueById<T extends { id: string }>(prev: T[], next: T[]): T[] {
    if (next.length === 0) return prev;
    if (prev.length === 0) return next;

    const seen = new Set(prev.map((x) => x.id));
    const merged = prev.slice();
    for (const item of next) {
        if (seen.has(item.id)) continue;
        seen.add(item.id);
        merged.push(item);
    }
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

    created_at?: string;
};

export type GalleryImage = {
    id: string;
    gallery_id: string;

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

function clearGalleryCoverInList(
    galleries: Gallery[],
    galleryId: string,
): Gallery[] {
    return galleries.map((gallery) =>
        gallery.id === galleryId
            ? {
                  ...gallery,
                  cover_image_path: null,
                  cover_image_thumb_path: null,
                  cover_image_blur_hash: null,
                  cover_thumb_url: null,
              }
            : gallery,
    );
}

function setGalleryCoverInList(
    galleries: Gallery[],
    galleryId: string,
    replacement: Pick<
        GalleryImage,
        "storage_path_grid" | "storage_path_thumb" | "blur_hash"
    >,
    signedThumbUrl: string | null,
): Gallery[] {
    return galleries.map((gallery) =>
        gallery.id === galleryId
            ? {
                  ...gallery,
                  cover_image_path: replacement.storage_path_grid,
                  cover_image_thumb_path: replacement.storage_path_thumb,
                  cover_image_blur_hash: replacement.blur_hash,
                  cover_thumb_url: signedThumbUrl,
              }
            : gallery,
    );
}

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

function removeImageFromGalleryCache(
    imagesByGalleryId: Record<string, GalleryImage[]>,
    galleryId: string,
    imageId: string,
): Record<string, GalleryImage[]> {
    const previous = imagesByGalleryId[galleryId] ?? [];
    return {
        ...imagesByGalleryId,
        [galleryId]: previous.filter((img) => img.id !== imageId),
    };
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

    const withCoverThumbUrl = galleries.map((gallery) => ({
        ...gallery,
        cover_thumb_url: null,
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

    const unresolvedPaths = thumbPaths.filter((path) => !signedByPath[path]);
    if (unresolvedPaths.length > 0) {
        await Promise.all(
            unresolvedPaths.map(async (path) => {
                const { data: signed, error: signErr } = await supabase.storage
                    .from(GALLERY_BUCKET)
                    .createSignedUrl(path, SIGN_TTL_SECONDS);
                if (signErr || !signed?.signedUrl) return;
                signedByPath[path] = signed.signedUrl;
            }),
        );
    }

    return withCoverThumbUrl.map((gallery) => {
        const thumbPath = gallery.cover_image_thumb_path;
        if (!isNonEmptyString(thumbPath)) return gallery;
        return {
            ...gallery,
            cover_thumb_url: signedByPath[thumbPath] ?? null,
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

    deleteGallery: (galleryId: string) => Promise<boolean>;

    // Helpers
    clear: () => void;
};

async function uploadSingleImage(
    galleryId: string,
    imageUri: string,
    idx: number,
    total: number,
    spaceId: string,
    hasCover: boolean,
    toastId: string,
    set: any,
) {
    const { data: inserted, error: insErr } = await supabase
        .from("date_images")
        .insert({ gallery_id: galleryId })
        .select("*")
        .single();

    if (insErr || !inserted?.id) {
        throw new Error(insErr?.message ?? "Failed to create image row");
    }

    const imageId = inserted.id as string;

    const variants = await generateVariants(imageUri);
    const blurHash = await generateBlurhash(variants.thumb.uri);

    const base = `spaces/${spaceId}/galleries/${galleryId}/images/${imageId}`;
    const pThumb = `${base}/thumb.jpg`;
    const pGrid = `${base}/grid.jpg`;
    const pOrig = `${base}/orig.jpg`;

    const uploads = await Promise.all([
        supabase.storage
            .from(GALLERY_BUCKET)
            .upload(pThumb, variants.thumb.arrayBuffer, {
                contentType: "image/jpeg",
            }),
        supabase.storage
            .from(GALLERY_BUCKET)
            .upload(pGrid, variants.grid.arrayBuffer, {
                contentType: "image/jpeg",
            }),
        supabase.storage
            .from(GALLERY_BUCKET)
            .upload(pOrig, variants.orig.arrayBuffer, {
                contentType: "image/jpeg",
            }),
    ]);

    const uploadErr = uploads.find((u) => u.error)?.error;
    if (uploadErr) {
        await supabase.storage
            .from(GALLERY_BUCKET)
            .remove([pThumb, pGrid, pOrig]);
        await supabase.from("date_images").delete().eq("id", imageId);
        throw uploadErr;
    }

    const { error: updErr } = await supabase
        .from("date_images")
        .update({
            storage_path_thumb: pThumb,
            storage_path_grid: pGrid,
            storage_path_orig: pOrig,
            blur_hash: blurHash,

            width_thumb: variants.thumb.width,
            height_thumb: variants.thumb.height,
            width_grid: variants.grid.width,
            height_grid: variants.grid.height,
            width_orig: variants.orig.width,
            height_orig: variants.orig.height,

            bytes_thumb: variants.thumb.bytes,
            bytes_grid: variants.grid.bytes,
            bytes_orig: variants.orig.bytes,
        })
        .eq("id", imageId);

    if (updErr) {
        await supabase.storage
            .from(GALLERY_BUCKET)
            .remove([pThumb, pGrid, pOrig]);
        await supabase.from("date_images").delete().eq("id", imageId);
        throw updErr;
    }

    const { data: signedOne } = await supabase.functions.invoke(
        "sign-gallery-urls",
        { body: { galleryId, imageIds: [imageId] } },
    );

    const mergedImage: GalleryImage = {
        id: imageId,
        gallery_id: galleryId,
        storage_path_thumb: pThumb,
        storage_path_grid: pGrid,
        storage_path_orig: pOrig,
        blur_hash: blurHash,
        created_at: inserted.created_at,

        width_thumb: variants.thumb.width,
        height_thumb: variants.thumb.height,
        width_grid: variants.grid.width,
        height_grid: variants.grid.height,
        width_orig: variants.orig.width,
        height_orig: variants.orig.height,

        bytes_thumb: variants.thumb.bytes,
        bytes_grid: variants.grid.bytes,
        bytes_orig: variants.orig.bytes,

        url_thumb: signedOne?.[imageId]?.url_thumb,
        url_grid: signedOne?.[imageId]?.url_grid,
        url_orig: signedOne?.[imageId]?.url_orig,
    };

    set((state: any) => {
        const prev = state.imagesByGalleryId[galleryId] ?? [];
        return {
            imagesByGalleryId: {
                ...state.imagesByGalleryId,
                [galleryId]: [mergedImage, ...prev],
            },
        };
    });

    if (!hasCover && idx === 0) {
        await supabase
            .from("galleries")
            .update({
                cover_image_path: pGrid,
                cover_image_thumb_path: pThumb,
                cover_image_blur_hash: blurHash,
            })
            .eq("id", galleryId);
    }
}

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
    imagesPageByGalleryId: {},

    isLoadingGalleries: false,
    isLoadingImagesByGalleryId: {},
    isUploadingByGalleryId: {},
    error: null,

    clear: () =>
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
            imagesPageByGalleryId: {},
            isLoadingGalleries: false,
            isLoadingImagesByGalleryId: {},
            isUploadingByGalleryId: {},
            error: null,
        }),

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
        set({
            galleries: [],
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
            const spaceId = await getSpaceId();
            if (!spaceId) {
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

            const { searchText, sortDir } = get().galleriesQuery;
            const ascending = sortDir === "asc";
            const online = getIsOnline();

            let query: any = null;
            if (online) {
                query = supabase
                    .from("galleries")
                    .select("*")
                    .eq("space_id", spaceId);

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
            if (error) {
                console.error("Error loading initial galleries:", error);
                set({ error: error.message });
                return cachedForQuery;
            }

            const signed = await attachSignedCoverThumbUrls(
                (data as Gallery[]) ?? [],
            );

            await replaceCachedGalleries(spaceId, signed);

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
        } finally {
            set((state) => ({
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

        set((state) => ({
            galleriesPage: {
                ...state.galleriesPage,
                isLoadingMore: true,
            },
        }));

        try {
            const spaceId = await getSpaceId();
            if (!spaceId) return get().galleries;
            if (!getIsOnline()) return get().galleries;

            const { searchText, sortDir } = get().galleriesQuery;
            const ascending = sortDir === "asc";
            const cursor = get().galleriesPage.cursor;
            if (!cursor) return get().galleries;
            const quotedCursorDate = quotePostgrest(cursor.date);
            const quotedCursorId = quotePostgrest(cursor.id);

            let query = supabase
                .from("galleries")
                .select("*")
                .eq("space_id", spaceId);

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
            if (error) {
                console.error("Error loading more galleries:", error);
                set({ error: error.message });
                return get().galleries;
            }

            const signed = await attachSignedCoverThumbUrls(
                (data as Gallery[]) ?? [],
            );

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

            await replaceCachedGalleries(spaceId, get().galleries);

            return get().galleries;
        } finally {
            set((state) => ({
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
        set((state) => ({
            imagesByGalleryId: {
                ...state.imagesByGalleryId,
                [galleryId]: [],
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
            const cached = await getCachedGalleryImages(galleryId);
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

            let query = supabase
                .from("date_images")
                .select("*")
                .eq("gallery_id", galleryId)
                .order("created_at", { ascending: false })
                .order("id", { ascending: false })
                .limit(IMAGES_PAGE_SIZE);

            const { data, error } = await query;
            if (error) {
                console.error("Error loading initial gallery images:", error);
                set({ error: error.message });
                return cached;
            }

            const rows = (data as GalleryImage[]) ?? [];

            let merged = rows;
            if (rows.length > 0) {
                const imageIds = rows.map((r) => r.id);
                const { data: signedMap, error: signErr } =
                    await supabase.functions.invoke("sign-gallery-urls", {
                        body: { galleryId, imageIds },
                    });

                if (signErr) {
                    console.warn(
                        "Signing failed, returning unsigned rows",
                        signErr,
                    );
                } else {
                    merged = rows.map((r) => ({
                        ...r,
                        url_thumb: signedMap?.[String(r.id)]?.url_thumb,
                        url_grid: signedMap?.[String(r.id)]?.url_grid,
                        url_orig: signedMap?.[String(r.id)]?.url_orig,
                    }));
                }
            }

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
                        hasMore: rows.length === IMAGES_PAGE_SIZE,
                        isLoadingInitial: false,
                        isLoadingMore: false,
                    },
                },
            }));

            await replaceCachedGalleryImages(galleryId, merged);

            return merged;
        } finally {
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
        if (page?.isLoadingMore || page?.isLoadingInitial) {
            return get().imagesByGalleryId[galleryId] ?? [];
        }
        if (page && !page.hasMore) {
            return get().imagesByGalleryId[galleryId] ?? [];
        }
        if (page && !page.cursor) {
            return get().imagesByGalleryId[galleryId] ?? [];
        }

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
            if (!getIsOnline()) {
                return get().imagesByGalleryId[galleryId] ?? [];
            }

            const cursor = get().imagesPageByGalleryId[galleryId]?.cursor;
            if (!cursor) return get().imagesByGalleryId[galleryId] ?? [];

            let query = supabase
                .from("date_images")
                .select("*")
                .eq("gallery_id", galleryId)
                .or(
                    `created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`,
                )
                .order("created_at", { ascending: false })
                .order("id", { ascending: false })
                .limit(IMAGES_PAGE_SIZE);

            const { data, error } = await query;
            if (error) {
                console.error("Error loading more gallery images:", error);
                set({ error: error.message });
                return get().imagesByGalleryId[galleryId] ?? [];
            }

            const rows = (data as GalleryImage[]) ?? [];

            let merged = rows;
            if (rows.length > 0) {
                const imageIds = rows.map((r) => r.id);
                const { data: signedMap, error: signErr } =
                    await supabase.functions.invoke("sign-gallery-urls", {
                        body: { galleryId, imageIds },
                    });
                if (signErr) {
                    console.warn(
                        "Signing failed, returning unsigned rows",
                        signErr,
                    );
                } else {
                    merged = rows.map((r) => ({
                        ...r,
                        url_thumb: signedMap?.[String(r.id)]?.url_thumb,
                        url_grid: signedMap?.[String(r.id)]?.url_grid,
                        url_orig: signedMap?.[String(r.id)]?.url_orig,
                    }));
                }
            }

            const lastFetched = rows[rows.length - 1];
            const nextCursor = lastFetched
                ? {
                      created_at: String(lastFetched.created_at),
                      id: String(lastFetched.id),
                  }
                : cursor;

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
                get().imagesByGalleryId[galleryId] ?? [],
            );

            return get().imagesByGalleryId[galleryId] ?? [];
        } finally {
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
                        isLoadingMore: false,
                    },
                },
            }));
        }
    },

    refreshGalleryImages: async (galleryId: string) => {
        return await get().loadInitialGalleryImages(galleryId);
    },

    fetchGalleries: async () => {
        // Legacy alias kept for compatibility; now loads the first paged screen.
        return await get().refreshGalleries();
    },

    fetchGalleryImages: async (galleryId: string) => {
        set((state) => ({
            isLoadingImagesByGalleryId: {
                ...state.isLoadingImagesByGalleryId,
                [galleryId]: true,
            },
            error: null,
        }));

        const cached = await getCachedGalleryImages(galleryId);
        if (cached.length > 0) {
            set((state) => ({
                imagesByGalleryId: {
                    ...state.imagesByGalleryId,
                    [galleryId]: cached,
                },
            }));
        }

        if (!getIsOnline()) {
            set((state) => ({
                isLoadingImagesByGalleryId: {
                    ...state.isLoadingImagesByGalleryId,
                    [galleryId]: false,
                },
            }));
            return cached;
        }

        const { data, error } = await supabase
            .from("date_images")
            .select("*")
            .eq("gallery_id", galleryId)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error fetching gallery images:", error);
            set((state) => ({
                error: error.message,
                isLoadingImagesByGalleryId: {
                    ...state.isLoadingImagesByGalleryId,
                    [galleryId]: false,
                },
            }));
            return [];
        }

        const rows = (data as GalleryImage[]) ?? [];

        if (rows.length === 0) {
            await replaceCachedGalleryImages(galleryId, []);
            set((state) => ({
                imagesByGalleryId: {
                    ...state.imagesByGalleryId,
                    [galleryId]: [],
                },
                isLoadingImagesByGalleryId: {
                    ...state.isLoadingImagesByGalleryId,
                    [galleryId]: false,
                },
            }));
            return [];
        }

        const imageIds = rows.map((r) => r.id);

        const { data: signedMap, error: signErr } =
            await supabase.functions.invoke("sign-gallery-urls", {
                body: { galleryId, imageIds },
            });

        if (signErr) {
            console.warn("Signing failed, returning unsigned rows", signErr);
            await replaceCachedGalleryImages(galleryId, rows);
            set((state) => ({
                imagesByGalleryId: {
                    ...state.imagesByGalleryId,
                    [galleryId]: rows,
                },
                isLoadingImagesByGalleryId: {
                    ...state.isLoadingImagesByGalleryId,
                    [galleryId]: false,
                },
            }));
            return rows;
        }

        const merged = rows.map((r) => ({
            ...r,
            url_thumb: signedMap?.[String(r.id)]?.url_thumb,
            url_grid: signedMap?.[String(r.id)]?.url_grid,
            url_orig: signedMap?.[String(r.id)]?.url_orig,
        }));

        await replaceCachedGalleryImages(galleryId, merged);

        set((state) => ({
            imagesByGalleryId: {
                ...state.imagesByGalleryId,
                [galleryId]: merged,
            },
            isLoadingImagesByGalleryId: {
                ...state.isLoadingImagesByGalleryId,
                [galleryId]: false,
            },
        }));

        return merged;
    },

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
        if (!getIsOnline()) {
            set({ error: "Gallery uploads are unavailable offline." });
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

        try {
            const { data: galleryRow, error: galleryError } = await supabase
                .from("galleries")
                .select("space_id, cover_image_path, cover_image_thumb_path")
                .eq("id", galleryId)
                .single();

            if (galleryError || !galleryRow?.space_id) {
                toast.show({
                    title: "Something went wrong!",
                    message: "Gallery fetching failed. Please try again later.",
                    durationMs: 2000,
                });
                set((s) => ({
                    error: galleryError?.message ?? "Gallery not found",
                }));
                return false;
            }

            const spaceId = galleryRow.space_id as string;
            const hasCover = !!galleryRow.cover_image_path;

            const CONCURRENCY = 3;
            let completedImages = 0;

            await runWithConcurrency(
                images,
                CONCURRENCY,
                async (imageUri, idx) => {
                    await uploadSingleImage(
                        galleryId,
                        imageUri,
                        idx,
                        images.length,
                        spaceId,
                        hasCover,
                        toastId,
                        set,
                    );

                    completedImages++;
                    toast.update(toastId, {
                        message: `Uploaded ${completedImages}/${images.length} images...`,
                        progress: completedImages / images.length,
                    });
                },
            );

            return true;
        } finally {
            set((state) => ({
                isUploadingByGalleryId: {
                    ...state.isUploadingByGalleryId,
                    [galleryId]: false,
                },
            }));
            toast.dismiss(toastId);
        }
    },

    deleteOneGalleryImage: async (galleryId: string, imageId: string) => {
        if (!getIsOnline()) {
            set({ error: "Gallery changes are unavailable offline." });
            return false;
        }

        set({ error: null });

        // Fetch gallery cover
        const { data: galleryData, error: galleryError } = await supabase
            .from("galleries")
            .select("cover_image_path, cover_image_thumb_path")
            .eq("id", galleryId)
            .single();

        if (galleryError) {
            console.error("Error fetching gallery data:", galleryError);
            set({ error: galleryError.message });
            return false;
        }

        // Fetch image row
        const { data: imgRow, error: imgErr } = await supabase
            .from("date_images")
            .select("storage_path_thumb, storage_path_grid, storage_path_orig")
            .eq("id", imageId)
            .single();

        if (imgErr) {
            console.error("Error fetching image row:", imgErr);
            set({ error: imgErr.message });
            return false;
        }

        const isDeletingCover =
            galleryData?.cover_image_path === imgRow.storage_path_grid;

        // If deleting cover, pick replacement or clear cover
        if (isDeletingCover) {
            const { data: otherImages, error: otherErr } = await supabase
                .from("date_images")
                .select("storage_path_grid, storage_path_thumb, blur_hash")
                .eq("gallery_id", galleryId)
                .neq("id", imageId)
                .order("created_at", { ascending: false })
                .limit(1);

            if (otherErr) {
                console.error("Error fetching replacement image:", otherErr);
                set({ error: otherErr.message });
                return false;
            }

            const replacement = otherImages?.[0];

            if (!replacement) {
                await supabase
                    .from("galleries")
                    .update({
                        cover_image_path: null,
                        cover_image_thumb_path: null,
                        cover_image_blur_hash: null,
                    })
                    .eq("id", galleryId);

                set((state) => ({
                    galleries: clearGalleryCoverInList(
                        state.galleries,
                        galleryId,
                    ),
                }));
            } else {
                await supabase
                    .from("galleries")
                    .update({
                        cover_image_path: replacement.storage_path_grid,
                        cover_image_thumb_path: replacement.storage_path_thumb,
                        cover_image_blur_hash: replacement.blur_hash,
                    })
                    .eq("id", galleryId);

                const { data: signed } = await supabase.storage
                    .from(GALLERY_BUCKET)
                    .createSignedUrl(
                        replacement.storage_path_thumb,
                        SIGN_TTL_SECONDS,
                    );

                set((state) => ({
                    galleries: setGalleryCoverInList(
                        state.galleries,
                        galleryId,
                        replacement,
                        signed?.signedUrl ?? null,
                    ),
                }));
            }
        }

        const { error: storageErr } = await supabase.storage
            .from(GALLERY_BUCKET)
            .remove([
                imgRow.storage_path_thumb,
                imgRow.storage_path_grid,
                imgRow.storage_path_orig,
            ]);

        if (storageErr) {
            console.error("Error deleting image from storage:", storageErr);
        }

        // Delete DB row
        await supabase.from("date_images").delete().eq("id", imageId);

        // Update store images list immediately
        set((state) => {
            return {
                imagesByGalleryId: removeImageFromGalleryCache(
                    state.imagesByGalleryId,
                    galleryId,
                    imageId,
                ),
            };
        });

        return true;
    },

    deleteMultipleGalleryImages: async (
        galleryId: string,
        imageIds: string[],
    ) => {
        if (!getIsOnline()) {
            set({ error: "Gallery changes are unavailable offline." });
            return false;
        }

        if (imageIds.length === 0) return true;

        await runWithConcurrency(
            imageIds,
            DELETE_IMAGES_CONCURRENCY,
            async (id) => {
                await get().deleteOneGalleryImage(galleryId, id);
            },
        );

        return true;
    },

    deleteGallery: async (galleryId: string) => {
        if (!getIsOnline()) {
            set({ error: "Gallery changes are unavailable offline." });
            return false;
        }

        set({ error: null });

        const finalizeDelete = () => {
            // Clear cached images for this gallery; list ordering is reloaded via refresh.
            set((state) => ({
                imagesByGalleryId: omitRecordKey(
                    state.imagesByGalleryId,
                    galleryId,
                ),
                imagesPageByGalleryId: omitRecordKey(
                    state.imagesPageByGalleryId,
                    galleryId,
                ),
            }));

            toast.show({
                title: "Success!",
                message: "The gallery has been successfully deleted!",
                durationMs: 2000,
            });
            return true;
        };

        const { data: functionData, error: functionErr } =
            await supabase.functions.invoke("delete-gallery", {
                body: { galleryId },
            });

        if (!functionErr) {
            if (functionData?.ok === true) {
                return finalizeDelete();
            }

            if (functionData?.ok === false) {
                const serverMessage =
                    functionData?.error ??
                    "Server-side gallery delete failed.";
                set({ error: serverMessage });
                return false;
            }
        }

        if (functionErr) {
            const functionMessage = String(functionErr?.message ?? "");
            const isFunctionUnavailable =
                functionMessage.includes("404") ||
                functionMessage.toLowerCase().includes("not found");

            if (!isFunctionUnavailable) {
                console.error(
                    "Server-side gallery delete failed:",
                    functionErr,
                );
                set({ error: functionMessage || "Server-side gallery delete failed." });
                return false;
            }

            console.warn(
                "Server-side delete function unavailable, falling back to client-side delete:",
                functionErr,
            );
        }

        const { data: imageRows, error: imageRowsErr } = await supabase
            .from("date_images")
            .select("id, storage_path_thumb, storage_path_grid, storage_path_orig")
            .eq("gallery_id", galleryId);

        if (imageRowsErr) {
            console.error("Error fetching gallery images for deletion:", imageRowsErr);
            set({ error: imageRowsErr.message });
            return false;
        }

        const rows =
            (imageRows as
                | Pick<
                      GalleryImage,
                      | "id"
                      | "storage_path_thumb"
                      | "storage_path_grid"
                      | "storage_path_orig"
                  >[]
                | null) ?? [];

        if (rows.length >= BULK_DELETE_THRESHOLD) {
            const storagePaths = Array.from(
                new Set(
                    rows
                        .flatMap((row) => [
                            row.storage_path_thumb,
                            row.storage_path_grid,
                            row.storage_path_orig,
                        ])
                        .filter(isNonEmptyString),
                ),
            );

            for (const pathChunk of chunk(storagePaths, STORAGE_REMOVE_CHUNK_SIZE)) {
                const { error: storageErr } = await supabase.storage
                    .from(GALLERY_BUCKET)
                    .remove(pathChunk);

                if (storageErr) {
                    console.error(
                        "Error deleting gallery image paths from storage:",
                        storageErr,
                    );
                }
            }

            const { error: delImagesErr } = await supabase
                .from("date_images")
                .delete()
                .eq("gallery_id", galleryId);

            if (delImagesErr) {
                console.error("Error deleting gallery image rows:", delImagesErr);
            }
        } else if (rows.length > 0) {
            await get().deleteMultipleGalleryImages(
                galleryId,
                rows.map((img) => String(img.id)),
            );
        }

        // Delete gallery row
        const { error: delGalleryErr } = await supabase
            .from("galleries")
            .delete()
            .eq("id", galleryId);
        if (delGalleryErr) {
            console.error("Error deleting gallery:", delGalleryErr);
            set({ error: delGalleryErr.message });
            return false;
        }

        return finalizeDelete();
    },
}));
