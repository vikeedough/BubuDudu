import { authorizeGallery, endpoint, HttpError, operation } from "../_shared/gallery-auth.ts";
import { requireId } from "../_shared/gallery-model.ts";
import { queuedDeletion } from "../_shared/gallery-storage.ts";

export const handler = endpoint(async (req, ctx) => {
    const body = await req.json();
    const galleryId = requireId(body.galleryId);
    if (!Array.isArray(body.imageIds) || body.imageIds.length < 1 || body.imageIds.length > 200) {
        throw new HttpError(400, "Expected 1-200 image IDs");
    }
    await authorizeGallery(ctx, galleryId);
    const marked = await operation(ctx, "delete-images", galleryId, {
        p_ids: [...new Set(body.imageIds.map(requireId))],
    });
    return queuedDeletion(marked.images.length);
});
