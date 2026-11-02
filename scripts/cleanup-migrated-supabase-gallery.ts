// Operator-only, exact historical source cleanup. No database or R2 writes.
import { imageKeys } from "../supabase/functions/_shared/gallery-model.ts";
import { sha256 } from "./gallery-migration-core.ts";

export const PROJECT = "hcrezrypvkmtzxldvsvm";
type Row = Record<string, unknown>;
export type Entry = {
    bucket: "gallery-private";
    sourceKey: string;
    r2Key: string;
    imageId: string;
    galleryId: string;
    variant: "thumb" | "grid" | "orig";
    bytes: number;
    sha256: string;
    storageProvider: "r2";
};
export type Snapshot = {
    images: Row[];
    galleries: Row[];
    receipts: Row[];
    references: { table_name: string; row_id: string; column_name: string; object_key: string }[];
    source_objects: { name: string; metadata: { size: number }; [key: string]: unknown }[];
    source_bucket: Row;
    buckets: Row[];
    cron_jobs: unknown[];
    public_tables: string[];
    active_gallery_writers: number;
    other_storage_fingerprint: string;
    [key: string]: unknown;
};
export type Manifest = {
    version: 1;
    project: typeof PROJECT;
    createdAt: string;
    migrationSha256: string;
    entries: Entry[];
    excluded: { key: string; bytes: number }[];
    before: Snapshot;
};
export const stable = (v: unknown): string =>
    JSON.stringify(
        v,
        (_k, value) =>
            value && typeof value === "object" && !Array.isArray(value)
                ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)))
                : value,
    );
const same = (a: unknown, b: unknown) => stable(a) === stable(b);
function fail(message: string): never {
    throw new Error(message);
}
// Some Storage versions return HTTP 400 with a structured 404 for absent objects.
// An arbitrary 400/auth/transport failure must never count as verified absence.
export function sourceResult(status: number, body?: Row): number {
    return status === 400 && String(body?.statusCode) === "404" && body?.error === "not_found" &&
            body?.message === "Object not found"
        ? 404
        : status;
}

