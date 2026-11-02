export type Provider = "supabase" | "r2";
export type ImageRow = {
    id: string;
    gallery_id: string;
    storage_provider: Provider;
    storage_state: "pending" | "ready" | "deleting";
    storage_revision: number;
    upload_expires_at: string | null;
    upload_metadata: UploadMetadata | null;
    storage_path_thumb: string | null;
    storage_path_grid: string | null;
    storage_path_orig: string | null;
    [key: string]: unknown;
};
export type VariantMetadata = { width: number; height: number; bytes: number };
export type UploadMetadata = { thumb: VariantMetadata; orig: VariantMetadata; blur_hash: string };
export const READ_TTL = 3600;
export const UPLOAD_TTL = 300;
// PUTs already in flight may finish after URL expiry. Cleanup is deliberately delayed.
export const UPLOAD_DRAIN_SECONDS = 120;
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function requireId(value: unknown): string {
    if (typeof value !== "string" || !UUID.test(value)) throw new TypeError("Invalid UUID");
    return value.toLowerCase();
}
export function imageKeys(spaceId: string, galleryId: string, imageId: string) {
    const base = `spaces/${requireId(spaceId)}/galleries/${requireId(galleryId)}/images/${
        requireId(imageId)
    }`;
    return { thumb: `${base}/thumb.jpg`, grid: `${base}/grid.jpg`, orig: `${base}/orig.jpg` };
}
export function imagePaths(row: ImageRow, spaceId: string): string[] {
    const allowed = new Set(Object.values(imageKeys(spaceId, row.gallery_id, row.id)));
    const paths = [row.storage_path_thumb, row.storage_path_grid, row.storage_path_orig]
        .filter((p): p is string => typeof p === "string" && p.length > 0);
    if (paths.some((p) => !allowed.has(p))) {
        throw new Error("Image object key does not match its gallery");
    }
    return [...new Set(paths)];
}
export function validateMetadata(value: unknown): UploadMetadata {
    const m = value as UploadMetadata;
    if (!m || typeof m.blur_hash !== "string" || m.blur_hash.length > 200) {
        throw new TypeError("Invalid blur hash");
    }
    for (const name of ["thumb", "orig"] as const) {
        const v = m[name];
        if (
            !v || ![v.width, v.height, v.bytes].every(Number.isSafeInteger) ||
            v.width < 1 || v.height < 1 ||
            Math.max(v.width, v.height) > (name === "thumb" ? 1000 : 2000) ||
            v.bytes < 1 || v.bytes > 20 * 1024 * 1024
        ) throw new TypeError("Invalid image dimensions or size");
    }
    return { thumb: m.thumb, orig: m.orig, blur_hash: m.blur_hash };
}
export function cleanupAfter(row: ImageRow): number {
    return row.upload_expires_at
        ? Date.parse(row.upload_expires_at) + UPLOAD_DRAIN_SECONDS * 1000
        : 0;
}
