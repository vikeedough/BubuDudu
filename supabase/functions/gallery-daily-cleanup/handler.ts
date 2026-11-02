// Pinned official auth core avoids importing browser CORS helpers from the wrapper.
// deno-lint-ignore no-import-prefix
import { createAdminClient, verifyAuth } from "npm:@supabase/server@1.9.2/core";
import { runDailyCleanup } from "../_shared/gallery-cleanup.ts";

export async function handler(req: Request) {
    const { data: auth, error } = await verifyAuth(req, { auth: "secret:gallery_cleanup" });
    if (error) {
        return Response.json({
            ok: false,
            error: "Scheduler authentication rejected",
            code: error.code,
        }, { status: error.status });
    }
    if (req.method !== "POST") {
        return Response.json({ ok: false, error: "POST required" }, { status: 405 });
    }
    // The only optional action is a read-only deployment diagnostic, never a work selector.
    let statusOnly = false;
    try {
        const body = await req.text();
        const parsed = body ? JSON.parse(body) : {};
        if (
            body.length > 1024 || !parsed || typeof parsed !== "object" ||
            Array.isArray(parsed)
        ) throw new Error();
        statusOnly = parsed.action === "status" && Object.keys(parsed).length === 1;
        if (Object.keys(parsed).length && !statusOnly) throw new Error();
    } catch {
        return Response.json({ ok: false, error: "Expected {} or a read-only status action" }, {
            status: 400,
        });
    }
    // Only construct the privileged client after the named secret was independently verified.
    try {
        const admin = createAdminClient({
            auth: { keyName: auth.keyName! },
            supabaseOptions: {
                global: {
                    fetch: (input, init) =>
                        fetch(input, {
                            ...init,
                            signal: init?.signal
                                ? AbortSignal.any([init.signal, AbortSignal.timeout(10000)])
                                : AbortSignal.timeout(10000),
                        }),
                },
            },
        });
        if (statusOnly) {
            const { data, error } = await admin.rpc("gallery_cleanup_counts")
                .abortSignal(AbortSignal.timeout(10000));
            if (error) {
                console.error("Gallery daily cleanup status lookup failed");
                return Response.json({ ok: false, mode: "status", readOnly: true }, {
                    status: 500,
                });
            }
            const result = {
                ok: true,
                mode: "status",
                readOnly: true,
                timestamp: new Date().toISOString(),
                counts: data,
            };
            console.log("Gallery daily cleanup status", result);
            return Response.json(result);
        }
        const result = await runDailyCleanup(admin);
        return Response.json(result, { status: !result.ok ? 500 : result.complete ? 200 : 202 });
    } catch {
        console.error("Gallery daily cleanup client configuration failed");
        return Response.json({ ok: false, error: "Cleanup configuration failed" }, { status: 500 });
    }
}
