import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Body = {
    galleryId: string;
    imageIds: Array<number>;
};

const BUCKET = "gallery-private";
const TTL_SECONDS = 60 * 60;

Deno.serve(async (req) => {
    if (req.method !== "POST")
        return new Response("Method Not Allowed", { status: 405 });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader)
        return new Response("Missing Authorization", { status: 401 });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // User-scoped client (enforces RLS for DB reads, and uses Storage policies for signing)
    const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
    });

    const body = (await req.json()) as Body;
    if (!body?.galleryId || !Array.isArray(body.imageIds)) {
        return new Response("Invalid body", { status: 400 });
    }

    // RLS on galleries/date_images already checks membership via space_members.
    const { data: images, error } = await userClient
        .from("date_images")
        .select("id, storage_path_thumb, storage_path_grid, storage_path_orig")
        .eq("gallery_id", body.galleryId)
        .in("id", body.imageIds);

    if (error) return new Response(error.message, { status: 403 });

    const out: Record<
        string,
        { url_thumb: string; url_grid: string; url_orig: string }
    > = {};

    for (const img of images ?? []) {
        const [thumb, grid, orig] = await Promise.all([
            userClient.storage
                .from(BUCKET)
                .createSignedUrl(img.storage_path_thumb, TTL_SECONDS),
            userClient.storage
                .from(BUCKET)
                .createSignedUrl(img.storage_path_grid, TTL_SECONDS),
            userClient.storage
                .from(BUCKET)
                .createSignedUrl(img.storage_path_orig, TTL_SECONDS),
        ]);

        if (
            !thumb.data?.signedUrl ||
            !grid.data?.signedUrl ||
            !orig.data?.signedUrl
        ) {
            return new Response("Failed to sign one or more URLs", {
                status: 500,
            });
        }

        out[String(img.id)] = {
            url_thumb: thumb.data.signedUrl,
            url_grid: grid.data.signedUrl,
            url_orig: orig.data.signedUrl,
        };
    }

    return new Response(JSON.stringify(out), {
        headers: { "Content-Type": "application/json" },
    });
});
