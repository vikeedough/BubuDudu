import { strict as assert } from "node:assert";
import { database, gallery, image, metadata, op, other, space, user } from "./gallery-test-db.ts";

Deno.test("SQL: pending hidden, provider protected, finalize idempotent, cover valid", async () => {
    const db = await database();
    try {
        await assert.rejects(
            () => op(db, "initialize", { member: other, meta: metadata }),
            /membership/,
        );
        const pending = await op(db, "initialize", { meta: metadata });
        assert.equal(pending.storage_state, "pending");
        assert.equal(pending.storage_path_grid, pending.storage_path_orig);
        assert.equal(pending.bytes_total, 30);
        assert.deepEqual(await op(db, "initialize", { meta: metadata }), pending);
        await db.exec("set role authenticated");
        assert.equal((await db.query("select * from date_images")).rows.length, 0);
        await db.exec(`update date_images set storage_state='ready' where id='${image}'`); // hidden row cannot be targeted
        await assert.rejects(() => op(db, "finalize"), /permission denied/);
        await assert.rejects(() => db.exec(`delete from galleries where id='${gallery}'`));
        await db.exec("reset role");
        const ready = await op(db, "finalize");
        assert.equal(ready.storage_state, "ready");
        assert.deepEqual(await op(db, "finalize"), ready);
        await assert.rejects(() => op(db, "abort"), /Completed upload/);
        await db.exec("set role authenticated");
        assert.equal((await db.query("select * from date_images")).rows.length, 1);
        await assert.rejects(() =>
            db.exec(`update date_images set storage_provider='supabase' where id='${image}'`)
        );
        await assert.rejects(() => db.exec(`delete from date_images where id='${image}'`));
        await assert.rejects(() => db.exec(`delete from spaces where id='${space}'`));
    } finally {
        await db.close();
    }
});
Deno.test("SQL: abort/delete preserve manifest, wait for PUT expiry, reject finalize and gallery races", async () => {
    const db = await database();
    try {
        await op(db, "initialize", { meta: metadata });
        await op(db, "abort");
        assert.equal((await op(db, "abort")).space_id, space);
        await assert.rejects(() => op(db, "finalize"), /aborted/);
        await assert.rejects(() => op(db, "finish-images", { ids: [image] }), /drained/);
        await op(db, "delete-gallery");
        await assert.rejects(() => op(db, "initialize", { id: other, meta: metadata }), /deletion/);
        await assert.rejects(() => op(db, "finish-gallery"), /incomplete/);
        await db.exec(
            `update date_images set upload_expires_at=now()-interval '10 minutes' where id='${image}'`,
        );
        await op(db, "finish-images", { ids: [image] });
        await op(db, "finish-images", { ids: [image] });
        await op(db, "finish-gallery");
        assert.equal((await db.query("select * from gallery_storage_tombstones")).rows.length, 1);
        assert.equal(await op(db, "delete-gallery"), null);
    } finally {
        await db.close();
    }
});
Deno.test("SQL: mixed deletion replaces cover; migration compares snapshot and old clients cannot forge R2", async () => {
    const db = await database();
    try {
        const base = `spaces/${space}/galleries/${gallery}/images/${other}`;
        await db.exec(
            `insert into date_images(id,gallery_id,storage_path_thumb,storage_path_grid,storage_path_orig)
            values('${other}','${gallery}','${base}/thumb.jpg','${base}/grid.jpg','${base}/orig.jpg')`,
        );
        const snapshot = (await db.query<{ snapshot: unknown }>(
            "select to_jsonb(i) snapshot from date_images i where id=$1",
            [other],
        )).rows[0].snapshot;
        await db.exec(`update date_images set blur_hash='changed' where id='${other}'`);
        await assert.rejects(() => op(db, "migrate", { id: other, snapshot }), /changed/);
        const latest = (await db.query<{ snapshot: unknown }>(
            "select to_jsonb(i) snapshot from date_images i where id=$1",
            [other],
        )).rows[0].snapshot;
        assert.equal(
            (await op(db, "migrate", { id: other, snapshot: latest })).storage_provider,
            "r2",
        );
        await op(db, "initialize", { meta: metadata });
        await op(db, "finalize");
        await op(db, "delete-images", { ids: [image] });
        const cover = (await db.query<{ cover_image_thumb_path: string }>(
            "select cover_image_thumb_path from galleries",
        )).rows[0].cover_image_thumb_path;
        assert.equal(cover, `${base}/thumb.jpg`);
        await db.exec("set role authenticated");
        await assert.rejects(() =>
            db.exec(
                `insert into date_images(id,gallery_id,storage_provider) values('${user}','${gallery}','r2')`,
            )
        );
    } finally {
        await db.close();
    }
});

Deno.test("SQL: cross-gallery deletes and pending covers are rejected; legacy Supabase inserts remain valid", async () => {
    const db = await database();
    try {
        await op(db, "initialize", { meta: metadata });
        const pending = (await db.query<{ storage_path_thumb: string; storage_path_grid: string }>(
            "select * from date_images",
        )).rows[0];
        await assert.rejects(
            () =>
                db.query(
                    "update galleries set cover_image_path=$1,cover_image_thumb_path=$2 where id=$3",
                    [pending.storage_path_grid, pending.storage_path_thumb, gallery],
                ),
            /completed image/,
        );
        await db.exec(`insert into galleries(id,space_id) values('${other}','${space}');
            insert into date_images(id,gallery_id) values('${user}','${other}');`);
        await assert.rejects(() => op(db, "delete-images", { ids: [user] }), /another gallery/);
        await op(db, "delete-gallery");
        await db.exec("set role authenticated");
        await assert.rejects(
            () => db.exec(`insert into date_images(id,gallery_id) values('${space}','${gallery}')`),
            /deletion/,
        );
        await db.exec(`insert into date_images(id,gallery_id) values('${space}','${other}')`);
        const rows = await db.query<{ storage_provider: string }>(
            `select storage_provider from date_images where id='${space}'`,
        );
        assert.equal(rows.rows[0].storage_provider, "supabase");
        await assert.rejects(
            () => db.exec(`select * from gallery_storage_tombstones`),
            /permission denied/,
        );
    } finally {
        await db.close();
    }
});
