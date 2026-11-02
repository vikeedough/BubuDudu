import { strict as assert } from "node:assert";
import { database, gallery, image, metadata, op, other, space, user } from "./gallery-test-db.ts";

const migration = await Deno.readTextFile(
    new URL("../migrations/20261101000000_gallery_daily_cleanup.sql", import.meta.url),
);
const token = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const competing = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
async function dailyDB() {
    const db = await database();
    await db.exec(migration);
    return db;
}

Deno.test("daily SQL: compatible backfill preserves existing receipts and queues historical Supabase deletions", async () => {
    const db = await database();
    try {
        await op(db, "initialize", { meta: metadata });
        await op(db, "abort");
        await db.exec(
            `insert into date_images(id,gallery_id,storage_path_thumb,storage_path_grid,storage_path_orig,storage_state)
            values('${other}','${gallery}','thumb','grid','orig','deleting')`,
        );
        await db.exec(migration);
        const { rows } = await db.query<
            { storage_provider: string; object_keys: string[]; cleanup_after: string }
        >(
            "select * from gallery_storage_tombstones order by storage_provider",
        );
        assert.equal(rows.length, 2);
        assert.equal(rows[0].storage_provider, "r2");
        assert.equal(rows[1].storage_provider, "supabase");
        assert.equal(rows[0].object_keys.length, 3); // Original aliases preserved, deduped by storage helper.
        assert.deepEqual(rows[1].object_keys, ["thumb", "grid", "orig"]);
        const { rows: deadlines } = await db.query<{ correct: boolean }>(
            `select t.cleanup_after=d.upload_expires_at+interval '2 minutes' correct
            from gallery_storage_tombstones t join date_images d on d.id=t.image_id where d.id='${image}'`,
        );
        assert.equal(deadlines[0].correct, true);
        assert.equal(
            (await db.query("select * from date_images where storage_state='deleting'")).rows
                .length,
            2,
        );
    } finally {
        await db.close();
    }
});

Deno.test("daily SQL: safety eligibility, atomic receipts, duplicate leases, expired leases and stale-owner rejection", async () => {
    const db = await dailyDB();
    try {
        await op(db, "initialize", { meta: metadata });
        const deadline = (await db.query<{ deadline: string }>(
            "select upload_expires_at::text deadline from date_images",
        )).rows[0].deadline;
        await op(db, "abort");
        await op(db, "abort");
        assert.equal(
            (await db.query<{ deadline: string }>(
                "select upload_expires_at::text deadline from date_images",
            )).rows[0].deadline,
            deadline,
        );
        assert.equal(
            (await db.query<{ c: { skipped: number } }>("select gallery_cleanup_counts() c"))
                .rows[0].c.skipped,
            1,
        );
        assert.equal((await db.query("select * from gallery_storage_tombstones")).rows.length, 1);
        assert.equal(
            (await db.query("select * from gallery_cleanup_claim($1,5)", [token])).rows.length,
            0,
        );
        await db.exec(
            `update date_images set upload_expires_at=now()-interval '3 minutes' where id='${image}';
            update gallery_storage_tombstones set cleanup_after=now()-interval '1 minute';`,
        );
        assert.equal(
            (await db.query("select * from gallery_cleanup_claim($1,5)", [token])).rows.length,
            1,
        );
        assert.equal(
            (await db.query("select * from gallery_cleanup_claim($1,5)", [competing])).rows.length,
            0,
        );
        assert.equal(
            (await db.query<{ result: boolean }>(
                "select gallery_cleanup_finish($1,$2,true) result",
                [image, competing],
            )).rows[0].result,
            false,
        );
        await db.exec(
            "update gallery_storage_tombstones set lease_until=now()-interval '1 second'",
        );
        assert.equal(
            (await db.query("select * from gallery_cleanup_claim($1,5)", [competing])).rows.length,
            1,
        );
        assert.equal(
            (await db.query<{ result: boolean }>(
                "select gallery_cleanup_finish($1,$2,true) result",
                [image, token],
            )).rows[0].result,
            false,
        );
        assert.equal(
            (await db.query<{ result: boolean }>(
                "select gallery_cleanup_finish($1,$2,true) result",
                [image, competing],
            )).rows[0].result,
            true,
        );
        assert.equal((await db.query("select * from date_images")).rows.length, 0);
        assert.equal(
            (await db.query(
                "select * from gallery_storage_tombstones where completed_at is not null",
            )).rows.length,
            1,
        );
        await db.exec("set role authenticated");
        await assert.rejects(
            () => db.query("select * from gallery_cleanup_claim($1,5)", [token]),
            /permission denied/,
        );
        await assert.rejects(
            () => db.query("select gallery_cleanup_counts()"),
            /permission denied/,
        );
        await assert.rejects(
            () => db.query("select * from gallery_storage_tombstones"),
            /permission denied/,
        );
    } finally {
        await db.close();
    }
});

