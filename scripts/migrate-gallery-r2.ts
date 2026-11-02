import { type ImageRow, requireId } from "../supabase/functions/_shared/gallery-model.ts";
import { R2Storage, requiredEnv } from "../supabase/functions/_shared/r2.ts";
import { migrateImage } from "./gallery-migration-core.ts";

export function parseArgs(args: string[]) {
    if (
        args.some((a) =>
            a !== "--apply" && a !== "--help" && !a.startsWith("--report=") &&
            !a.startsWith("--gallery=")
        )
    ) {
        throw new Error("Unknown option; use --help");
    }
    const gallery = args.find((a) => a.startsWith("--gallery="))?.slice(10);
    return {
        apply: args.includes("--apply"),
        help: args.includes("--help"),
        gallery: gallery ? requireId(gallery) : undefined,
        report: args.find((a) => a.startsWith("--report="))?.slice(9) || "gallery-r2-report.json",
    };
}

async function main() {
    const options = parseArgs(Deno.args);
    if (options.help) {
        console.log(
            "Dry-run (default): deno run --allow-env --allow-net --allow-read --allow-write scripts/migrate-gallery-r2.ts [--gallery=UUID] [--report=PATH]\nAdd --apply to copy, verify and switch providers. Source objects are NEVER deleted.",
        );
        return;
    }
    // Lazy imports keep --help independent of SDK environment access.
    // deno-lint-ignore no-import-prefix
    const { createClient } = await import("npm:@supabase/supabase-js@2.49.10");
    const { backendKey } = await import("../supabase/functions/_shared/gallery-auth.ts");
    const url = requiredEnv("SUPABASE_URL");
    const key = backendKey();
    const admin = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
    const r2 = options.apply ? new R2Storage() : undefined;
    const report: {
        apply: boolean;
        started: string;
        inventory: string[];
        unreferenced: string[];
        images: unknown[];
    } = {
        apply: options.apply,
        started: new Date().toISOString(),
        inventory: [],
        unreferenced: [],
        images: [],
    };
    const save = () => Deno.writeTextFile(options.report, JSON.stringify(report, null, 2));
    async function inventory(prefix: string) {
        for (let offset = 0;; offset += 1000) {
            const { data, error } = await admin.storage.from("gallery-private").list(prefix, {
                limit: 1000,
                offset,
                sortBy: { column: "name", order: "asc" },
            });
            if (error) throw new Error("Supabase object inventory failed");
            for (const object of data ?? []) {
                const path = `${prefix}/${object.name}`;
                if (object.id) report.inventory.push(path);
                else await inventory(path);
            }
            if ((data?.length ?? 0) < 1000) break;
        }
    }
    // The inventory is specific to this gallery bucket; avatars are never accessed.
    await inventory("spaces");
    const referenced = new Set<string>();
    let cursor = "";
    let failures = 0;
    for (;;) {
        let query = admin.from("date_images").select("*").order("id").limit(100);
        if (cursor) query = query.gt("id", cursor);
        if (options.gallery) query = query.eq("gallery_id", options.gallery);
        const { data, error } = await query;
        if (error) {
            throw new Error("Image inventory failed; apply the additive schema migration first");
        }
        for (const raw of data ?? []) {
            const row = raw as ImageRow;
            for (
                const path of [row.storage_path_thumb, row.storage_path_grid, row.storage_path_orig]
            ) if (path) referenced.add(path);
            try {
                const { data: gallery, error: galleryError } = await admin.from("galleries").select(
                    "space_id,storage_deleting",
                ).eq("id", row.gallery_id).single();
                if (galleryError || !gallery || gallery.storage_deleting) {
                    throw new Error("Gallery missing or being deleted");
                }
                const result = await migrateImage(row, gallery.space_id, {
                    source: async (path) => {
                        const response = await fetch(
                            `${url}/storage/v1/object/authenticated/gallery-private/${path}`,
                            {
                                headers: {
                                    apikey: key,
                                    ...(key.startsWith("sb_secret_")
                                        ? {}
                                        : { Authorization: `Bearer ${key}` }),
                                },
                            },
                        );
                        if (response.status === 404) return null;
                        if (!response.ok) {
                            throw new Error(`Source download failed (${response.status})`);
                        }
                        const headers: Record<string, string> = {};
                        for (const [name, value] of response.headers) {
                            if (
                                [
                                    "content-type",
                                    "cache-control",
                                    "content-disposition",
                                    "content-language",
                                ].includes(name) || name.startsWith("x-amz-meta-")
                            ) headers[name] = value;
                        }
                        return { bytes: new Uint8Array(await response.arrayBuffer()), headers };
                    },
                    target: (path) => r2!.read(path),
                    copy: (path, object) => r2!.putExact(path, object.bytes, object.headers),
                    switchProvider: async (snapshot) => {
                        const { data: members, error: membershipError } = await admin.from(
                            "space_members",
                        ).select("user_id").eq("space_id", gallery.space_id).limit(1);
                        if (membershipError || !members?.length) {
                            throw new Error("No space member available for guarded migration");
                        }
                        const { error } = await admin.rpc("gallery_storage_operation", {
                            p_action: "migrate",
                            p_gallery: row.gallery_id,
                            p_image: row.id,
                            p_user: members[0].user_id,
                            p_snapshot: snapshot,
                        });
                        if (error) {
                            throw new Error(
                                "Provider switch rejected: record changed; re-inventory before retrying",
                            );
                        }
                    },
                }, options.apply);
                report.images.push(result);
            } catch (error) {
                failures++;
                report.images.push({
                    id: row.id,
                    status: "failed",
                    error: error instanceof Error ? error.message : "Migration failed",
                });
            }
            await save(); // interruption-safe audit; resume rechecks destination bytes and current DB state
        }
        if (!data?.length) break;
        cursor = data[data.length - 1].id;
    }
    // A gallery-scoped run cannot classify other galleries' objects as orphans.
    report.unreferenced = report.inventory.filter((p) =>
        (!options.gallery || p.includes(`/galleries/${options.gallery}/`)) && !referenced.has(p)
    );
    await save();
    console.log(
        `${
            options.apply
                ? "Apply"
                : "Dry-run"
        } finished: ${report.images.length} images, ${failures} failures. Report: ${options.report}. Source objects retained.`,
    );
    if (failures) Deno.exitCode = 1;
}
if (import.meta.main) await main();
