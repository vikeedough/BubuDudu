import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Body = {
    galleryId: string;
};

const BUCKET = "gallery-private";
const STORAGE_REMOVE_CHUNK_SIZE = 100;

type DeleteGalleryResult =
    | {
          ok: true;
          alreadyDeleted: boolean;
          removedImages: number;
          removedStoragePaths: number;
          storageWarnings: string[];
      }
    | {
          ok: false;
          stage: string;
          error: string;
          canFallback: boolean;
      };

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

    let body: Body;
    try {
        body = (await req.json()) as Body;
    } catch {
        return new Response("Invalid JSON body", { status: 400 });
    }

    if (!body?.galleryId) {
        return new Response("Invalid body", { status: 400 });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
    });

    const { data: galleryRow, error: galleryErr } = await userClient
        .from("galleries")
        .select("id")
        .eq("id", body.galleryId)
        .maybeSingle();

    if (galleryErr) {
        const result: DeleteGalleryResult = {
            ok: false,
            stage: "fetch_gallery",
            error: galleryErr.message,
            canFallback: false,
        };
        return new Response(JSON.stringify(result), {
            headers: { "Content-Type": "application/json" },
        });
    }

    if (!galleryRow?.id) {
        const result: DeleteGalleryResult = {
            ok: true,
            alreadyDeleted: true,
            removedImages: 0,
            removedStoragePaths: 0,
            storageWarnings: [],
        };
        return new Response(JSON.stringify(result), {
            headers: { "Content-Type": "application/json" },
        });
    }

    const { data: imageRows, error: imageRowsErr } = await userClient
        .from("date_images")
        .select("id, storage_path_thumb, storage_path_grid, storage_path_orig")
        .eq("gallery_id", body.galleryId);

    if (imageRowsErr) {
        const result: DeleteGalleryResult = {
            ok: false,
            stage: "fetch_images",
            error: imageRowsErr.message,
            canFallback: false,
        };
        return new Response(JSON.stringify(result), {
            headers: { "Content-Type": "application/json" },
        });
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

    const storageWarnings: string[] = [];
    for (const pathChunk of chunk(storagePaths, STORAGE_REMOVE_CHUNK_SIZE)) {
        const { error: storageErr } = await userClient.storage
            .from(BUCKET)
            .remove(pathChunk);
        if (storageErr) {
            storageWarnings.push(storageErr.message);
        }
    }

    const { error: delImagesErr } = await userClient
        .from("date_images")
        .delete()
        .eq("gallery_id", body.galleryId);
    if (delImagesErr) {
        const result: DeleteGalleryResult = {
            ok: false,
            stage: "delete_images",
            error: delImagesErr.message,
            canFallback: false,
        };
        return new Response(JSON.stringify(result), {
            headers: { "Content-Type": "application/json" },
        });
    }

    const { data: deletedGalleryRows, error: delGalleryErr } = await userClient
        .from("galleries")
        .delete()
        .eq("id", body.galleryId)
        .select("id");

    if (delGalleryErr) {
        const result: DeleteGalleryResult = {
            ok: false,
            stage: "delete_gallery",
            error: delGalleryErr.message,
            canFallback: false,
        };
        return new Response(JSON.stringify(result), {
            headers: { "Content-Type": "application/json" },
        });
    }

    const result: DeleteGalleryResult = {
        ok: true,
        alreadyDeleted: (deletedGalleryRows?.length ?? 0) === 0,
        removedImages: imageRows?.length ?? 0,
        removedStoragePaths: storagePaths.length,
        storageWarnings,
    };

    return new Response(
        JSON.stringify(result),
        {
            headers: { "Content-Type": "application/json" },
        },
    );
});