Deno.test("daily SQL: mixed batch receipts, cover replacement, retry fairness and parent-child finalization", async () => {
    const db = await dailyDB();
    try {
        await op(db, "initialize", { meta: metadata });
        await op(db, "finalize");
        const prefix = `spaces/${space}/galleries/${gallery}/images/${other}`;
        await db.exec(
            `insert into date_images(id,gallery_id,storage_path_thumb,storage_path_grid,storage_path_orig)
            values('${other}','${gallery}','${prefix}/thumb.jpg','${prefix}/grid.jpg','${prefix}/orig.jpg');`,
        );
        await op(db, "delete-images", { ids: [image] });
        assert.equal(
            (await db.query<{ p: string }>("select cover_image_thumb_path p from galleries"))
                .rows[0].p,
            prefix + "/thumb.jpg",
        );
        await op(db, "delete-gallery");
        assert.equal((await db.query("select * from gallery_storage_tombstones")).rows.length, 2);
        const claimed = await db.query<{ image_id: string }>(
            "select * from gallery_cleanup_claim($1,5)",
            [token],
        );
        assert.equal(claimed.rows.length, 1); // Only the eligible historical image.
        await db.query("select gallery_cleanup_finish($1,$2,false,'objects')", [other, token]);
        assert.equal((await db.query("select * from date_images")).rows.length, 2);
        assert.equal(
            (await db.query("select * from gallery_cleanup_claim($1,5)", [token])).rows.length,
            0,
        );
        await db.exec(
            `update date_images set upload_expires_at=now()-interval '3 minutes' where id='${image}';
            update gallery_storage_tombstones set cleanup_after=now()-interval '1 minute',next_attempt_at=now()-interval '1 minute';`,
        );
        assert.equal(
            (await db.query("select * from gallery_cleanup_claim($1,5)", [token])).rows.length,
            2,
        );
        await db.query("select gallery_cleanup_finish($1,$2,true)", [other, token]);
        assert.equal((await db.query("select * from galleries")).rows.length, 1);
        await db.query("select gallery_cleanup_finish($1,$2,true)", [image, token]);
        assert.equal((await db.query("select * from galleries")).rows.length, 0);
        assert.equal((await db.query("select * from gallery_storage_tombstones")).rows.length, 2);
        assert.equal(
            (await db.query<{ c: { pending: number } }>("select gallery_cleanup_counts() c"))
                .rows[0].c.pending,
            0,
        );
    } finally {
        await db.close();
    }
});

Deno.test("daily SQL: abandoned uploads wait for original deadline and empty flagged parents finalize", async () => {
    const db = await dailyDB();
    try {
        await op(db, "initialize", { meta: metadata });
        await db.query("select gallery_cleanup_prepare()");
        assert.equal(
            (await db.query<{ s: string }>("select storage_state s from date_images")).rows[0].s,
            "pending",
        );
        await db.exec(`update date_images set upload_expires_at=now()-interval '3 minutes';
            insert into galleries(id,space_id,storage_deleting) values('${other}','${space}',true);`);
        const result = (await db.query<{ r: { abandoned: number; parents: number } }>(
            "select gallery_cleanup_prepare() r",
        )).rows[0].r;
        assert.equal(result.abandoned, 1);
        assert.equal(result.parents, 1);
        assert.equal((await db.query("select * from gallery_storage_tombstones")).rows.length, 1);
    } finally {
        await db.close();
    }
});

Deno.test("daily SQL: service cleanup spans spaces without a remaining mobile member or user JWT", async () => {
    const db = await dailyDB();
    const space2 = "66666666-6666-4666-8666-666666666666";
    const gallery2 = "77777777-7777-4777-8777-777777777777";
    const image2 = "88888888-8888-4888-8888-888888888888";
    try {
        await db.exec(`insert into spaces values('${space2}');
            insert into space_members values('${space2}','${user}');
            insert into galleries(id,space_id) values('${gallery2}','${space2}');`);
        for (const [sid, gid, iid] of [[space, gallery, image], [space2, gallery2, image2]]) {
            const prefix = `spaces/${sid}/galleries/${gid}/images/${iid}`;
            await db.query(
                `insert into date_images(id,gallery_id,storage_path_thumb,storage_path_grid,storage_path_orig)
                values($1,$2,$3,$4,$5)`,
                [iid, gid, prefix + "/thumb.jpg", prefix + "/grid.jpg", prefix + "/orig.jpg"],
            );
            await db.query("select gallery_storage_operation('delete-gallery',$1,$2)", [gid, user]);
        }
        await db.exec("delete from space_members; set role service_role");
        const rows =
            (await db.query<{ image_id: string }>("select * from gallery_cleanup_claim($1,5)", [
                token,
            ])).rows;
        assert.equal(rows.length, 2);
        for (const row of rows) {
            assert.equal(
                (await db.query<{ result: boolean }>(
                    "select gallery_cleanup_finish($1,$2,true) result",
                    [row.image_id, token],
                )).rows[0].result,
                true,
            );
        }
        assert.equal((await db.query("select * from date_images")).rows.length, 0);
        assert.equal((await db.query("select * from galleries")).rows.length, 0);
        assert.equal((await db.query("select * from gallery_storage_tombstones")).rows.length, 2);
    } finally {
        await db.close();
    }
});

