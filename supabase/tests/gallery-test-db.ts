// Pinned server/test dependency; intentionally kept out of the Expo dependency graph.
// Embedded PostgreSQL: validates actual migration SQL without Docker or a live project.
// deno-lint-ignore no-import-prefix
import { PGlite } from "npm:@electric-sql/pglite@0.3.14";

export const user = "11111111-1111-4111-8111-111111111111";
export const other = "22222222-2222-4222-8222-222222222222";
export const space = "33333333-3333-4333-8333-333333333333";
export const gallery = "44444444-4444-4444-8444-444444444444";
export const image = "55555555-5555-4555-8555-555555555555";
export const metadata = {
    thumb: { width: 100, height: 80, bytes: 10 },
    orig: { width: 200, height: 160, bytes: 20 },
    blur_hash: "hash",
};
export async function database() {
    const db = new PGlite();
    await db.exec(`
        create role anon; create role authenticated; create role service_role bypassrls;
        create table spaces(id uuid primary key);
        create table space_members(space_id uuid references spaces,user_id uuid);
        create table galleries(id uuid primary key,space_id uuid references spaces on delete cascade,
            cover_image_path text,cover_image_thumb_path text,cover_image_blur_hash text);
        create table date_images(id uuid primary key,gallery_id uuid references galleries on delete cascade,
            storage_path_thumb text,storage_path_grid text,storage_path_orig text,blur_hash text,
            width_thumb int,height_thumb int,width_grid int,height_grid int,width_orig int,height_orig int,
            bytes_thumb bigint,bytes_grid bigint,bytes_orig bigint,
            bytes_total bigint generated always as (coalesce(bytes_thumb,0)+coalesce(bytes_grid,0)+coalesce(bytes_orig,0)) stored,
            created_at timestamptz default now());
        alter table date_images enable row level security;
        create policy members on date_images for all to authenticated using(true) with check(true);
        grant usage on schema public to authenticated,service_role;
        grant select,insert,update,delete on all tables in schema public to authenticated,service_role;
        insert into spaces values('${space}');
        insert into space_members values('${space}','${user}');
        insert into galleries(id,space_id) values('${gallery}','${space}');
    `);
    await db.exec(
        await Deno.readTextFile(
            new URL("../migrations/20261031000000_gallery_r2.sql", import.meta.url),
        ),
    );
    return db;
}
export async function op(
    db: PGlite,
    action: string,
    args: { id?: string; ids?: string[]; member?: string; meta?: unknown; snapshot?: unknown } = {},
) {
    const result = await db.query<{ result: Record<string, unknown> }>(
        "select gallery_storage_operation($1,$2,$3,$4,$5,$6,$7) result",
        [
            action,
            gallery,
            args.member ?? user,
            args.id ?? image,
            args.ids ?? null,
            args.meta ? JSON.stringify(args.meta) : null,
            args.snapshot ? JSON.stringify(args.snapshot) : null,
        ],
    );
    return result.rows[0].result;
}
