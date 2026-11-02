// Pinned server/test dependency; intentionally kept out of the Expo dependency graph.
// deno-lint-ignore no-import-prefix
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.49.10";
import { requiredEnv } from "./r2.ts";

export class HttpError extends Error {
    constructor(public status: number, message: string) {
        super(message);
    }
}
export const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};
export function json(body: unknown, status = 200) {
    return Response.json(body, { status, headers: cors });
}
export function backendKey() {
    const keys = Deno.env.get("SUPABASE_SECRET_KEYS");
    if (keys) {
        const key = JSON.parse(keys).default;
        if (typeof key === "string" && key) return key;
    }
    return requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
}
export type GalleryContext = { admin: SupabaseClient; userId: string };
export async function authenticate(req: Request): Promise<GalleryContext> {
    const token = /^Bearer\s+(\S+)$/i.exec(req.headers.get("Authorization") ?? "")?.[1];
    if (!token) throw new HttpError(401, "Missing Authorization");
    const admin = createClient(requiredEnv("SUPABASE_URL"), backendKey(), {
        auth: { persistSession: false, autoRefreshToken: false },
    });
    // Validate with Auth; presence/decoding of a JWT is not authentication.
    const { data, error } = await admin.auth.getUser(token);
    if (error || !data.user) throw new HttpError(401, "Invalid Authorization");
    return { admin, userId: data.user.id };
}
export async function authorizeGallery(ctx: GalleryContext, galleryId: string) {
    const { data: gallery, error } = await ctx.admin.from("galleries").select("*").eq(
        "id",
        galleryId,
    ).maybeSingle();
    if (error) throw new Error("Gallery lookup failed");
    if (!gallery) throw new HttpError(404, "Gallery not found");
    const { data: member, error: membershipError } = await ctx.admin.from("space_members").select(
        "user_id",
    )
        .eq("space_id", gallery.space_id).eq("user_id", ctx.userId).maybeSingle();
    if (membershipError || !member) throw new HttpError(403, "Gallery membership required");
    return gallery;
}
export async function operation(
    ctx: GalleryContext,
    action: string,
    galleryId: string,
    args: Record<string, unknown> = {},
) {
    const { data, error } = await ctx.admin.rpc("gallery_storage_operation", {
        p_action: action,
        p_gallery: galleryId,
        p_user: ctx.userId,
        ...args,
    });
    if (error) throw new HttpError(error.code === "42501" ? 403 : 409, error.message);
    return data;
}
export function endpoint(handler: (req: Request, ctx: GalleryContext) => Promise<Response>) {
    return async (req: Request) => {
        if (req.method === "OPTIONS") return new Response(null, { headers: cors });
        if (req.method !== "POST") return json({ error: "Method Not Allowed" }, 405);
        try {
            return await handler(req, await authenticate(req));
        } catch (error) {
            const status = error instanceof HttpError
                ? error.status
                : (error instanceof SyntaxError || error instanceof TypeError)
                ? 400
                : 500;
            // Do not log request URLs, JWTs, S3 signatures, or SDK request objects.
            return json({
                ok: false,
                error: error instanceof Error ? error.message : "Gallery request failed",
            }, status);
        }
    };
}
