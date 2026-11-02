import { useGalleryStore } from "@/stores/GalleryStore";
import { secureStoreUtilsMock } from "@/tests/mocks/secureStore";
import { supabaseMock, queueFrom, queueFunction } from "@/tests/mocks/supabase";
import { refreshSignedImages } from "@/utils/gallery-storage";
import { getOfflineDb } from "@/utils/offline/local-db";
const image = (id: string) => ({ id, gallery_id: "g", created_at: "2026-01-01", url_orig: `o/${id}`, url_thumb: `t/${id}`, urls_expires_at: new Date(Date.now()+3600000).toISOString(), storage_path_orig: `orig/${id}`, storage_path_thumb: `thumb/${id}` });
beforeEach(() => {
    useGalleryStore.getState().clear();
    secureStoreUtilsMock.getSpaceId.mockResolvedValue("space");
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session: { user: { id: "a" } } } });
});
it("fresh URLs retain array identity, publish no store state and write no SQLite rows", async () => {
    const rows = [image("i")];
    useGalleryStore.setState({ imagesByGalleryId: { g: rows } });
    const db = await getOfflineDb(); const writes = jest.spyOn(db, "runAsync"); writes.mockClear();
    const listener = jest.fn(); const unsubscribe = useGalleryStore.subscribe(listener);
    expect(await refreshSignedImages("g", rows)).toBe(rows);
    await useGalleryStore.getState().refreshImageUrls("g");
    expect(useGalleryStore.getState().imagesByGalleryId.g).toBe(rows);
    expect(listener).not.toHaveBeenCalled(); expect(writes).not.toHaveBeenCalled();
    expect(supabaseMock.functions.invoke).not.toHaveBeenCalled(); unsubscribe();
});
it("overlapping renewals batch IDs, preserve untouched row identity and cache only changes", async () => {
    const rows = [image("a"), image("b"), image("c")];
    useGalleryStore.setState({ imagesByGalleryId: { g: rows } });
    const db = await getOfflineDb(); const writes = jest.spyOn(db, "runAsync"); writes.mockClear();
    queueFunction("sign-gallery-urls", { data: { a: { ...image("a"), url_orig: "renewed/a" }, b: { ...image("b"), url_orig: "renewed/b" } } });
    await Promise.all([useGalleryStore.getState().refreshImageUrls("g", ["a"], true), useGalleryStore.getState().refreshImageUrls("g", ["a","b"], true)]);
    const calls = supabaseMock.functions.invoke.mock.calls.filter(c => c[0] === "sign-gallery-urls");
    expect(calls).toHaveLength(1); expect(calls[0][1].body.imageIds.sort()).toEqual(["a", "b"]);
    expect(useGalleryStore.getState().imagesByGalleryId.g[2]).toBe(rows[2]);
    const inserts = writes.mock.calls.filter(c=>String(c[0]).includes("INSERT INTO gallery_images_cache"));
    expect(inserts.map(c=>c[1]).sort()).toEqual(["a","b"]);
});
it("cover-only renewal preserves all loaded pages and cursor and batches cards", async () => {
    const galleries = Array.from({length: 22}, (_,i) => ({ id: `${i}`, space_id: "space", title: "G", date: "2026-01-01", color: "#fff", location: "Here", cover_image_thumb_path: `path/${i}` }));
    useGalleryStore.setState({ galleries, galleriesPage: { cursor: { date: "2026-01-01", id: "21" }, hasMore: true, isLoadingInitial: false, isLoadingMore: false } });
    const page = useGalleryStore.getState().galleriesPage;
    queueFunction("sign-gallery-cover-urls", { data: { "path/0": "signed0", "path/1": "signed1" } });
    await Promise.all([useGalleryStore.getState().refreshCoverUrls(["0"], true), useGalleryStore.getState().refreshCoverUrls(["1"], true)]);
    expect(useGalleryStore.getState().galleries).toHaveLength(22);
    expect(useGalleryStore.getState().galleriesPage).toBe(page);
    expect(supabaseMock.functions.invoke).toHaveBeenCalledTimes(1);
    expect(supabaseMock.from).not.toHaveBeenCalled();
});
it.each(["asc", "desc"] as const)("%s paging follows server direction with date/id tie breaking", async direction => {
    const ascending = direction === "asc";
    const ids = Array.from({length: 40}, (_,i) => String(i).padStart(2,"0"));
    if (!ascending) ids.reverse();
    const builders: any[] = [];
    const original = supabaseMock.from.getMockImplementation()!;
    supabaseMock.from.mockImplementation((table: string) => { const builder = original(table); builders.push(builder); return builder; });
    queueFrom("date_images", "select", { data: ids.slice(0,20).map(image) }, { data: ids.slice(20).map(image) });
    await useGalleryStore.getState().setImageSort("g", direction);
    await useGalleryStore.getState().loadMoreGalleryImages("g");
    expect(useGalleryStore.getState().imagesByGalleryId.g.map(i=>i.id)).toEqual(ids);
    for (const builder of builders) {
        expect(builder.order).toHaveBeenCalledWith("created_at", {ascending});
        expect(builder.order).toHaveBeenCalledWith("id", {ascending});
    }
    expect(builders[1].or.mock.calls[0][0]).toContain(`id.${ascending ? "gt" : "lt"}.`);
});

it("a failed renewal retains working URLs and a subsequent explicit retry succeeds", async () => {
    const rows = [image("a")]; useGalleryStore.setState({ imagesByGalleryId: { g: rows } });
    queueFunction("sign-gallery-urls", { error: { message: "temporary signing failure" } }, { data: { a: { url_orig: "renewed", url_thumb: null } } });
    await expect(useGalleryStore.getState().refreshImageUrls("g", ["a"], true)).rejects.toThrow("temporary");
    expect(useGalleryStore.getState().imagesByGalleryId.g).toBe(rows);
    await useGalleryStore.getState().refreshImageUrls("g", ["a"], true);
    expect(useGalleryStore.getState().imagesByGalleryId.g[0].url_orig).toBe("renewed");
    expect(useGalleryStore.getState().imagesByGalleryId.g[0].url_thumb).toBe(rows[0].url_thumb);
});
it("failed cover renewal keeps its usable URL and all page state", async () => {
    const g = { id: "g", space_id: "space", title: "G", date: "2026-01-01", color: "#fff", location: "Here", cover_image_thumb_path: "thumb", cover_thumb_url: "working" };
    useGalleryStore.setState({ galleries: [g] }); const before = useGalleryStore.getState();
    queueFunction("sign-gallery-cover-urls", { error: { message: "unavailable" } });
    await expect(useGalleryStore.getState().refreshCoverUrls(["g"], true)).rejects.toThrow("unavailable");
    expect(useGalleryStore.getState().galleries).toBe(before.galleries);
    expect(useGalleryStore.getState().galleriesPage).toBe(before.galleriesPage);
});

it("distant cached ready rows cannot move the visible cursor past an unfetched gap", async () => {
    useGalleryStore.setState({ imagesByGalleryId: {g:[image("99")] } });
    const first = Array.from({length:20},(_,i)=>image(String(i).padStart(2,"0")));
    queueFrom("date_images", "select", {data:first}, {data:[image("99")]});
    await useGalleryStore.getState().setImageSort("g","asc");
    expect(useGalleryStore.getState().imagesByGalleryId.g.map(i=>i.id)).toEqual(first.map(i=>i.id));
    expect(useGalleryStore.getState().imagesPageByGalleryId.g.cursor?.id).toBe("19");
    expect(useGalleryStore.getState().imagesPageByGalleryId.g.hasMore).toBe(true);
});
