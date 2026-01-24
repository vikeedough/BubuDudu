import { supabase } from "@/api/clients/supabaseClient";
import { toast } from "@/toast/api";
import { generateBlurhash } from "@/utils/generateBlurhash";
import { generateVariants } from "@/utils/generateImageVariants";
import { getSpaceId } from "@/utils/secure-store";
import { create } from "zustand";

const GALLERY_BUCKET = "gallery-private";
const SIGN_TTL_SECONDS = 60 * 60;

export type Gallery = {
    id: string;
    space_id: string;
    title: string;
    date: string | Date;
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

export type GalleryState = {
    galleries: Gallery[];
    imagesByGalleryId: Record<string, GalleryImage[]>;

    isLoadingGalleries: boolean;
    isLoadingImagesByGalleryId: Record<string, boolean>;
    isUploadingByGalleryId: Record<string, boolean>;
    error: string | null;

    // Actions
    fetchGalleries: () => Promise<Gallery[]>;
    fetchGalleryImages: (galleryId: string) => Promise<GalleryImage[]>;

    addNewGallery: (input: {
        title: string;
        date: string;
        color: string;
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

export const useGalleryStore = create<GalleryState>((set, get) => ({
    galleries: [],
    imagesByGalleryId: {},

    isLoadingGalleries: false,
    isLoadingImagesByGalleryId: {},
    isUploadingByGalleryId: {},
    error: null,

    clear: () =>
        set({
            galleries: [],
            imagesByGalleryId: {},
            isLoadingGalleries: false,
            isLoadingImagesByGalleryId: {},
            isUploadingByGalleryId: {},
            error: null,
        }),

    fetchGalleries: async () => {
        set({ isLoadingGalleries: true, error: null });

        const spaceId = await getSpaceId();
        if (!spaceId) {
            set({ galleries: [], isLoadingGalleries: false });
            return [];
        }

        const { data, error } = await supabase
            .from("galleries")
            .select("*")
            .eq("space_id", spaceId)
            .order("date", { ascending: false });

        if (error) {
            console.error("Error fetching galleries:", error);
            set({ error: error.message, isLoadingGalleries: false });
            return [];
        }

        const galleries = ((data as Gallery[]) ?? []).map((g) => ({
            ...g,
            cover_thumb_url: null,
        }));

        const signed = await Promise.all(
            galleries.map(async (g) => {
                if (!g.cover_image_thumb_path) return g;
                const { data: s, error: e } = await supabase.storage
                    .from(GALLERY_BUCKET)
                    .createSignedUrl(
                        g.cover_image_thumb_path,
                        SIGN_TTL_SECONDS,
                    );
                if (e || !s?.signedUrl) return g;
                return { ...g, cover_thumb_url: s.signedUrl };
            }),
        );

        set({ galleries: signed, isLoadingGalleries: false });
        return signed;
    },

    fetchGalleryImages: async (galleryId: string) => {
        set((state) => ({
            isLoadingImagesByGalleryId: {
                ...state.isLoadingImagesByGalleryId,
                [galleryId]: true,
            },
            error: null,
        }));

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

        const { data, error } = await supabase
            .from("galleries")
            .insert({
                space_id: spaceId,
                title,
                date,
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

        // Update store immediately
        set((state) => ({
            galleries: [newGallery, ...state.galleries],
        }));

        return newGallery;
    },

    uploadGalleryImages: async (galleryId: string, images: string[]) => {
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

            let firstUploadedInCall = false;

            for (let idx = 0; idx < images.length; idx++) {
                const imageUri = images[idx];

                // 1) Insert placeholder row to get UUID id
                const { data: inserted, error: insErr } = await supabase
                    .from("date_images")
                    .insert({ gallery_id: galleryId })
                    .select("*")
                    .single();

                if (insErr || !inserted?.id) {
                    set((s) => ({
                        error: insErr?.message ?? "Failed to create image row",
                    }));
                    return false;
                }

                const imageId = inserted.id as string;

                // 2) variants + blurhash from thumb
                const variants = await generateVariants(imageUri);
                const blurHash = await generateBlurhash(variants.thumb.uri);

                // 3) storage paths
                const base = `spaces/${spaceId}/galleries/${galleryId}/images/${imageId}`;
                const pThumb = `${base}/thumb.jpg`;
                const pGrid = `${base}/grid.jpg`;
                const pOrig = `${base}/orig.jpg`;

                // 4) upload 3 objects
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
                    toast.show({
                        title: "Something went wrong!",
                        message: "Image upload failed. Please try again later.",
                        durationMs: 2000,
                    });
                    await supabase.storage
                        .from(GALLERY_BUCKET)
                        .remove([pThumb, pGrid, pOrig]);
                    await supabase
                        .from("date_images")
                        .delete()
                        .eq("id", imageId);
                    set((s) => ({ error: uploadErr.message }));
                    return false;
                }

                // 5) update DB row with paths + dims + bytes + blurhash
                const { data: updatedRow, error: updErr } = await supabase
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
                    .eq("id", imageId)
                    .select("*")
                    .single();

                if (updErr || !updatedRow) {
                    await supabase.storage
                        .from(GALLERY_BUCKET)
                        .remove([pThumb, pGrid, pOrig]);
                    await supabase
                        .from("date_images")
                        .delete()
                        .eq("id", imageId);
                    set((s) => ({
                        error: updErr?.message ?? "Failed to update image row",
                    }));
                    toast.show({
                        title: "Something went wrong!",
                        message:
                            "Failed to update image row. Please try again later.",
                        durationMs: 2000,
                    });
                    return false;
                }

                // 6) sign URLs for immediate UI
                let url_thumb: string | undefined;
                let url_grid: string | undefined;
                let url_orig: string | undefined;

                const { data: signedOne, error: signErr } =
                    await supabase.functions.invoke("sign-gallery-urls", {
                        body: { galleryId, imageIds: [imageId] },
                    });

                if (!signErr && signedOne?.[imageId]) {
                    url_thumb = signedOne[imageId].url_thumb;
                    url_grid = signedOne[imageId].url_grid;
                    url_orig = signedOne[imageId].url_orig;
                }

                const mergedImage: GalleryImage = {
                    ...(updatedRow as GalleryImage),
                    url_thumb,
                    url_grid,
                    url_orig,
                };

                set((state) => {
                    const prev = state.imagesByGalleryId[galleryId] ?? [];
                    return {
                        imagesByGalleryId: {
                            ...state.imagesByGalleryId,
                            [galleryId]: [mergedImage, ...prev],
                        },
                    };
                });

                // 7) cover on first upload if no cover exists
                if (!firstUploadedInCall) {
                    firstUploadedInCall = true;
                    if (!hasCover) {
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

                toast.update(toastId, {
                    message: `Uploaded ${idx + 1}/${images.length} images...`,
                });
            }

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
                    galleries: state.galleries.map((g) =>
                        g.id === galleryId
                            ? {
                                  ...g,
                                  cover_image_path: null,
                                  cover_image_thumb_path: null,
                                  cover_image_blur_hash: null,
                              }
                            : g,
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
                    galleries: state.galleries.map((g) =>
                        g.id === galleryId
                            ? {
                                  ...g,
                                  cover_image_path:
                                      replacement.storage_path_grid,
                                  cover_image_thumb_path:
                                      replacement.storage_path_thumb,
                                  cover_image_blur_hash: replacement.blur_hash,
                                  cover_thumb_url: signed?.signedUrl ?? null,
                              }
                            : g,
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
            const prev = state.imagesByGalleryId[galleryId] ?? [];
            return {
                imagesByGalleryId: {
                    ...state.imagesByGalleryId,
                    [galleryId]: prev.filter((img) => img.id !== imageId),
                },
            };
        });

        return true;
    },

    deleteMultipleGalleryImages: async (
        galleryId: string,
        imageIds: string[],
    ) => {
        await Promise.all(
            imageIds.map((id) => get().deleteOneGalleryImage(galleryId, id)),
        );

        return true;
    },

    deleteGallery: async (galleryId: string) => {
        set({ error: null });

        // Ensure we have images in store or fetch
        const existing = get().imagesByGalleryId[galleryId];
        const images = existing ?? (await get().fetchGalleryImages(galleryId));
        const imageIds = images.map((img) => img.id.toString());

        // Delete images (DB + storage) first
        await get().deleteMultipleGalleryImages(galleryId, imageIds);

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

        // Update store
        set((state) => {
            const { [galleryId]: _removed, ...rest } = state.imagesByGalleryId;
            return {
                galleries: state.galleries.filter((g) => g.id !== galleryId),
                imagesByGalleryId: rest,
            };
        });

        toast.show({
            title: "Success!",
            message: "The gallery has been successfully deleted!",
            durationMs: 2000,
        });
        return true;
    },
}));
