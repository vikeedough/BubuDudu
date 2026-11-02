import { authorizeGallery, endpoint, HttpError, json } from "../_shared/gallery-auth.ts";
import { type ImageRow, requireId } from "../_shared/gallery-model.ts";
import { signImages } from "../_shared/gallery-storage.ts";

export const handler = endpoint(async (req, ctx) => {
    const body = await req.json();
    if (!Array.isArray(body.paths) || body.paths.length > 200) {
        throw new HttpError(400, "Expected at most 200 cover paths");
    }
    const out: Record<string, string> = {};
    for (const path of new Set(body.paths)) {
        if (typeof path !== "string") throw new HttpError(400, "Invalid cover path");
        const match = /^spaces\/([^/]+)\/galleries\/([^/]+)\/images\/([^/]+)\/thumb\.jpg$/.exec(
            path,
        );
        if (!match) throw new HttpError(400, "Invalid cover path");
        const galleryId = requireId(match[2]);
        const gallery = await authorizeGallery(ctx, galleryId);
        if (gallery.space_id !== requireId(match[1]) || gallery.cover_image_thumb_path !== path) {
            continue;
        }
        const { data: image, error } = await ctx.admin.from("date_images").select("*")
            .eq("id", requireId(match[3])).eq("gallery_id", galleryId).eq("storage_state", "ready")
            .maybeSingle();
        if (error) throw new Error("Cover lookup failed");
        if (
            !image || image.storage_path_thumb !== path ||
            image.storage_path_grid !== gallery.cover_image_path
        ) continue;
        const signed = await signImages(ctx, gallery.space_id, [image as ImageRow]);
        if (signed[image.id]?.url_thumb) out[path] = signed[image.id].url_thumb!;
    }
    return json(out);
});