Deno.test("daily SQL: retained completed receipts rotate by next attempt without starving later rechecks", async () => {
    const db = await dailyDB();
    try {
        for (const [iid, age] of [[image, 10], [other, 5]] as const) {
            await db.query(
                `insert into gallery_storage_tombstones
                (image_id,gallery_id,space_id,object_keys,completed_at,next_attempt_at)
                values($1,$2,$3,'{}',now()-make_interval(days=>$4),now()-make_interval(days=>$4))`,
                [iid, gallery, space, age],
            );
        }
        const claim = async () =>
            (await db.query<{ image_id: string }>("select * from gallery_cleanup_claim($1,1)", [
                token,
            ])).rows[0].image_id;
        assert.equal(await claim(), image);
        await db.query("select gallery_cleanup_finish($1,$2,true)", [image, token]);
        // Simulate a later daily run: the older receipt is due again, but the unvisited one is older work.
        await db.query(
            "update gallery_storage_tombstones set next_attempt_at=now()-interval '1 hour' where image_id=$1",
            [image],
        );
        assert.equal(await claim(), other);
    } finally {
        await db.close();
    }
});

Deno.test("daily Cron SQL: requires Vault, creates one 19:00 UTC job idempotently, leaves unrelated jobs alone", async () => {
    const db = await database();
    const sql =
        (await Deno.readTextFile(new URL("../setup/gallery-daily-cleanup.sql", import.meta.url)))
            .replace(/^create extension.*;$/gm, ""); // PGlite has no background worker extensions; stub their public SQL APIs.
    try {
        await db.exec(
            `create schema vault; create table vault.decrypted_secrets(name text unique,decrypted_secret text);
            create schema cron; create table cron.job(jobid bigserial primary key,jobname text unique,schedule text,command text,username text default current_user);
            create function cron.schedule(text,text,text) returns bigint language sql as $$
                insert into cron.job(jobname,schedule,command) values($1,$2,$3) on conflict(jobname)
                do update set schedule=excluded.schedule,command=excluded.command returning jobid $$;
            create schema net; create table net.requests(id bigserial,url text,headers jsonb,body jsonb,timeout integer);
            create function net.http_post(url text,headers jsonb,body jsonb,timeout_milliseconds integer) returns bigint language sql as $$
                insert into net.requests(url,headers,body,timeout) values($1,$2,$3,$4) returning id $$;
            select cron.schedule('unrelated-job','* * * * *','select 1');`,
        );
        await assert.rejects(() => db.exec(sql), /Vault secrets/);
        await db.exec("rollback");
        await db.exec(`insert into vault.decrypted_secrets values
            ('gallery_cleanup_project_url','https://hcrezrypvkmtzxldvsvm.supabase.co'),
            ('gallery_cleanup_secret_key','sb_secret_fake_test_key');`);
        await db.exec(sql);
        await db.exec(sql);
        const jobs = (await db.query<{ jobname: string; schedule: string }>(
            "select * from cron.job order by jobname",
        )).rows;
        assert.equal(jobs.length, 2);
        assert.equal(jobs[0].jobname, "bubududu-gallery-daily-cleanup");
        assert.equal(jobs[0].schedule, "0 19 * * *");
        assert.equal(jobs[1].schedule, "* * * * *");
        await db.query("select gallery_daily_cleanup_dispatch()");
        const call = (await db.query<{ url: string; headers: { apikey: string }; body: unknown }>(
            "select * from net.requests",
        )).rows[0];
        assert.equal(
            call.url,
            "https://hcrezrypvkmtzxldvsvm.supabase.co/functions/v1/gallery-daily-cleanup",
        );
        assert.equal(call.headers.apikey, "sb_secret_fake_test_key");
        assert.deepEqual(call.body, {});
        await db.exec(
            "update cron.job set username='other-owner' where jobname='bubududu-gallery-daily-cleanup'",
        );
        await assert.rejects(() => db.exec(sql), /owner differs/);
        await db.exec("rollback");
        await db.exec("set role authenticated");
        await assert.rejects(
            () => db.query("select gallery_daily_cleanup_dispatch()"),
            /permission denied/,
        );
    } finally {
        await db.close();
    }
});
