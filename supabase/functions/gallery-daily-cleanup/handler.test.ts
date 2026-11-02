import { strict as assert } from "node:assert";
import { handler } from "./handler.ts";
import { imageKeys } from "../_shared/gallery-model.ts";
import type { DeletionReceipt } from "../_shared/gallery-storage.ts";

const space = "11111111-1111-4111-8111-111111111111";
const gallery = "22222222-2222-4222-8222-222222222222";
const id = "33333333-3333-4333-8333-333333333333";
const oldId = "44444444-4444-4444-8444-444444444444";
const key = "sb_secret_fake_gallery_cleanup_test_key";
const base: DeletionReceipt = {
    image_id: id,
    gallery_id: gallery,
    space_id: space,
    storage_provider: "r2",
    object_keys: [imageKeys(space, gallery, id).thumb, imageKeys(space, gallery, id).orig],
    cleanup_after: new Date(Date.now() - 600000).toISOString(),
    completed_at: null,
};
type Options = {
    rows?: DeletionReceipt[];
    failOrigOnce?: boolean;
    storageFailure?: boolean;
    dbFailure?: string;
    finishFailure?: boolean;
    missing?: boolean;
    partialSupabase?: boolean;
    remaining?: number;
    skipped?: number;
    nextPages?: boolean;
    slow?: boolean;
    networkTimeout?: boolean;
};
async function fixture(
    test: (
        calls: { path: string; method: string; body: Record<string, unknown> }[],
    ) => Promise<void>,
    options: Options = {},
) {
    const fetchOriginal = globalThis.fetch;
    const env = {
        SUPABASE_URL: "https://gallery-test.invalid",
        SUPABASE_SECRET_KEYS: JSON.stringify({
            "gallery_cleanup": key,
            default: "sb_secret_fake_other_key",
        }),
        SUPABASE_PUBLISHABLE_KEYS: JSON.stringify({ default: "sb_publishable_fake_public_key" }),
        R2_ACCOUNT_ID: "a".repeat(32),
        R2_BUCKET_NAME: "gallery-test",
        R2_ACCESS_KEY_ID: "test-access",
        R2_SECRET_ACCESS_KEY: "test-secret",
    };
    const prior = Object.keys(env).map((name) => Deno.env.get(name));
    Object.entries(env).forEach(([name, value]) => Deno.env.set(name, value));
    const calls: { path: string; method: string; body: Record<string, unknown> }[] = [];
    const pending = new Set(
        (options.rows ?? [base]).filter((r) => !r.completed_at).map((r) => r.image_id),
    );
    const deleted = new Set<string>();
    const savedNow = Date.now;
    let now = savedNow();
    let claimed = false, origFailed = false, lastToken = "", storageCalls = 0;
    globalThis.fetch = async (input, init) => {
        const request = new Request(input, init);
        const url = new URL(request.url);
        const body = request.headers.get("content-type")?.includes("json")
            ? await request.json()
            : {};
        calls.push({ path: url.pathname, method: request.method, body });
        if (url.pathname.startsWith("/rest/v1/rpc/")) {
            const action = url.pathname.split("/").at(-1)!;
            if (options.dbFailure === action) {
                return Response.json({ message: "DB unavailable" }, { status: 503 });
            }
            if (action === "gallery_cleanup_prepare") {
                return Response.json({ abandoned: 0, parents: 1 });
            }
            if (action === "gallery_cleanup_counts") {
                return Response.json({
                    pending: options.remaining ?? pending.size,
                    eligible: (options.remaining ?? pending.size) - (options.skipped ?? 0),
                    skipped: options.skipped ?? 0,
                    rechecks: 0,
                    pendingGalleries: 0,
                    abandonedPending: 0,
                });
            }
            if (action === "gallery_cleanup_claim") {
                if (lastToken !== body.p_token) {
                    claimed = false;
                    lastToken = String(body.p_token);
                }
                if (claimed && !options.nextPages) return Response.json([]);
                claimed = true;
                return Response.json(
                    (options.rows ?? [base]).filter((row) =>
                        options.nextPages || pending.has(row.image_id)
                    ),
                );
            }
            if (action === "gallery_cleanup_finish") {
                if (body.p_success && options.finishFailure) {
                    return Response.json({ message: "finish unavailable" }, { status: 503 });
                }
                if (body.p_success) pending.delete(String(body.p_image));
                return Response.json(true);
            }
        }
        if (url.host.endsWith("r2.cloudflarestorage.com") && request.method === "DELETE") {
            if (options.networkTimeout) throw new DOMException("Timed out", "TimeoutError");
            if (options.slow) {
                now += 23000;
                Date.now = () => now;
            }
            if (options.failOrigOnce && !origFailed && url.pathname.endsWith("orig.jpg")) {
                origFailed = true;
                return new Response(null, { status: 403 });
            }
            const status = options.missing || deleted.has(url.pathname) ? 404 : 204;
            deleted.add(url.pathname);
            return new Response(null, { status });
        }
        if (url.pathname === "/storage/v1/object/gallery-private" && request.method === "DELETE") {
            if (options.partialSupabase && ++storageCalls === 2) {
                return Response.json({ error: "Partial failure" }, { status: 403 });
            }
            if (options.storageFailure) {
                return Response.json({ error: "Storage unavailable" }, { status: 403 });
            }
            return Response.json(options.missing ? [] : [{ name: (body.prefixes as string[])[0] }]);
        }
        throw new Error("Unexpected test request");
    };
    try {
        await test(calls);
    } finally {
        Date.now = savedNow;
        globalThis.fetch = fetchOriginal;
        Object.keys(env).forEach((name, i) =>
            prior[i] === undefined ? Deno.env.delete(name) : Deno.env.set(name, prior[i]!)
        );
    }
}
function request(apikey: string | null = key, body: unknown = {}, authorization?: string) {
    return new Request("https://function-test.invalid", {
        method: "POST",
        body: JSON.stringify(body),
        headers: {
            "Content-Type": "application/json",
            ...(apikey ? { apikey } : {}),
            ...(authorization ? { Authorization: authorization } : {}),
        },
    });
}

