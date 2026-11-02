import { imagePaths, type ImageRow } from "../supabase/functions/_shared/gallery-model.ts";

export type ObjectBytes = { bytes: Uint8Array; headers: Record<string, string> };
export type MigrationIO = {
    source: (key: string) => Promise<ObjectBytes | null>;
    target: (key: string) => Promise<Uint8Array | null>;
    copy: (key: string, object: ObjectBytes) => Promise<void>;
    switchProvider: (snapshot: ImageRow) => Promise<void>;
};
export async function sha256(bytes: Uint8Array): Promise<string> {
    const digest = await crypto.subtle.digest("SHA-256", bytes as Uint8Array<ArrayBuffer>);
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}
export async function migrateImage(row: ImageRow, spaceId: string, io: MigrationIO, apply = false) {
    if (row.storage_provider !== "supabase" || row.storage_state !== "ready") {
        return { id: row.id, status: "skipped", objects: [] };
    }
    if (!row.storage_path_thumb || !row.storage_path_grid || !row.storage_path_orig) {
        throw new Error("Incomplete image variant paths");
    }
    const objects: { key: string; bytes: number; sha256: string }[] = [];
    for (const key of imagePaths(row, spaceId)) {
        const source = await io.source(key);
        if (!source) throw new Error(`Missing source object: ${key}`);
        const checksum = await sha256(source.bytes);
        if (apply) {
            let target = await io.target(key);
            if (!target) {
                await io.copy(key, source);
                target = await io.target(key);
            }
            // Never overwrite a different pre-existing destination. Do not trust multipart ETags.
            if (
                !target || target.byteLength !== source.bytes.byteLength ||
                await sha256(target) !== checksum
            ) {
                throw new Error(`Destination checksum or size mismatch: ${key}`);
            }
        }
        objects.push({ key, bytes: source.bytes.byteLength, sha256: checksum });
    }
    if (apply) await io.switchProvider(row); // compares the entire original row under a gallery lock
    return { id: row.id, status: apply ? "migrated" : "dry-run", objects };
}
