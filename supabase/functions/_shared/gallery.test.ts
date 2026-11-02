import { strict as assert } from "node:assert";
import { handler as upload } from "../gallery-upload/handler.ts";
import { handler as sign } from "../sign-gallery-urls/handler.ts";
import { handler as cover } from "../sign-gallery-cover-urls/handler.ts";
import { handler as remove } from "../delete-gallery-images/handler.ts";
import { handler as removeGallery } from "../delete-gallery/handler.ts";
import { imageKeys, type ImageRow, validateMetadata } from "./gallery-model.ts";

const user = "11111111-1111-4111-8111-111111111111";
const space = "22222222-2222-4222-8222-222222222222";
const gallery = "33333333-3333-4333-8333-333333333333";
const id = "44444444-4444-4444-8444-444444444444";
const keys = imageKeys(space, gallery, id);
const metadata = {
    thumb: { width: 100, height: 80, bytes: 10 },
    orig: { width: 200, height: 160, bytes: 20 },
    blur_hash: "hash",
};
const base: ImageRow = {
    id,
    gallery_id: gallery,
    storage_provider: "r2",
    storage_state: "pending",
    storage_revision: 0,
    upload_expires_at: new Date(Date.now() - 600000).toISOString(),
    upload_metadata: metadata,
    storage_path_thumb: keys.thumb,
    storage_path_grid: keys.orig,
    storage_path_orig: keys.orig,
};
type Options = {
    invalid?: boolean;
    member?: boolean;
    row?: ImageRow;
    rows?: ImageRow[];
    failHead?: boolean;
    failDelete?: boolean;
    galleryGone?: boolean;
    markFails?: boolean;
    galleryDeleting?: boolean;
    emptyImages?: boolean;
    finishFails?: boolean;
    failReceipts?: boolean;
    failOrigOnce?: boolean;
    receipts?: { image_id: string; gallery_id: string; object_keys: string[] }[];
};
async function fixture(
    test: (calls: { url: URL; method: string; body: Record<string, unknown> }[]) => Promise<void>,
    options: Options = {},
) {
    const fetchOriginal = globalThis.fetch;
    const names = [
        "SUPABASE_URL",
        "SUPABASE_SERVICE_ROLE_KEY",
        "R2_ACCOUNT_ID",
        "R2_BUCKET_NAME",
        "R2_ACCESS_KEY_ID",
        "R2_SECRET_ACCESS_KEY",
    ];
    const originalEnv = names.map((name) => Deno.env.get(name));
    [
        "https://gallery-test.invalid",
        "test-service-key",
        "a".repeat(32),
        "gallery-test",
        "test-access",
        "test-secret",
    ].forEach((v, i) => Deno.env.set(names[i], v));
    let origFailed = false;
    const removedKeys = new Set<string>();
    const calls: { url: URL; method: string; body: Record<string, unknown> }[] = [];
    globalThis.fetch = async (input, init) => {
        const request = new Request(input, init);
        const url = new URL(request.url);
        let body: Record<string, unknown> = {};
        if (
            ["POST", "DELETE", "PATCH"].includes(request.method) &&
            request.headers.get("content-type")?.includes("json")
        ) {
            body = await request.json();
        }
        calls.push({ url, method: request.method, body });
        const json = (value: unknown, status = 200) => Response.json(value, { status });
        if (url.pathname === "/auth/v1/user") {
            return options.invalid ? json({ error: "invalid" }, 401) : json({ id: user });
        }
        if (url.pathname === "/rest/v1/galleries") {
            const entry = {
                id: gallery,
                space_id: space,
                storage_deleting: options.galleryDeleting ?? false,
                cover_image_path: keys.orig,
                cover_image_thumb_path: keys.thumb,
            };
            if (request.headers.get("accept")?.includes("object")) return json(entry);
            if (url.searchParams.has("storage_deleting") && !options.galleryDeleting) {
                return json([]);
            }
            return json([entry]);
        }
        if (url.pathname === "/rest/v1/space_members") {
            const entry = { user_id: user, space_id: space };
            return json(
                request.headers.get("accept")?.includes("object")
                    ? (options.member === false ? null : entry)
                    : (options.member === false ? [] : [entry]),
            );
        }
        if (url.pathname === "/rest/v1/gallery_storage_tombstones") {
            return options.failReceipts
                ? json({ message: "receipt lookup unavailable" }, 503)
                : json(request.method === "PATCH" ? null : (options.receipts ?? []));
        }
        if (url.pathname === "/rest/v1/date_images") {
            const row = options.row ?? base;
            return json(
                request.headers.get("accept")?.includes("object")
                    ? row
                    : (options.emptyImages ? [] : (options.rows ?? [row])),
            );
        }
        if (url.pathname === "/rest/v1/rpc/gallery_storage_operation") {
            const row = options.row ?? base;
            if (body.p_action === "delete-gallery" && options.galleryGone) return json(null);
            if (["delete-images", "delete-gallery", "abort"].includes(String(body.p_action))) {
                if (options.markFails) {
                    return json({ code: "42501", message: "Membership rejected" }, 403);
                }
                return json({
                    space_id: space,
                    images: options.emptyImages ? [] : (options.rows ?? [row]),
                });
            }
            if (body.p_action === "finish-gallery" && options.finishFails) {
                return json({ code: "40001", message: "Retry transaction" }, 409);
            }
            if (body.p_action === "initialize") {
                return json({
                    ...row,
                    upload_expires_at: new Date(Date.now() + 300000).toISOString(),
                });
            }
            if (body.p_action === "finalize") return json({ ...row, storage_state: "ready" });
            return json({});
        }
        if (url.pathname.startsWith("/storage/v1/object/sign/")) {
            return json({ signedURL: "/object/sign/test" });
        }
        if (url.pathname === "/storage/v1/object/gallery-private" && request.method === "DELETE") {
            return options.failDelete ? json({ error: "failure" }, 500) : json([]);
        }
        if (url.host.endsWith("r2.cloudflarestorage.com")) {
            if (request.method === "HEAD") {
                return new Response(null, {
                    status: options.failHead ? 404 : 200,
                    headers: {
                        "content-length": url.pathname.endsWith("thumb.jpg") ? "10" : "20",
                        "content-type": "image/jpeg",
                    },
                });
            }
            if (request.method === "DELETE") {
                if (options.failDelete) return new Response(null, { status: 403 });
                if (options.failOrigOnce && !origFailed && url.pathname.endsWith("orig.jpg")) {
                    origFailed = true;
                    return new Response(null, { status: 403 });
                }
                const status = removedKeys.has(url.pathname) ? 404 : 204;
                removedKeys.add(url.pathname);
                return new Response(null, { status });
            }
        }
        throw new Error(`Unexpected test request ${request.method} ${url.pathname}`);
    };
    try {
        await test(calls);
    } finally {
        globalThis.fetch = fetchOriginal;
        names.forEach((name, i) =>
            originalEnv[i] === undefined
                ? Deno.env.delete(name)
                : Deno.env.set(name, originalEnv[i]!)
        );
    }
}
const request = (body: unknown, token = "test-user-jwt") =>
    new Request("https://function-test.invalid", {
        method: "POST",
        headers: {
            "content-type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
    });
Deno.test("gallery endpoints require a valid JWT and membership before signing", async () => {
    await fixture(async (calls) => {
        assert.equal((await sign(request({ galleryId: gallery, imageIds: [id] }, ""))).status, 401);
        assert.equal(calls.length, 0);
    });
    await fixture(
        async () =>
            assert.equal((await sign(request({ galleryId: gallery, imageIds: [id] }))).status, 401),
        { invalid: true },
    );
    await fixture(async (calls) => {
        assert.equal((await sign(request({ galleryId: gallery, imageIds: [id] }))).status, 403);
        assert(!calls.some((c) => c.url.host.includes("r2")));
    }, { member: false });
});
Deno.test("initialize issues only two canonical PUT URLs, binds JPEG, stores pending metadata", async () => {
    await fixture(async (calls) => {
        const response = await upload(
            request({
                action: "initialize",
                galleryId: gallery,
                imageId: id,
                metadata,
                paths: ["forged"],
            }),
        );
        assert.equal(response.status, 200);
        const body = await response.json();
        assert.deepEqual(Object.keys(body.uploads), ["thumb", "orig"]);
        const url = new URL(body.uploads.thumb);
        assert(url.pathname.endsWith(keys.thumb));
        assert(url.searchParams.get("X-Amz-SignedHeaders")?.includes("content-type"));
        assert(Number(url.searchParams.get("X-Amz-Expires")) <= 300);
        assert(calls.some((c) => c.body.p_action === "initialize"));
    });
});
Deno.test("missing R2 configuration fails before creating pending rows", async () => {
    await fixture(async (calls) => {
        Deno.env.delete("R2_SECRET_ACCESS_KEY");
        const response = await upload(
            request({ action: "initialize", galleryId: gallery, imageId: id, metadata }),
        );
        assert.equal(response.status, 500);
        assert((await response.json()).error.includes("R2_SECRET_ACCESS_KEY"));
        assert(!calls.some((c) => c.body.p_action === "initialize"));
    });
});
Deno.test("finalize verifies both objects; missing variant never finalizes", async () => {
    await fixture(async (calls) => {
        assert.equal(
            (await upload(request({ action: "finalize", galleryId: gallery, imageId: id }))).status,
            200,
        );
        assert.equal(calls.filter((c) => c.method === "HEAD").length, 2);
        assert(calls.some((c) => c.body.p_action === "finalize"));
    });
    await fixture(async (calls) => {
        assert.notEqual(
            (await upload(request({ action: "finalize", galleryId: gallery, imageId: id }))).status,
            200,
        );
        assert(!calls.some((c) => c.body.p_action === "finalize"));
    }, { failHead: true });
});
Deno.test("reads support R2 aliases, Supabase variants, pending visibility and authorized covers", async () => {
    await fixture(async () => {
        const body = await (await sign(request({ galleryId: gallery, imageIds: [id] }))).json();
        assert.equal(body[id].url_grid, body[id].url_orig);
        assert.equal(body[id].cache_scope, `${user}/${space}`);
        assert(body[id].urls_expires_at);
        assert((await (await cover(request({ paths: [keys.thumb] }))).json())[keys.thumb]);
    }, { row: { ...base, storage_state: "ready" } });
    await fixture(async () => {
        const body = await (await sign(request({ galleryId: gallery, imageIds: [id] }))).json();
        assert(body[id].url_orig.includes("storage/v1"));
    }, {
        row: {
            ...base,
            storage_state: "ready",
            storage_provider: "supabase",
            storage_path_grid: keys.grid,
        },
    });
    await fixture(async () =>
        assert.deepEqual(
            await (await sign(request({ galleryId: gallery, imageIds: [id] }))).json(),
            {},
        )
    );
});
Deno.test("forged keys fail closed; invalid metadata rejected", async () => {
    assert.throws(() => validateMetadata({ ...metadata, orig: { ...metadata.orig, width: 9000 } }));
    await fixture(
        async () =>
            assert.notEqual(
                (await sign(request({ galleryId: gallery, imageIds: [id] }))).status,
                200,
            ),
        {
            row: { ...base, storage_state: "ready", storage_path_orig: "spaces/forged/orig.jpg" },
        },
    );
});
Deno.test("single, batch, gallery and abort requests only queue, including old/missing storage", async () => {
    for (
        const row of [base, {
            ...base,
            storage_provider: "supabase" as const,
            upload_expires_at: null,
        }]
    ) {
        await fixture(async (calls) => {
            for (let repeat = 0; repeat < 2; repeat++) {
                const response = await remove(request({ galleryId: gallery, imageIds: [id] }));
                assert.equal(response.status, 202);
                assert.equal((await response.json()).deferred, true);
            }
            assert.equal((await removeGallery(request({ galleryId: gallery }))).status, 202);
            assert.equal(
                (await upload(request({ action: "abort", galleryId: gallery, imageId: id })))
                    .status,
                202,
            );
            assert(
                !calls.some((c) =>
                    c.method === "DELETE" || String(c.body.p_action).startsWith("finish-")
                ),
            );
            assert(!calls.some((c) => c.url.host.includes("r2.cloudflarestorage")));
        }, { row, failDelete: true });
    }
    await fixture(
        async () =>
            assert.equal((await removeGallery(request({ galleryId: gallery }))).status, 200),
        { galleryGone: true },
    );
});
Deno.test("mixed-provider signing preserves historical grid and validates request identifiers", async () => {
    const oldId = "55555555-5555-4555-8555-555555555555";
    const oldKeys = imageKeys(space, gallery, oldId);
    await fixture(async () => {
        const response = await sign(request({ galleryId: gallery, imageIds: [id, oldId] }));
        assert.equal(response.status, 200);
        const body = await response.json();
        assert(body[id].url_orig.includes("r2.cloudflarestorage.com"));
        assert(body[oldId].url_grid.includes("storage/v1"));
        assert.equal((await sign(request({ galleryId: "forged", imageIds: [id] }))).status, 400);
        assert.equal(
            (await remove(request({ galleryId: gallery, imageIds: ["forged"] }))).status,
            400,
        );
    }, {
        rows: [
            { ...base, storage_state: "ready" },
            {
                ...base,
                id: oldId,
                storage_state: "ready",
                storage_provider: "supabase",
                storage_path_thumb: oldKeys.thumb,
                storage_path_grid: oldKeys.grid,
                storage_path_orig: oldKeys.orig,
            },
        ],
    });
});
Deno.test("incomplete optional variants can fall back without signing arbitrary keys", async () => {
    await fixture(async () => {
        const response = await sign(request({ galleryId: gallery, imageIds: [id] }));
        assert.equal(response.status, 200);
        const body = await response.json();
        assert(body[id].url_thumb);
        assert.equal(body[id].url_grid, undefined);
    }, {
        row: {
            ...base,
            storage_state: "ready",
            storage_provider: "supabase",
            storage_path_grid: null,
        },
    });
});

Deno.test("rejected marking stays an error and old app cleanup is a non-mutating compatibility call", async () => {
    await fixture(async (calls) => {
        assert.equal((await remove(request({ galleryId: gallery, imageIds: [id] }))).status, 403);
        assert(!calls.some((c) => c.method === "DELETE"));
    }, { markFails: true });
    await fixture(async (calls) => {
        assert.equal(
            (await upload(request({ action: "cleanup", object_keys: ["forged"] }))).status,
            200,
        );
        assert.equal(calls.length, 1); // Auth only; no global user-triggered cleanup.
        assert.equal(calls[0].url.pathname, "/auth/v1/user");
    });
});
Deno.test("mixed batch acceptance retains all IDs and never touches either storage provider", async () => {
    const legacy = {
        ...base,
        id: "55555555-5555-4555-8555-555555555555",
        storage_provider: "supabase" as const,
    };
    await fixture(async (calls) => {
        const response = await remove(request({ galleryId: gallery, imageIds: [id, legacy.id] }));
        assert.equal(response.status, 202);
        assert.equal((await response.json()).remaining, 2);
        assert(!calls.some((c) => c.method === "DELETE"));
        assert(calls.some((c) => c.body.p_action === "delete-images"));
    }, { rows: [base, legacy] });
});
