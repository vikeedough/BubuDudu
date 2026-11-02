import { authorizeGallery, endpoint, HttpError, json, operation } from "../_shared/gallery-auth.ts";
import { imageKeys, type ImageRow, requireId, validateMetadata } from "../_shared/gallery-model.ts";
import { queuedDeletion } from "../_shared/gallery-storage.ts";
import { R2Storage } from "../_shared/r2.ts";

export const handler = endpoint(async (req, ctx) => {
    const body = await req.json();
    if (body.action === "cleanup") {
        // Compatibility for older app polling: never perform physical cleanup here.
        return json({ ok: true, managedBy: "daily-backend" });
    }
    const galleryId = requireId(body.galleryId);
    const gallery = await authorizeGallery(ctx, galleryId);
    const imageId = requireId(body.imageId);
    if (body.action === "abort") {
        const marked = await operation(ctx, "abort", galleryId, { p_image: imageId });
        return queuedDeletion(marked.images.length);
    }
    const r2 = new R2Storage();
    if (body.action === "initialize") {
        const metadata = validateMetadata(body.metadata);
        const row: ImageRow = await operation(ctx, "initialize", galleryId, {
            p_image: imageId,
            p_metadata: metadata,
        });
        if (row.storage_state === "ready") return json({ ok: true, image: row });
        const seconds = Math.floor((Date.parse(row.upload_expires_at!) - Date.now()) / 1000);
        if (seconds < 1) {
            throw new HttpError(409, "Upload URL expired; abort and retry with a new image ID");
        }
        const keys = imageKeys(gallery.space_id, galleryId, imageId);
        return json({
            ok: true,
            expiresAt: row.upload_expires_at,
            uploads: {
                thumb: await r2.presign(keys.thumb, "PUT", seconds),
                orig: await r2.presign(keys.orig, "PUT", seconds),
            },
        });
    }
    if (body.action === "finalize") {
        const { data: row, error } = await ctx.admin.from("date_images").select("*")
            .eq("id", imageId).eq("gallery_id", galleryId).maybeSingle();
        if (error || !row || row.storage_provider !== "r2" || row.storage_state === "deleting") {
            throw new HttpError(409, "Upload not found or aborted");
        }
        if (row.storage_state !== "ready") {
            const metadata = validateMetadata(row.upload_metadata);
            const keys = imageKeys(gallery.space_id, galleryId, imageId);
            for (const name of ["thumb", "orig"] as const) {
                const head = await r2.head(keys[name]);
                if (
                    head.bytes !== metadata[name].bytes ||
                    head.contentType?.split(";")[0] !== "image/jpeg"
                ) {
                    throw new HttpError(409, "Uploaded object size or content type does not match");
                }
            }
        }
        const image = await operation(ctx, "finalize", galleryId, { p_image: imageId });
        return json({ ok: true, image });
    }
    throw new HttpError(400, "Unknown upload action");
});