export function validateState(manifest: Manifest, current: Snapshot) {
    if (manifest.version !== 1 || manifest.project !== PROJECT) fail("Wrong manifest/project");
    if (current.active_gallery_writers !== 0) fail("Active gallery writer; stop and investigate");
    for (
        const field of [
            "images",
            "galleries",
            "receipts",
            "cron_jobs",
            "source_bucket",
            "buckets",
            "public_tables",
            "other_storage_fingerprint",
            "policies_hash",
            "original_rpc_hash",
        ] as const
    ) {
        if (!same(current[field], manifest.before[field])) fail(`State changed: ${field}`);
    }
    const job = current.cron_jobs.find((j) => Array.isArray(j) && j[0] === 5) as unknown[];
    if (
        !job || job[1] !== "bubududu-gallery-daily-cleanup" || job[2] !== "0 19 * * *" ||
        job[3] !== true
    ) fail("Cron invariant failed");
    const entries = new Map<string, Entry>();
    const images = new Map(current.images.map((r) => [r.id, r]));
    const galleries = new Map(current.galleries.map((g) => [g.id, g]));
    for (const e of manifest.entries) {
        const row = images.get(e.imageId), gallery = galleries.get(e.galleryId);
        if (
            !row || !gallery || row.gallery_id !== gallery.id || gallery.storage_deleting ||
            row.storage_provider !== "r2" || row.storage_state !== "ready"
        ) fail(`Image not ready R2: ${e.imageId}`);
        const keys = imageKeys(String(gallery.space_id), e.galleryId, e.imageId);
        if (
            e.bucket !== "gallery-private" || e.storageProvider !== "r2" ||
            e.sourceKey !== keys[e.variant] || e.r2Key !== e.sourceKey ||
            row[`storage_path_${e.variant}`] !== e.sourceKey ||
            row[`bytes_${e.variant}`] !== e.bytes || !Number.isSafeInteger(e.bytes) ||
            e.bytes < 1 || !/^[a-f0-9]{64}$/.test(e.sha256)
        ) fail(`Invalid exact entry: ${e.sourceKey}`);
        if (entries.has(e.sourceKey)) fail("Duplicate source key");
        entries.set(e.sourceKey, e);
    }
    if (!entries.size || manifest.excluded.some((e) => entries.has(e.key))) {
        fail("Empty scope or excluded key included");
    }
    const originalSources = new Map(manifest.before.source_objects.map((o) => [o.name, o]));
    const currentSources = new Map(current.source_objects.map((o) => [o.name, o]));
    for (const object of current.source_objects) {
        if (!same(object, originalSources.get(object.name))) {
            fail(`Source metadata changed: ${object.name}`);
        }
    }
    for (const object of manifest.before.source_objects) {
        if (!entries.has(object.name) && !same(object, currentSources.get(object.name))) {
            fail(`Protected source changed: ${object.name}`);
        }
    }
    for (const receipt of current.receipts) {
        if ((receipt.object_keys as string[]).some((key) => entries.has(key))) {
            fail("Deletion receipt references target");
        }
    }
    for (const g of current.galleries) {
        if (!g.cover_image_thumb_path && !g.cover_image_path) continue;
        const cover = current.images.find((r) =>
            r.gallery_id === g.id && r.storage_state === "ready" &&
            r.storage_path_thumb === g.cover_image_thumb_path &&
            r.storage_path_grid === g.cover_image_path
        );
        if (!cover) fail(`Invalid cover: ${g.id}`);
    }
    for (const ref of current.references) {
        const e = entries.get(ref.object_key);
        if (!e) continue;
        const ownImage = ref.table_name === "date_images" && ref.row_id === e.imageId &&
            ref.column_name === `storage_path_${e.variant}`;
        const ownCover = ref.table_name === "galleries" && ref.row_id === e.galleryId &&
            ((e.variant === "thumb" && ref.column_name === "cover_image_thumb_path") ||
                (e.variant === "grid" && ref.column_name === "cover_image_path"));
        if (!ownImage && !ownCover) {
            fail(`Conflicting reference: ${ref.table_name}.${ref.column_name}`);
        }
    }
}

export function buildManifest(
    historical: Row,
    previous: Snapshot,
    current: Snapshot,
    digest: string,
): Manifest {
    const entries: Entry[] = [];
    for (
        const image of historical.manifest as (Row & { variants: Row[]; source_checksums: Row[] })[]
    ) {
        const row = current.images.find((r) => r.id === image.id);
        const old = previous.images.find((r) => r.id === image.id);
        if (!row || !old || !same(row, old)) fail(`Historical image changed: ${image.id}`);
        if (image.variants.length !== 3) fail("Incomplete historical variants");
        for (const variant of image.variants) {
            const checksum = image.source_checksums.find((c) => c.key === variant.key);
            if (
                !checksum || checksum.bytes !== variant.expected_bytes ||
                checksum.bytes !== variant.storage_bytes
            ) fail("Historical checksum/size missing");
            entries.push({
                bucket: "gallery-private",
                sourceKey: String(variant.key),
                r2Key: String(variant.key),
                imageId: String(image.id),
                galleryId: String(image.gallery_id),
                variant: variant.variant as Entry["variant"],
                bytes: Number(checksum.bytes),
                sha256: String(checksum.sha256),
                storageProvider: "r2",
            });
        }
    }
    for (const g of previous.galleries) {
        if (!same(g, current.galleries.find((r) => r.id === g.id))) {
            fail(`Historical gallery changed: ${g.id}`);
        }
    }
    const manifest: Manifest = {
        version: 1,
        project: PROJECT,
        createdAt: new Date().toISOString(),
        migrationSha256: digest,
        entries: entries.sort((a, b) => a.sourceKey.localeCompare(b.sourceKey)),
        excluded: historical.unreferenced_objects as Manifest["excluded"],
        before: current,
    };
    validateState(manifest, current);
    const objects = new Map(current.source_objects.map((o) => [o.name, o]));
    for (const e of entries) {
        if (Number(objects.get(e.sourceKey)?.metadata.size) !== e.bytes) {
            fail(`Source absent/size changed: ${e.sourceKey}`);
        }
        if (
            !same(
                objects.get(e.sourceKey),
                previous.source_objects.find((o) => o.name === e.sourceKey),
            )
        ) fail(`Historical source metadata changed: ${e.sourceKey}`);
    }
    for (const e of manifest.excluded) {
        if (Number(objects.get(e.key)?.metadata.size) !== e.bytes) {
            fail("Excluded source changed");
        }
    }
    return manifest;
}

