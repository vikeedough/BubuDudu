import { type GalleryContext, json } from "./gallery-auth.ts";
import { imageKeys, imagePaths, type ImageRow, READ_TTL } from "./gallery-model.ts";
import { R2Storage } from "./r2.ts";

export async function signImages(ctx: GalleryContext, spaceId: string, rows: ImageRow[]) {
    const out: Record<string, Record<string, string | undefined>> = {};
    let r2: R2Storage | undefined;
    const expiresAt = new Date(Date.now() + READ_TTL * 1000).toISOString();
    for (const row of rows) {
        if (row.storage_state !== "ready") continue;
        const signed = new Map<string, string>();
        for (const path of imagePaths(row, spaceId)) {
            if (row.storage_provider === "r2") {
                r2 ??= new R2Storage();
                signed.set(path, await r2.presign(path, "GET", READ_TTL));
            } else {
                const { data, error } = await ctx.admin.storage.from("gallery-private")
                    .createSignedUrl(path, READ_TTL);
                if (!error && data?.signedUrl) signed.set(path, data.signedUrl);
            }
        }
        out[row.id] = {
            url_thumb: signed.get(row.storage_path_thumb ?? ""),
            url_grid: signed.get(row.storage_path_grid ?? ""),
            url_orig: signed.get(row.storage_path_orig ?? ""),
            urls_expires_at: expiresAt,
            cache_scope: `${ctx.userId}/${spaceId}`,
        };
    }
    return out;
}

// Acceptance means the marking transaction (including its receipt trigger) committed.
export function queuedDeletion(remaining: number) {
    return json({ ok: true, deferred: true, remaining, cleanup: "daily-backend" }, 202);
}

export type DeletionReceipt = {
    image_id: string;
    gallery_id: string;
    space_id: string;
    storage_provider: "r2" | "supabase";
    object_keys: string[];
    cleanup_after: string;
    completed_at: string | null;
};

// Shared provider-aware deletion engine; only the authenticated daily backend calls it.
export async function deleteReceiptObjects(
    admin: GalleryContext["admin"],
    receipt: DeletionReceipt,
    signal: AbortSignal,
    removed: (count: number) => void,
) {
    const allowed = new Set(
        Object.values(imageKeys(receipt.space_id, receipt.gallery_id, receipt.image_id)),
    );
    if (
        !["r2", "supabase"].includes(receipt.storage_provider) ||
        !Array.isArray(receipt.object_keys) ||
        receipt.object_keys.some((key) => !allowed.has(key))
    ) throw new Error("invalid_receipt");
    const paths = [...new Set(receipt.object_keys)];
    if (receipt.storage_provider === "r2") {
        const r2 = new R2Storage();
        for (const key of paths) {
            if (await r2.remove(key, signal)) removed(1);
        }
    } else {
        // One key per request makes partial progress/counting explicit. Missing keys return [].
        for (const key of paths) {
            signal.throwIfAborted();
            const { data, error } = await admin.storage.from("gallery-private").remove([key]);
            if (error) throw new Error("objects");
            removed(data?.length ?? 0);
        }
    }
}
