import { endpoint, json, operation } from "../_shared/gallery-auth.ts";
import { requireId } from "../_shared/gallery-model.ts";
import { queuedDeletion } from "../_shared/gallery-storage.ts";

export const handler = endpoint(async (req, ctx) => {
    const galleryId = requireId((await req.json()).galleryId);
    const marked = await operation(ctx, "delete-gallery", galleryId);
    if (!marked) return json({ ok: true, alreadyDeleted: true });
    return queuedDeletion(marked.images.length);
});
