import { supabase } from "@/api/clients/supabaseClient";
import { generateBlurhash } from "@/utils/generateBlurhash";
import { getSpaceId } from "@/utils/secure-store";
import { decode } from "base64-arraybuffer";
import * as FileSystem from "expo-file-system";
import { create } from "zustand";

export type Gallery = {
    id: string;
    space_id: string;
    title: string;
    date: string | Date;
    color: string;
    location: string;
    cover_image: string | null;
    cover_image_blur_hash: string | null;
    created_at?: string;
};

export type GalleryImage = {
    id: string;
    gallery_id: string;
    url: string;
    blur_hash: string | null;
    storage_path: string;
    created_at: string;
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
        images: string[]
    ) => Promise<boolean>;

    deleteOneGalleryImage: (
        galleryId: string,
        imageId: string
    ) => Promise<boolean>;
    deleteMultipleGalleryImages: (
        galleryId: string,
        imageIds: string[]
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

        set({
            galleries: (data as Gallery[]) ?? [],
            isLoadingGalleries: false,
        });
        return (data as Gallery[]) ?? [];
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

        set((state) => ({
            imagesByGalleryId: {
                ...state.imagesByGalleryId,
                [galleryId]: (data as GalleryImage[]) ?? [],
            },
            isLoadingImagesByGalleryId: {
                ...state.isLoadingImagesByGalleryId,
                [galleryId]: false,
            },
        }));

        return (data as GalleryImage[]) ?? [];
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

        // Fetch gallery to check if cover_image exists
        const { data: galleryData, error: galleryError } = await supabase
            .from("galleries")
            .select("cover_image")
            .eq("id", galleryId)
            .single();

        if (galleryError) {
            console.error(
                "Error fetching gallery for cover_image check:",
                galleryError
            );
            set((state) => ({
                error: galleryError.message,
                isUploadingByGalleryId: {
                    ...state.isUploadingByGalleryId,
                    [galleryId]: false,
                },
            }));
            return false;
        }

        const hasCoverImage = !!galleryData?.cover_image;
        let hasUploadedFirstImage = false;

        for (const image of images) {
            const fileName = `${Date.now()}-${Math.random()}.jpg`;
            const storagePath = `${galleryId}/${fileName}`;

            // blurhash
            const blurHash = await generateBlurhash(image);

            // read file -> base64 -> arraybuffer
            const file = new FileSystem.File(image);
            const base64 = await file.base64();
            const arrayBuffer = decode(base64);

            const { error: uploadError } = await supabase.storage
                .from("gallery")
                .upload(storagePath, arrayBuffer, {
                    contentType: "image/jpeg",
                });

            if (uploadError) {
                console.error("Error uploading gallery images:", uploadError);
                set((state) => ({
                    error: uploadError.message,
                    isUploadingByGalleryId: {
                        ...state.isUploadingByGalleryId,
                        [galleryId]: false,
                    },
                }));
                return false;
            }

            const { data: urlData } = supabase.storage
                .from("gallery")
                .getPublicUrl(storagePath);
            const publicUrl = urlData.publicUrl;

            const { data: inserted, error: insertErr } = await supabase
                .from("date_images")
                .insert([
                    {
                        gallery_id: galleryId,
                        url: publicUrl,
                        blur_hash: blurHash,
                        storage_path: storagePath,
                    },
                ])
                .select("*")
                .single();

            if (insertErr) {
                console.error("Error inserting image row:", insertErr);
                await supabase.storage.from("gallery").remove([storagePath]);
                set((state) => ({
                    error: insertErr.message,
                    isUploadingByGalleryId: {
                        ...state.isUploadingByGalleryId,
                        [galleryId]: false,
                    },
                }));
                return false;
            }

            const insertedImage = inserted as GalleryImage;

            // Update store images list immediately
            set((state) => {
                const prev = state.imagesByGalleryId[galleryId] ?? [];
                return {
                    imagesByGalleryId: {
                        ...state.imagesByGalleryId,
                        [galleryId]: [insertedImage, ...prev],
                    },
                };
            });

            // Set cover image if no cover yet and this is first upload in this call
            if (!hasUploadedFirstImage) {
                hasUploadedFirstImage = true;

                if (!hasCoverImage) {
                    const { error: coverErr } = await supabase
                        .from("galleries")
                        .update({
                            cover_image: publicUrl,
                            cover_image_blur_hash: blurHash,
                        })
                        .eq("id", galleryId);

                    if (coverErr) {
                        console.error(
                            "Error updating gallery cover:",
                            coverErr
                        );
                        // not fatal to upload; continue
                    } else {
                        // Update gallery in store
                        set((state) => ({
                            galleries: state.galleries.map((g) =>
                                g.id === galleryId
                                    ? {
                                          ...g,
                                          cover_image: publicUrl,
                                          cover_image_blur_hash: blurHash,
                                      }
                                    : g
                            ),
                        }));
                    }
                }
            }
        }

        set((state) => ({
            isUploadingByGalleryId: {
                ...state.isUploadingByGalleryId,
                [galleryId]: false,
            },
        }));

        return true;
    },

    deleteOneGalleryImage: async (galleryId: string, imageId: string) => {
        set({ error: null });

        // Fetch gallery cover
        const { data: galleryData, error: galleryError } = await supabase
            .from("galleries")
            .select("cover_image")
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
            .select("id, url, blur_hash, created_at, storage_path")
            .eq("id", imageId)
            .single();

        if (imgErr) {
            console.error("Error fetching image row:", imgErr);
            set({ error: imgErr.message });
            return false;
        }

        const isDeletingCover = galleryData?.cover_image === imgRow.url;

        // If deleting cover, pick replacement or clear cover
        if (isDeletingCover) {
            const { data: otherImages, error: otherErr } = await supabase
                .from("date_images")
                .select("id, url, blur_hash, created_at")
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
                const { error: updateError } = await supabase
                    .from("galleries")
                    .update({ cover_image: null, cover_image_blur_hash: null })
                    .eq("id", galleryId);

                if (updateError) {
                    console.error("Error clearing gallery cover:", updateError);
                    set({ error: updateError.message });
                    return false;
                }

                set((state) => ({
                    galleries: state.galleries.map((g) =>
                        g.id === galleryId
                            ? {
                                  ...g,
                                  cover_image: null,
                                  cover_image_blur_hash: null,
                              }
                            : g
                    ),
                }));
            } else {
                const { error: updateError } = await supabase
                    .from("galleries")
                    .update({
                        cover_image: replacement.url,
                        cover_image_blur_hash: replacement.blur_hash,
                    })
                    .eq("id", galleryId);

                if (updateError) {
                    console.error("Error updating gallery cover:", updateError);
                    set({ error: updateError.message });
                    return false;
                }

                set((state) => ({
                    galleries: state.galleries.map((g) =>
                        g.id === galleryId
                            ? {
                                  ...g,
                                  cover_image: replacement.url,
                                  cover_image_blur_hash: replacement.blur_hash,
                              }
                            : g
                    ),
                }));
            }
        }

        // Delete file from storage (your naming uses `${imageId}.jpg`)
        const { error: bucketError } = await supabase.storage
            .from("gallery")
            .remove([imgRow.storage_path]);

        if (bucketError) {
            console.error("Error deleting from bucket:", bucketError);
            set({ error: bucketError.message });
            return false;
        }

        // Delete DB row
        const { error: delErr } = await supabase
            .from("date_images")
            .delete()
            .eq("id", imageId);
        if (delErr) {
            console.error("Error deleting image row:", delErr);
            set({ error: delErr.message });
            return false;
        }

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
        imageIds: string[]
    ) => {
        for (const id of imageIds) {
            await get().deleteOneGalleryImage(galleryId, id);
        }
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

        const { error: bucketError } = await supabase.storage
            .from("gallery")
            .remove([`${galleryId}`]);
        if (bucketError) {
            console.error(
                "Error deleting gallery folder in bucket:",
                bucketError
            );
        }

        // Update store
        set((state) => {
            const { [galleryId]: _removed, ...rest } = state.imagesByGalleryId;
            return {
                galleries: state.galleries.filter((g) => g.id !== galleryId),
                imagesByGalleryId: rest,
            };
        });

        return true;
    },
}));