Deno.test("daily auth: missing/wrong/publishable/default keys and user JWT cannot perform global cleanup", async () => {
    await fixture(async (calls) => {
        for (
            const credential of [
                null,
                "sb_secret_invalid",
                "sb_publishable_fake_public_key",
                "sb_secret_fake_other_key",
            ]
        ) {
            assert.equal((await handler(request(credential))).status, 401);
        }
        assert.equal(
            (await handler(
                request(null, {}, "Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyIn0.invalid"),
            )).status,
            401,
        );
        assert.equal(calls.length, 0);
        assert.equal((await handler(request(key, { object_keys: ["forged"] }))).status, 400);
        assert.equal(calls.length, 0);
    });
});
Deno.test("daily endpoint: authenticated status checks read counts without claiming or deleting work", async () => {
    await fixture(async (calls) => {
        const response = await handler(request(key, { action: "status" }));
        assert.equal(response.status, 200);
        const summary = await response.json();
        assert.equal(summary.readOnly, true);
        assert.equal(summary.mode, "status");
        assert.equal(summary.counts.pending, 1);
        assert.equal(calls.length, 1);
        assert(calls[0].path.endsWith("gallery_cleanup_counts"));
        assert.equal((await handler(request(null, { action: "status" }))).status, 401);
        assert.equal((await handler(request(key, { action: "status", image_id: id }))).status, 400);
        assert.equal(calls.length, 1);
    });
});

