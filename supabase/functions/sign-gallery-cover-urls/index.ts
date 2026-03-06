import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Body = {
    paths: string[];
};

const BUCKET = "gallery-private";
const TTL_SECONDS = 60 * 60;

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
    if (!body || !Array.isArray(body.paths)) {
        return new Response("Invalid body", { status: 400 });
    }

    const paths = Array.from(
        new Set(
            body.paths.filter(
                (path): path is string =>
                    typeof path === "string" && path.length > 0,
            ),
        ),
    );

    if (paths.length === 0) {
        return new Response(JSON.stringify({}), {
            headers: { "Content-Type": "application/json" },
        });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
    });

    const signed = await Promise.all(
        paths.map(async (path) => {
            const { data, error } = await userClient.storage
                .from(BUCKET)
                .createSignedUrl(path, TTL_SECONDS);

            if (error || !data?.signedUrl) {
                return [path, null] as const;
            }
            return [path, data.signedUrl] as const;
        }),
    );

    const out: Record<string, string> = {};
    for (const [path, url] of signed) {
        if (url) out[path] = url;
    }

    return new Response(JSON.stringify(out), {
        headers: { "Content-Type": "application/json" },
    });
});
