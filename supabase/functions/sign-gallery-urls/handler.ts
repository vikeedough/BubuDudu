import { authorizeGallery, endpoint, HttpError, json } from "../_shared/gallery-auth.ts";
import { type ImageRow, requireId } from "../_shared/gallery-model.ts";
import { signImages } from "../_shared/gallery-storage.ts";

export const handler = endpoint(async (req, ctx) => {
    const body = await req.json();
    const galleryId = requireId(body.galleryId);
    if (!Array.isArray(body.imageIds) || body.imageIds.length > 200) {
        throw new HttpError(400, "Expected at most 200 image IDs");
    }
    const ids = [...new Set(body.imageIds.map(requireId))];
    const gallery = await authorizeGallery(ctx, galleryId);
    const { data, error } = await ctx.admin.from("date_images").select("*").eq(
        "gallery_id",
        galleryId,
    )
        .eq("storage_state", "ready").in("id", ids);
    if (error) throw new Error("Image lookup failed");
    return json(await signImages(ctx, gallery.space_id, (data ?? []) as ImageRow[]));
});
