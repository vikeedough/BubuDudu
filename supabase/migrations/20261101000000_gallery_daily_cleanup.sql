-- Extend the existing receipts; do not create another queue or activate Cron here.
begin;
alter table public.gallery_storage_tombstones
    add column storage_provider text not null default 'r2' check (storage_provider in ('r2','supabase')),
    add column cleanup_after timestamptz not null default now(),
    add column next_attempt_at timestamptz not null default now(),
    add column completed_at timestamptz,
    add column lease_token uuid,
    add column lease_until timestamptz,
    add column attempts integer not null default 0,
    add column last_error text;

-- Preserve old receipts and their keys. A vanished row was already finalized by the old engine.
update public.gallery_storage_tombstones t set
    cleanup_after = coalesce(d.upload_expires_at + interval '2 minutes',t.checked_at),
    storage_provider = d.storage_provider
from public.date_images d where d.id=t.image_id;
update public.gallery_storage_tombstones t set completed_at=t.checked_at
where not exists(select 1 from public.date_images d where d.id=t.image_id);

create function public.record_gallery_deletion() returns trigger language plpgsql
security definer set search_path = public as $$
begin
    insert into public.gallery_storage_tombstones
        (image_id,gallery_id,space_id,object_keys,storage_provider,cleanup_after)
    select new.id,new.gallery_id,g.space_id,
        array_remove(array[new.storage_path_thumb,new.storage_path_grid,new.storage_path_orig],null),
        new.storage_provider,coalesce(new.upload_expires_at + interval '2 minutes',clock_timestamp())
    from public.galleries g where g.id=new.gallery_id
    on conflict(image_id) do nothing;
    return new;
end $$;
create trigger record_gallery_deletion after update of storage_state on public.date_images
    for each row when (new.storage_state='deleting') execute function public.record_gallery_deletion();

-- Include previously queued Supabase deletions and migrated R2 images with no PUT deadline.
insert into public.gallery_storage_tombstones
    (image_id,gallery_id,space_id,object_keys,storage_provider,cleanup_after)
select d.id,d.gallery_id,g.space_id,
    array_remove(array[d.storage_path_thumb,d.storage_path_grid,d.storage_path_orig],null),
    d.storage_provider,coalesce(d.upload_expires_at + interval '2 minutes',clock_timestamp())
from public.date_images d join public.galleries g on g.id=d.gallery_id
where d.storage_state='deleting' on conflict(image_id) do nothing;

create index gallery_cleanup_due on public.gallery_storage_tombstones
    (next_attempt_at,cleanup_after);
create index gallery_abandoned_uploads on public.date_images(upload_expires_at)
    where storage_state='pending';
create index gallery_deleting_parents on public.galleries(id) where storage_deleting;

-- Keep the original parent-before-child lock ordering. No mobile user is impersonated.
create function public.gallery_cleanup_prepare(p_limit integer default 100) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r record; abandoned integer:=0; parents integer:=0;
begin
    for r in select d.id from public.date_images d join public.galleries g on g.id=d.gallery_id
        where d.storage_state='pending' and d.upload_expires_at + interval '2 minutes' <= clock_timestamp()
        order by d.upload_expires_at,d.id limit greatest(1,least(p_limit,100)) for update of g skip locked
    loop
        update public.date_images set storage_state='deleting' where id=r.id and storage_state='pending'
            and upload_expires_at + interval '2 minutes' <= clock_timestamp();
        if found then abandoned:=abandoned+1; end if;
    end loop;
    for r in select g.id from public.galleries g where g.storage_deleting
        and not exists(select 1 from public.date_images d where d.gallery_id=g.id)
        order by g.id limit greatest(1,least(p_limit,100)) for update skip locked
    loop
        delete from public.galleries where id=r.id;
        parents:=parents+1;
    end loop;
    return jsonb_build_object('abandoned',abandoned,'parents',parents);
end $$;