export type Progress = {
    manifestSha256: string;
    completed: string[];
    batches: Row[];
    failed: string[];
    sourceDeletionComplete?: boolean;
};
export type CleanupIO = {
    snapshot: () => Promise<Snapshot>;
    readR2: (entry: Entry) => Promise<Uint8Array | null>;
    sourceStatus: (key: string) => Promise<number>;
    remove: (keys: string[]) => Promise<{ acknowledged: string[]; error: boolean }>;
    save: (progress: Progress) => Promise<void>;
    assertManifest: () => Promise<void>;
};
export async function verifyCopies(
    entries: Entry[],
    read: CleanupIO["readR2"],
    onProgress = (_n: number) => {},
) {
    let next = 0, done = 0, stopped = false;
    const worker = async () => {
        while (!stopped && next < entries.length) {
            const e = entries[next++];
            try {
                const bytes = await read(e);
                if (!bytes || bytes.byteLength !== e.bytes || await sha256(bytes) !== e.sha256) {
                    fail(`R2 checksum/size/absence: ${e.sourceKey}`);
                }
                onProgress(++done);
            } catch (error) {
                stopped = true;
                throw error;
            }
        }
    };
    const outcomes = await Promise.allSettled([worker(), worker()]);
    const error = outcomes.find((r) => r.status === "rejected");
    if (error?.status === "rejected") throw error.reason;
    return done;
}

export async function cleanup(
    manifest: Manifest,
    progress: Progress,
    io: CleanupIO,
    apply = false,
) {
    await io.assertManifest();
    validateState(manifest, await io.snapshot());
    if (
        new Set(progress.completed).size !== progress.completed.length ||
        progress.completed.some((key) => !manifest.entries.some((e) => e.sourceKey === key))
    ) fail("Invalid progress keys");
    // A complete fresh pass is required before the first source deletion, even on resume.
    await verifyCopies(manifest.entries, io.readR2, (n) => {
        if (n % 100 === 0) console.log(`R2 checksum verified ${n}/${manifest.entries.length}`);
    });
    if (!apply) return;
    const done = new Set(progress.completed);
    // Reconcile reported progress rather than trusting a previous HTTP success.
    for (const key of done) {
        if (await io.sourceStatus(key) !== 404) {
            fail(`Completed source reappeared/unknown: ${key}`);
        }
    }
    for (let offset = 0; offset < manifest.entries.length; offset += 100) {
        const entries = manifest.entries.slice(offset, offset + 100).filter((e) =>
            !done.has(e.sourceKey)
        );
        if (!entries.length) continue;
        await io.assertManifest();
        validateState(manifest, await io.snapshot());
        await verifyCopies(entries, io.readR2);
        const present: string[] = [];
        for (const e of entries) {
            const status = await io.sourceStatus(e.sourceKey);
            if (status === 200) present.push(e.sourceKey);
            else if (status !== 404) fail(`Unknown source state (${status}): ${e.sourceKey}`);
        }
        // Revalidate immediately after the read checks and immediately before removal.
        validateState(manifest, await io.snapshot());
        const attempt: Row = {
            at: new Date().toISOString(),
            requested: present,
            reconciled: false,
        };
        progress.batches.push(attempt);
        progress.failed = present;
        await io.save(progress); // Persist intent before an interruptible Storage request.
        const response = present.length
            ? await io.remove(present)
            : { acknowledged: [], error: false };
        const absent: string[] = [], failed: string[] = [];
        for (const e of entries) {
            if (await io.sourceStatus(e.sourceKey) === 404) {
                absent.push(e.sourceKey);
                done.add(e.sourceKey);
            } else failed.push(e.sourceKey);
        }
        progress.completed = [...done];
        progress.failed = failed;
        Object.assign(attempt, {
            reconciled: true,
            acknowledged: response.acknowledged,
            apiError: response.error,
            verifiedAbsent: absent,
            failed,
        });
        await io.save(progress);
        console.log(`Sources independently absent ${done.size}/${manifest.entries.length}`);
        if (
            response.error || failed.length || response.acknowledged.some((key) =>
                !present.includes(key)
            ) || present.some((key) => !response.acknowledged.includes(key))
        ) fail("Storage response/absence incomplete; stop and inspect batch report");
    }
    validateState(manifest, await io.snapshot());
    progress.sourceDeletionComplete = true;
    await io.save(progress);
}

