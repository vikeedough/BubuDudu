import { supabase } from "@/api/clients/supabaseClient";
import { createLocalId } from "@/utils/offline/id";
import { getIsOnline } from "@/utils/offline/network";

import type { GalleryImage } from "@/stores/GalleryStore";
import type { VariantOutput } from "@/utils/generateImageVariants";

export async function galleryRequest(name: string, body: Record<string, unknown>) {
    const { data, error } = await supabase.functions.invoke(name, { body });
    if (error) {
        let message = error.message;
        try { message = (await error.context?.json())?.error ?? message; } catch { /* non-JSON transport error */ }
        throw new Error(message || "Gallery request failed");
    }
    if (!data || data.ok === false || (!name.startsWith("sign-gallery-") && data.ok !== true)) {
        throw new Error(data?.error ?? "Invalid gallery response");
    }
    return data;
}

export function needsUrlRefresh(image: GalleryImage, now = Date.now()) {
    return !image.url_orig || !image.url_thumb || !image.urls_expires_at ||
        !Number.isFinite(Date.parse(image.urls_expires_at)) || Date.parse(image.urls_expires_at) - 60000 <= now;
}

export function applySignedImageFields(image: GalleryImage, signed: Partial<GalleryImage>): GalleryImage {
    const fields: Partial<GalleryImage> = {};
    for (const key of ["url_thumb", "url_grid", "url_orig", "urls_expires_at", "cache_scope"] as const) {
        const value = signed[key];
        if (typeof value === "string" && value.length) fields[key] = value;
    }
    return Object.entries(fields).every(([key, value]) => image[key as keyof GalleryImage] === value)
        ? image : { ...image, ...fields };
}

export async function refreshSignedImages(galleryId: string, images: GalleryImage[], force = false, current?: () => Promise<boolean>): Promise<GalleryImage[]> {
    if (!getIsOnline()) return images;
    const needs = images.filter((image) => force || needsUrlRefresh(image));
    if (!needs.length) return images;
    const signed: Record<string, Partial<GalleryImage>> = {};
    for (let offset = 0; offset < needs.length; offset += 200) {
        if (current && !await current()) return images;
        Object.assign(signed, await galleryRequest("sign-gallery-urls", {
            galleryId, imageIds: needs.slice(offset, offset + 200).map((image) => image.id),
        }));
    }
    if (needs.some((image) => !signed[image.id]?.url_orig && !signed[image.id]?.url_grid && !signed[image.id]?.url_thumb)) {
        throw new Error("Photo unavailable. Refresh the gallery and try again.");
    }
    const refreshed = images.map((image) => signed[image.id] ? applySignedImageFields(image, signed[image.id]) : image);
    return refreshed.every((image, index) => image === images[index]) ? images : refreshed;
}

export async function uploadR2Image(
    galleryId: string, variants: Record<"thumb" | "grid" | "orig", VariantOutput>, blurHash: string,
): Promise<GalleryImage> {
    // Retry uses the same identity; no duplicate metadata if initialize/finalize responses are lost.
    const imageId = createLocalId();
    const metadata = {
        thumb: { width: variants.thumb.width, height: variants.thumb.height, bytes: variants.thumb.bytes },
        orig: { width: variants.orig.width, height: variants.orig.height, bytes: variants.orig.bytes },
        blur_hash: blurHash,
    };
    try {
        let lastError: unknown;
        for (let attempt = 0; attempt < 2; attempt++) {
            try {
                const init = await galleryRequest("gallery-upload", { action: "initialize", galleryId, imageId, metadata });
                if (init.image) return init.image;
                for (const name of ["thumb", "orig"] as const) {
                    if (Date.parse(init.expiresAt) <= Date.now()) throw new Error("Upload URL expired; retry this photo");
                    const controller = new AbortController();
                    const timeout = setTimeout(() => controller.abort(), 90000);
                    let response: Response;
                    try {
                        response = await fetch(init.uploads[name], {
                            method: "PUT", headers: { "Content-Type": "image/jpeg" }, body: variants[name].arrayBuffer,
                            signal: controller.signal,
                        });
                    } finally { clearTimeout(timeout); }
                    if (!response.ok) throw new Error(`Photo upload failed (${response.status})`);
                }
                const result = await galleryRequest("gallery-upload", { action: "finalize", galleryId, imageId });
                return result.image;
            } catch (error) { lastError = error; }
        }
        throw lastError;
    } catch (error) {
        // Abort durably marks pending uploads. Deletion waits for signed PUTs to drain.
        try { await galleryRequest("gallery-upload", { action: "abort", galleryId, imageId }); } catch { /* retained server-side for cleanup */ }
        throw error;
    }
}