-- Short transactions claim bounded pages. A crashed invocation's lease expires automatically.
create function public.gallery_cleanup_claim(p_token uuid,p_limit integer default 5)
returns setof public.gallery_storage_tombstones language sql security definer set search_path = public as $$
    with candidates as (
        select image_id from public.gallery_storage_tombstones
        where cleanup_after <= clock_timestamp() and next_attempt_at <= clock_timestamp()
            and (lease_until is null or lease_until <= clock_timestamp())
        order by (completed_at is not null),next_attempt_at,image_id
        limit greatest(1,least(p_limit,20)) for update skip locked
    )
    update public.gallery_storage_tombstones t set lease_token=p_token,
        lease_until=clock_timestamp()+interval '3 minutes',attempts=attempts+1,checked_at=clock_timestamp()
    from candidates c where t.image_id=c.image_id returning t.*;
$$;

create function public.gallery_cleanup_finish(p_image uuid,p_token uuid,p_success boolean,p_error text default null)
returns boolean language plpgsql security definer set search_path = public as $$
declare t public.gallery_storage_tombstones; gid uuid; d public.date_images;
begin
    select gallery_id into gid from public.gallery_storage_tombstones where image_id=p_image;
    perform 1 from public.galleries where id=gid for update;
    select * into t from public.gallery_storage_tombstones where image_id=p_image for update;
    if not found or t.lease_token is distinct from p_token or t.lease_until <= clock_timestamp()
        or t.lease_until is null then return false; end if;
    if p_success then
        if t.cleanup_after > clock_timestamp() then raise exception 'Upload URLs have not drained'; end if;
        select * into d from public.date_images where id=p_image for update;
        if found then
            if d.gallery_id<>t.gallery_id or d.storage_provider<>t.storage_provider or d.storage_state<>'deleting'
                or d.upload_expires_at + interval '2 minutes' > clock_timestamp() then
                raise exception 'Deletion state changed';
            end if;
            delete from public.date_images where id=p_image;
        end if;
        update public.gallery_storage_tombstones set completed_at=coalesce(completed_at,clock_timestamp()),
            lease_token=null,lease_until=null,last_error=null,
            next_attempt_at=case when storage_provider='r2' then clock_timestamp()+interval '23 hours'
                else 'infinity'::timestamptz end where image_id=p_image;
        -- All children must be finalized before the flagged parent may disappear.
        delete from public.galleries g where g.id=gid and g.storage_deleting
            and not exists(select 1 from public.date_images i where i.gallery_id=g.id);
    else
        update public.gallery_storage_tombstones set completed_at=null,lease_token=null,lease_until=null,
            next_attempt_at=clock_timestamp()+interval '1 hour',
            last_error=case when p_error in ('objects','metadata','invalid_receipt') then p_error else 'cleanup' end
            where image_id=p_image;
    end if;
    return true;
end $$;

create function public.gallery_cleanup_counts() returns jsonb language sql security definer set search_path = public as $$
    select jsonb_build_object(
        'pending',count(*) filter(where completed_at is null),
        'eligible',count(*) filter(where completed_at is null and cleanup_after<=clock_timestamp()),
        'skipped',count(*) filter(where completed_at is null and cleanup_after>clock_timestamp()),
        'rechecks',count(*) filter(where completed_at is not null and next_attempt_at<=clock_timestamp()),
        'pendingGalleries',(select count(*) from public.galleries where storage_deleting),
        'abandonedPending',(select count(*) from public.date_images where storage_state='pending'
            and upload_expires_at+interval '2 minutes'<=clock_timestamp()))
    from public.gallery_storage_tombstones;
$$;

revoke all on function public.record_gallery_deletion() from public,anon,authenticated;
revoke all on function public.gallery_cleanup_prepare(integer) from public,anon,authenticated;
revoke all on function public.gallery_cleanup_claim(uuid,integer) from public,anon,authenticated;
revoke all on function public.gallery_cleanup_finish(uuid,uuid,boolean,text) from public,anon,authenticated;
revoke all on function public.gallery_cleanup_counts() from public,anon,authenticated;
grant execute on function public.gallery_cleanup_prepare(integer),public.gallery_cleanup_claim(uuid,integer),
    public.gallery_cleanup_finish(uuid,uuid,boolean,text),public.gallery_cleanup_counts() to service_role;
commit;