export function parseArgs(args: string[]) {
    const names = ["migration-dir", "manifest", "report", "snapshot-helper"];
    if (
        args.some((a) =>
            a !== "--apply" && a !== "--help" && !names.some((n) => a.startsWith(`--${n}=`))
        )
    ) fail("Unknown argument");
    const value = (n: string) => args.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3);
    return {
        apply: args.includes("--apply"),
        help: args.includes("--help"),
        migration: value("migration-dir"),
        manifest: value("manifest"),
        report: value("report"),
        helper: value("snapshot-helper"),
    };
}

async function main() {
    const o = parseArgs(Deno.args);
    if (o.help) {
        console.log(
            "Dry-run by default. Required: --migration-dir=PATH --manifest=PATH --report=PATH --snapshot-helper=PATH. Add --apply for exact source deletion. The reviewed helper must emit a current read-only SQL snapshot, including reference/lock audits. No R2/database mutations.",
        );
        return;
    }
    if (!o.migration || !o.manifest || !o.report || !o.helper) fail("All four paths are required");
    const url = Deno.env.get("SUPABASE_URL");
    if (url !== `https://${PROJECT}.supabase.co`) fail("Wrong Supabase project");
    const { createClient } = await import("npm:@supabase/supabase-js@2.49.10");
    const { backendKey } = await import("../supabase/functions/_shared/gallery-auth.ts");
    const { R2Storage } = await import("../supabase/functions/_shared/r2.ts");
    const key = backendKey();
    const admin = createClient(url!, key, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: {
            fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(30000) }),
        },
    });
    const r2 = new R2Storage();
    const read = async (p: string) =>
        JSON.parse((await Deno.readTextFile(p)).replace(/^\uFEFF/, ""));
    const snapshot = async (): Promise<Snapshot> => {
        // The CLI needs its normal local login, never the R2/Supabase service credentials.
        const env = Object.fromEntries(
            Object.entries(Deno.env.toObject()).filter(([n]) =>
                !/^(R2_|SUPABASE_|MIGRATION_)/.test(n)
            ),
        );
        const result = await new Deno.Command("node", {
            args: [o.helper!],
            clearEnv: true,
            env,
            stdout: "piped",
            stderr: "piped",
        }).output();
        if (!result.success) fail("Read-only snapshot helper failed");
        return JSON.parse(new TextDecoder().decode(result.stdout)).rows[0].snapshot;
    };
    const migrationText = await Deno.readTextFile(`${o.migration}/migration-manifest.json`);
    const migrationHash = await sha256(new TextEncoder().encode(migrationText));
    let manifest: Manifest;
    if (o.apply) manifest = await read(o.manifest!);
    else {manifest = buildManifest(
            JSON.parse(migrationText),
            (await read(`${o.migration}/final-after.json`)).rows[0].snapshot,
            await snapshot(),
            migrationHash,
        );}
    if (manifest.migrationSha256 !== migrationHash) fail("Migration manifest changed");
    const manifestText = o.apply
        ? await Deno.readTextFile(o.manifest!)
        : JSON.stringify(manifest, null, 2);
    const manifestHash = await sha256(new TextEncoder().encode(manifestText));
    const progress: Progress = o.apply
        ? await read(o.report!)
        : { manifestSha256: manifestHash, completed: [], batches: [], failed: [] };
    if (progress.manifestSha256 !== manifestHash) fail("Cleanup manifest changed");
    const save = async (p: Progress) => {
        const temp = o.report! + ".tmp";
        await Deno.writeTextFile(temp, JSON.stringify(p, null, 2));
        await Deno.rename(temp, o.report!);
    };
    const io: CleanupIO = {
        snapshot,
        readR2: async (e) => {
            const response = await fetch(await r2.presign(e.r2Key, "GET", 300), {
                cache: "no-store",
                signal: AbortSignal.timeout(30000),
            }).catch(() => fail(`R2 transport failed: ${e.sourceKey}`));
            if (response.status === 404) return null;
            if (response.status !== 200) fail(`R2 GET failed (${response.status}): ${e.sourceKey}`);
            return new Uint8Array(await response.arrayBuffer());
        },
        sourceStatus: async (objectKey) => {
            const objectUrl = `${url}/storage/v1/object/authenticated/gallery-private/${
                objectKey.split("/").map(encodeURIComponent).join("/")
            }`;
            const init = {
                headers: { apikey: key },
                cache: "no-store" as const,
                signal: AbortSignal.timeout(30000),
            };
            const head = await fetch(objectUrl, { ...init, method: "HEAD" }).catch(() =>
                fail(`Source HEAD transport failed: ${objectKey}`)
            );
            if (head.status !== 400) return head.status;
            const missing = await fetch(objectUrl, { ...init, signal: AbortSignal.timeout(30000) })
                .catch(() => fail(`Source absence transport failed: ${objectKey}`));
            const body = await missing.json().catch(() => null);
            return sourceResult(missing.status, body);
        },
        remove: async (keys) => {
            const { data, error } = await admin.storage.from("gallery-private").remove(keys);
            return { acknowledged: (data ?? []).map((r) => r.name), error: Boolean(error) };
        },
        save,
        assertManifest: async () => {
            if (
                o.apply &&
                await sha256(new TextEncoder().encode(await Deno.readTextFile(o.manifest!))) !==
                    manifestHash
            ) fail("Immutable manifest changed during cleanup");
        },
    };
    try {
        await cleanup(manifest, progress, io, o.apply);
        if (!o.apply) {
            // Only verified candidates become an immutable deletion manifest.
            await Deno.writeTextFile(o.manifest!, manifestText, { createNew: true });
            await save(progress);
        }
    } catch (error) {
        await Deno.writeTextFile(
            o.report! + ".failure.json",
            JSON.stringify(
                {
                    at: new Date().toISOString(),
                    error: error instanceof Error ? error.message : "Cleanup failed",
                    progress,
                },
                null,
                2,
            ),
        );
        throw error;
    }
    console.log(JSON.stringify({
        mode: o.apply ? "apply" : "dry-run",
        entries: manifest.entries.length,
        bytes: manifest.entries.reduce((n, e) => n + e.bytes, 0),
        excluded: manifest.excluded.length,
        independentlyAbsent: progress.completed.length,
        sourceDeletionComplete: Boolean(progress.sourceDeletionComplete),
        manifestSha256: manifestHash,
    }));
}
if (import.meta.main) await main();
