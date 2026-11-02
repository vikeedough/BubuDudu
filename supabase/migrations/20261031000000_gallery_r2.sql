-- Additive: existing rows and old-client inserts remain Supabase/ready.
begin;
alter table public.date_images
    add column storage_provider text not null default 'supabase' check (storage_provider in ('supabase','r2')),
    add column storage_state text not null default 'ready' check (storage_state in ('pending','ready','deleting')),
    add column storage_revision bigint not null default 0,
    add column upload_expires_at timestamptz,
    add column upload_metadata jsonb;
alter table public.galleries add column storage_deleting boolean not null default false;

-- Small cleanup receipts survive gallery cascades and unusually late in-flight PUTs.
-- No FK: deleting a gallery must not erase its last object-cleanup evidence.
create table public.gallery_storage_tombstones (
    image_id uuid primary key, gallery_id uuid not null, space_id uuid not null,
    object_keys text[] not null, checked_at timestamptz not null default now()
);
alter table public.gallery_storage_tombstones enable row level security;
revoke all on public.gallery_storage_tombstones from public,anon,authenticated;
grant all on public.gallery_storage_tombstones to service_role;

-- Restrictive policies compose with the existing membership policies (never replace them).
create policy gallery_ready_images on public.date_images as restrictive for select to anon, authenticated
    using (storage_state = 'ready');

-- Column protection must be enforced independently of permissive membership RLS.
create function public.guard_gallery_storage() returns trigger language plpgsql security definer set search_path = public as $$
-- Inspect the original SET ROLE, not current_user (this trigger runs as its owner).
-- Definer visibility is required to see pending children, including FK cascades.
declare trusted boolean := coalesce(nullif(current_setting('role',true),'none'),session_user)
    in ('postgres','service_role','supabase_admin');
begin
    if tg_table_name = 'date_images' then
        if tg_op <> 'DELETE' then
            perform 1 from public.galleries where id = new.gallery_id for update;
            if not trusted and exists(select 1 from public.galleries where id=new.gallery_id and storage_deleting) then
                raise exception 'Gallery deletion is in progress' using errcode='42501';
            end if;
            if not trusted and (new.storage_provider <> 'supabase' or new.storage_state <> 'ready'
                or new.upload_expires_at is not null or new.upload_metadata is not null) then
                raise exception 'Gallery storage state is server-managed' using errcode = '42501';
            end if;
        end if;
        if tg_op <> 'INSERT' and not trusted and
            (old.storage_provider = 'r2' or old.storage_state <> 'ready') then
            raise exception 'Use the gallery storage endpoint' using errcode = '42501';
        end if;
        if tg_op = 'UPDATE' then
            if not trusted and new.storage_revision <> old.storage_revision then
                raise exception 'Gallery revision is server-managed' using errcode = '42501';
            end if;
            new.storage_revision := old.storage_revision + 1;
        elsif tg_op = 'INSERT' then new.storage_revision := 0;
        end if;
    else
        if not trusted then
            if tg_op = 'DELETE' then
                if old.storage_deleting or exists (select 1 from public.date_images where gallery_id = old.id
                    and (storage_provider = 'r2' or storage_state <> 'ready')) then
                    raise exception 'Use the gallery deletion endpoint' using errcode = '42501';
                end if;
            else
                if new.storage_deleting or (tg_op = 'UPDATE' and old.storage_deleting) then
                    raise exception 'Gallery deletion is server-managed' using errcode = '42501';
                end if;
                if tg_op = 'UPDATE' and new.space_id <> old.space_id then
                    raise exception 'Cannot move a gallery between spaces' using errcode = '42501';
                end if;
            end if;
        end if;
        if tg_op <> 'DELETE' and (tg_op = 'INSERT' or new.cover_image_path is distinct from old.cover_image_path
            or new.cover_image_thumb_path is distinct from old.cover_image_thumb_path)
            and (new.cover_image_path is not null or new.cover_image_thumb_path is not null) then
            if not exists (select 1 from public.date_images i where i.gallery_id = new.id
                and i.storage_state = 'ready' and i.storage_path_grid = new.cover_image_path
                and i.storage_path_thumb = new.cover_image_thumb_path) then
                raise exception 'Cover must reference a completed image in this gallery';
            end if;
        end if;
    end if;
    if tg_op = 'DELETE' then return old; else return new; end if;