Deno.test("daily endpoint: R2 objects precede metadata finish, duplicate/missing objects are idempotent", async () => {
    await fixture(async (calls) => {
        for (let repeat = 0; repeat < 2; repeat++) {
            const response = await handler(request());
            assert.equal(response.status, 200);
            const summary = await response.json();
            assert.equal(summary.ok, true);
            assert.equal(summary.remaining, 0);
            if (!repeat) assert.equal(summary.objectsRemoved, 2);
        }
        const firstDelete = calls.findIndex((c) => c.method === "DELETE");
        const firstFinish = calls.findIndex((c) => c.path.endsWith("gallery_cleanup_finish"));
        assert(firstFinish > firstDelete);
        assert(calls.some((c) => c.path.endsWith("thumb.jpg")));
        assert(calls.some((c) => c.path.endsWith("orig.jpg")));
        assert(!calls.some((c) => c.path.includes("avatar")));
    });
    await fixture(async () => {
        const summary = await (await handler(request())).json();
        assert.equal(summary.objectsRemoved, 0);
        assert.equal(summary.completed, 1);
    }, { missing: true });
});
Deno.test("daily endpoint: mixed providers, historical variants, partial failure, independent progress and retry", async () => {
    const oldKeys = imageKeys(space, gallery, oldId);
    const legacy: DeletionReceipt = {
        ...base,
        image_id: oldId,
        storage_provider: "supabase",
        object_keys: Object.values(oldKeys),
    };
    const options: Options = { rows: [base, legacy], failOrigOnce: true };
    await fixture(async (calls) => {
        const failed = await handler(request());
        assert.equal(failed.status, 500);
        const first = await failed.json();
        assert.equal(first.failed, 1);
        assert.equal(first.completed, 1);
        assert.equal(first.remaining, 1);
        assert.equal(first.objectsRemoved, 4); // R2 thumb plus all three historical variants.
        options.nextPages = false;
        options.failOrigOnce = false;
        options.rows = [base];
        // A later invocation can reclaim the failed receipt; SQL enforces its backoff/lease.
        const retry = await handler(request());
        assert.equal(retry.status, 200);
        const second = await retry.json();
        assert.equal(second.completed, 1);
        assert.equal(second.objectsRemoved, 1); // Missing thumb is harmless; orig now succeeds.
        assert(calls.some((c) => c.body.p_success === false && c.body.p_error === "objects"));
    }, options);
});
Deno.test("daily endpoint: Supabase partial failure or metadata failure retains work and returns failure", async () => {
    const legacy: DeletionReceipt = {
        ...base,
        storage_provider: "supabase",
        object_keys: Object.values(imageKeys(space, gallery, id)),
    };
    for (
        const options of [
            { rows: [legacy], storageFailure: true },
            { rows: [legacy], partialSupabase: true },
            { finishFailure: true },
            { networkTimeout: true },
        ]
    ) {
        await fixture(async (calls) => {
            const response = await handler(request());
            assert.equal(response.status, 500);
            const summary = await response.json();
            assert.equal(summary.remaining, 1);
            assert.equal(summary.completed, 0);
            if ("partialSupabase" in options) assert.equal(summary.objectsRemoved, 1);
            assert(calls.some((c) => c.body.p_success === false));
        }, options);
    }
});
Deno.test("daily endpoint: not-yet-eligible rows are skipped and reported as pending, never complete", async () => {
    await fixture(async (calls) => {
        const response = await handler(request());
        assert.equal(response.status, 202);
        const summary = await response.json();
        assert.equal(summary.ok, true);
        assert.equal(summary.complete, false);
        assert.equal(summary.skipped, 1);
        assert.equal(summary.remaining, 1);
        assert.equal(summary.remainingEligible, 0);
        assert(!calls.some((c) => c.method === "DELETE"));
    }, { rows: [], remaining: 1, skipped: 1 });
});

Deno.test("daily endpoint: young/forged receipts fail closed, inventory errors are observable", async () => {
    for (
        const row of [{ ...base, cleanup_after: new Date(Date.now() + 420000).toISOString() }, {
            ...base,
            object_keys: ["avatars/forged.jpg"],
        }]
    ) {
        await fixture(async (calls) => {
            assert.equal((await handler(request())).status, 500);
            assert(!calls.some((c) => c.method === "DELETE"));
        }, { rows: [row] });
    }
    await fixture(async () => {
        const response = await handler(request());
        assert.equal(response.status, 500);
        const summary = await response.json();
        assert.equal(summary.error, "prepare");
        assert.equal(summary.remaining, null);
    }, { dbFailure: "gallery_cleanup_prepare" });
});
Deno.test("daily endpoint: bounded pages and time budget retain backlog for another run", async () => {
    await fixture(async (calls) => {
        const response = await handler(request());
        assert.equal(response.status, 202);
        const summary = await response.json();
        assert.equal(summary.claimed, 100);
        assert.equal(summary.remaining, 120);
        assert.equal(calls.filter((c) => c.path.endsWith("gallery_cleanup_claim")).length, 100);
    }, { nextPages: true, remaining: 120 });
    await fixture(async (calls) => {
        assert.equal((await handler(request())).status, 200);
        assert.equal(calls.filter((c) => c.path.endsWith("gallery_cleanup_claim")).length, 1);
    }, { slow: true });
});
