import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Body = {
    galleryId: string;
};

const BUCKET = "gallery-private";
const STORAGE_REMOVE_CHUNK_SIZE = 100;

function chunk<T>(items: T[], size: number): T[][] {
    if (items.length === 0) return [];
    const out: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
        out.push(items.slice(i, i + size));
    }
    return out;
}

Deno.serve(async (req) => {
    if (req.method !== "POST") {
        return new Response("Method Not Allowed", { status: 405 });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
        return new Response("Missing Authorization", { status: 401 });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !anonKey) {
        return new Response("Missing Supabase env", { status: 500 });
    }

    const body = (await req.json()) as Body;
    if (!body?.galleryId) {
        return new Response("Invalid body", { status: 400 });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
    });

    const { data: imageRows, error: imageRowsErr } = await userClient
        .from("date_images")
        .select("id, storage_path_thumb, storage_path_grid, storage_path_orig")
        .eq("gallery_id", body.galleryId);

    if (imageRowsErr) {
        return new Response(imageRowsErr.message, { status: 403 });
    }

    const storagePaths = Array.from(
        new Set(
            (imageRows ?? [])
                .flatMap((row) => [
                    row.storage_path_thumb,
                    row.storage_path_grid,
                    row.storage_path_orig,
                ])
                .filter(
                    (path): path is string =>
                        typeof path === "string" && path.length > 0,
                ),
        ),
    );

    for (const pathChunk of chunk(storagePaths, STORAGE_REMOVE_CHUNK_SIZE)) {
        const { error: storageErr } = await userClient.storage
            .from(BUCKET)
            .remove(pathChunk);
        if (storageErr) {
            return new Response(storageErr.message, { status: 500 });
        }
    }

    const { error: delImagesErr } = await userClient
        .from("date_images")
        .delete()
        .eq("gallery_id", body.galleryId);
    if (delImagesErr) {
        return new Response(delImagesErr.message, { status: 500 });
    }

    const { error: delGalleryErr } = await userClient
        .from("galleries")
        .delete()
        .eq("id", body.galleryId);
    if (delGalleryErr) {
        return new Response(delGalleryErr.message, { status: 500 });
    }

    return new Response(
        JSON.stringify({
            ok: true,
            removedImages: imageRows?.length ?? 0,
            removedStoragePaths: storagePaths.length,
        }),
        {
            headers: { "Content-Type": "application/json" },
        },
    );
});