end $$;
create trigger guard_gallery_image_storage before insert or update or delete on public.date_images
    for each row execute function public.guard_gallery_storage();
create trigger guard_gallery_storage before insert or update or delete on public.galleries
    for each row execute function public.guard_gallery_storage();

-- Only service_role may call this RPC. Edge Functions pass a verified Auth user ID.
-- All lifecycle transitions lock the parent gallery, serializing upload/delete/migration.
create function public.gallery_storage_operation(
    p_action text, p_gallery uuid, p_user uuid, p_image uuid default null,
    p_ids uuid[] default null, p_metadata jsonb default null, p_snapshot jsonb default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare g public.galleries; i public.date_images; c public.date_images; base text; result jsonb;
begin
    select * into g from public.galleries where id = p_gallery for update;
    if not found then
        if p_action in ('delete-gallery','finish-gallery') then return null; end if;
        raise exception 'Gallery not found';
    end if;
    if not exists (select 1 from public.space_members where space_id = g.space_id and user_id = p_user) then
        raise exception 'Gallery membership required' using errcode = '42501';
    end if;
    if p_action = 'initialize' then
        if g.storage_deleting then raise exception 'Gallery deletion is in progress'; end if;
        if exists(select 1 from public.gallery_storage_tombstones where image_id=p_image) then
            raise exception 'Upload identity was deleted; use a new image ID';
        end if;
        select * into i from public.date_images where id = p_image;
        if found then
            if i.gallery_id <> p_gallery or i.storage_provider <> 'r2' or i.upload_metadata is distinct from p_metadata then
                raise exception 'Upload identity conflict';
            end if;
            if i.storage_state = 'deleting' then raise exception 'Upload was aborted'; end if;
            return to_jsonb(i);
        end if;
        base := format('spaces/%s/galleries/%s/images/%s',g.space_id,g.id,p_image);
        insert into public.date_images(id,gallery_id,storage_provider,storage_state,upload_expires_at,upload_metadata,
            storage_path_thumb,storage_path_grid,storage_path_orig,
            width_thumb,height_thumb,width_grid,height_grid,width_orig,height_orig,
            bytes_thumb,bytes_grid,bytes_orig,blur_hash)
        values(p_image,g.id,'r2','pending',clock_timestamp()+interval '5 minutes',p_metadata,
            base||'/thumb.jpg',base||'/orig.jpg',base||'/orig.jpg',
            (p_metadata#>>'{thumb,width}')::int,(p_metadata#>>'{thumb,height}')::int,
            (p_metadata#>>'{orig,width}')::int,(p_metadata#>>'{orig,height}')::int,
            (p_metadata#>>'{orig,width}')::int,(p_metadata#>>'{orig,height}')::int,
            (p_metadata#>>'{thumb,bytes}')::bigint,0,(p_metadata#>>'{orig,bytes}')::bigint,p_metadata->>'blur_hash') returning * into i;
        return to_jsonb(i);
    elsif p_action = 'finalize' then
        if g.storage_deleting then raise exception 'Gallery deletion is in progress'; end if;
        select * into i from public.date_images where id = p_image and gallery_id = p_gallery for update;
        if not found or i.storage_provider <> 'r2' or i.storage_state = 'deleting' then raise exception 'Upload not found or aborted'; end if;
        if i.storage_state = 'pending' then
            if i.upload_expires_at + interval '2 minutes' < clock_timestamp() then raise exception 'Upload expired; abort and retry'; end if;
            update public.date_images set storage_state = 'ready' where id = i.id returning * into i;
        end if;
        if g.cover_image_path is null then
            update public.galleries set cover_image_path=i.storage_path_grid,cover_image_thumb_path=i.storage_path_thumb,
                cover_image_blur_hash=i.blur_hash where id=g.id;
        end if;
        return to_jsonb(i);
    elsif p_action in ('abort','delete-images','delete-gallery') then
        if p_action = 'abort' and exists (select 1 from public.date_images where id = p_image
            and gallery_id = g.id and storage_state = 'ready') then raise exception 'Completed upload cannot be aborted'; end if;
        if p_action = 'delete-gallery' then
            update public.galleries set storage_deleting=true where id=g.id;
        elsif p_action = 'delete-images' and exists (select 1 from public.date_images where id = any(p_ids) and gallery_id <> g.id) then
            raise exception 'Image belongs to another gallery' using errcode='42501';
        end if;
        update public.date_images set storage_state='deleting' where gallery_id=g.id and storage_state <> 'deleting'
            and (p_action='delete-gallery' or (p_action='abort' and id=p_image) or (p_action='delete-images' and id=any(p_ids)));
        insert into public.gallery_storage_tombstones(image_id,gallery_id,space_id,object_keys)
            select id,gallery_id,g.space_id,array[storage_path_thumb,storage_path_grid,storage_path_orig]
            from public.date_images where gallery_id=g.id and storage_state='deleting' and storage_provider='r2'
            and upload_expires_at is not null
            on conflict(image_id) do nothing;
        select * into c from public.date_images where gallery_id=g.id and storage_state='ready'
            order by created_at desc,id desc limit 1;
        -- Keep a valid current cover; otherwise pick a completed replacement or clear it.
        if not exists (select 1 from public.date_images where gallery_id=g.id and storage_state='ready'
            and storage_path_grid=g.cover_image_path and storage_path_thumb=g.cover_image_thumb_path) then
            update public.galleries set cover_image_path=c.storage_path_grid,cover_image_thumb_path=c.storage_path_thumb,
                cover_image_blur_hash=c.blur_hash where id=g.id;
        end if;
        select coalesce(jsonb_agg(to_jsonb(d)),'[]'::jsonb) into result from public.date_images d where gallery_id=g.id
            and storage_state='deleting' and (p_action='delete-gallery' or (p_action='abort' and id=p_image)
                or (p_action='delete-images' and id=any(p_ids)));
        return jsonb_build_object('space_id',g.space_id,'images',result);
    elsif p_action = 'finish-images' then
        -- Delay removal while a previously issued PUT could still recreate an object.
        if exists(select 1 from public.date_images where gallery_id=g.id and id=any(p_ids)
            and (storage_state <> 'deleting' or upload_expires_at + interval '2 minutes' > clock_timestamp())) then
            raise exception 'Upload URLs have not drained; retry cleanup later';
        end if;
        delete from public.date_images where gallery_id=g.id and id=any(p_ids) and storage_state='deleting';
        return '{}'::jsonb;
    elsif p_action = 'finish-gallery' then
        if not g.storage_deleting or exists(select 1 from public.date_images where gallery_id=g.id) then
            raise exception 'Gallery object cleanup is incomplete';
        end if;
        delete from public.galleries where id=g.id;
        return '{}'::jsonb;
    elsif p_action = 'migrate' then
        if g.storage_deleting then raise exception 'Gallery deletion is in progress'; end if;
        select * into i from public.date_images where id=p_image and gallery_id=g.id for update;
        if not found or to_jsonb(i) is distinct from p_snapshot or i.storage_provider <> 'supabase' or i.storage_state <> 'ready' then
            raise exception 'Image changed during migration; re-inventory before retrying';
        end if;
        update public.date_images set storage_provider='r2' where id=i.id returning * into i;
        return to_jsonb(i);
    end if;
    raise exception 'Unknown gallery storage operation';
end $$;
revoke all on function public.gallery_storage_operation(text,uuid,uuid,uuid,uuid[],jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.gallery_storage_operation(text,uuid,uuid,uuid,uuid[],jsonb,jsonb) to service_role;
revoke all on function public.guard_gallery_storage() from public,anon,authenticated;
commit;
