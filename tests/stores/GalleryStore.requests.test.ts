import { waitFor } from "@testing-library/react-native";

import { useGalleryStore } from "@/stores/GalleryStore";
import { secureStoreUtilsMock } from "@/tests/mocks/secureStore";
import { supabaseMock, queueFunction } from "@/tests/mocks/supabase";
jest.mock("@/utils/generateImageVariants", () => ({ generateVariants: jest.fn() }));
jest.mock("@/utils/generateBlurhash", () => ({ generateBlurhash: jest.fn() }));
const deferred = () => { let resolve!: (v: any) => void; const promise = new Promise<any>(r => { resolve = r; }); return { promise, resolve }; };
const gallery = (id: string) => ({ id, space_id: "space", title: id, date: "2026-01-01", color: "pink", location: "home", cover_image_path: null, cover_image_thumb_path: null, cover_image_blur_hash: null });
const image = (id: string, gallery_id = "g") => ({ id, gallery_id, created_at: "2026-01-01", blur_hash: null, storage_path_thumb: "thumb", storage_path_grid: "grid", storage_path_orig: "orig" });
function responses(promises: Promise<any>[]) {
    let calls = 0;
    supabaseMock.from.mockImplementation(() => {
        const response = promises[calls++]; const query: any = {};
        for (const key of ["select", "eq", "ilike", "order", "limit", "or", "in"]) query[key] = jest.fn(() => query);
        query.then = (ok: any, bad: any) => response.then(ok, bad); return query;
    });
    return () => calls;
}
beforeEach(() => {
    useGalleryStore.getState().clear();
    secureStoreUtilsMock.getSpaceId.mockResolvedValue("space");
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session: { user: { id: "a" } } } });
});
it("newer search owns results, cache, errors and loading completion", async () => {
    const old = deferred(), fresh = deferred(); const calls = responses([old.promise, fresh.promise]);
    const first = useGalleryStore.getState().loadInitialGalleries(); await waitFor(() => expect(calls()).toBe(1));
    useGalleryStore.getState().setGalleriesQuery({ searchText: "new" }); await waitFor(() => expect(calls()).toBe(2));
    old.resolve({ data: [gallery("old")], error: { message: "obsolete failure" } }); await first;
    expect(useGalleryStore.getState().galleriesPage.isLoadingInitial).toBe(true);
    expect(useGalleryStore.getState().error).toBeNull();
    fresh.resolve({ data: [gallery("new")], error: null });
    await waitFor(() => expect(useGalleryStore.getState().galleries.map(g => g.id)).toEqual(["new"]));
});
it("a page from an old sort never appends to its replacement query", async () => {
    const page = deferred(), sorted = deferred(); const calls = responses([page.promise, sorted.promise]);
    useGalleryStore.setState({ galleries: [gallery("existing")], galleriesPage: { cursor: { date: "2026-01-01", id: "existing" }, hasMore: true, isLoadingInitial: false, isLoadingMore: false } });
    const pending = useGalleryStore.getState().loadMoreGalleries(); await waitFor(() => expect(calls()).toBe(1));
    useGalleryStore.getState().setGalleriesQuery({ sortDir: "asc" }); await waitFor(() => expect(calls()).toBe(2));
    sorted.resolve({ data: [gallery("sorted")], error: null }); await waitFor(() => expect(useGalleryStore.getState().galleries[0]?.id).toBe("sorted"));
    page.resolve({ data: [gallery("obsolete-page")], error: null }); await pending;
    expect(useGalleryStore.getState().galleries.map(g => g.id)).toEqual(["sorted"]);
});
it.each(["account", "space"])("a %s switch rejects pending publication and signing", async (kind) => {
    const old = deferred(); const calls = responses([old.promise]);
    const pending = useGalleryStore.getState().loadInitialGalleries(); await waitFor(() => expect(calls()).toBe(1));
    if (kind === "account") { useGalleryStore.getState().clear(); supabaseMock.auth.getSession.mockResolvedValue({ data: { session: { user: { id: "b" } } } }); }
    else secureStoreUtilsMock.getSpaceId.mockResolvedValue("new-space");
    useGalleryStore.setState({ galleries: [gallery("new-context")] });
    old.resolve({ data: [{ ...gallery("old-context"), cover_image_thumb_path: "private-old-key" }], error: null }); await pending;
    expect(useGalleryStore.getState().galleries.map(g => g.id)).toEqual(["new-context"]);
    expect(supabaseMock.functions.invoke).not.toHaveBeenCalled();
});
it("independent galleries retain independent read ownership", async () => {
    const a = deferred(), b = deferred(); const calls = responses([a.promise, b.promise]);
    const first = useGalleryStore.getState().loadInitialGalleryImages("a"); await waitFor(() => expect(calls()).toBe(1));
    const second = useGalleryStore.getState().loadInitialGalleryImages("b"); await waitFor(() => expect(calls()).toBe(2));
    b.resolve({ data: [image("ib", "b")], error: null }); await second;
    a.resolve({ data: [image("ia", "a")], error: null }); await first;
    expect(useGalleryStore.getState().imagesByGalleryId.a[0].id).toBe("ia");
    expect(useGalleryStore.getState().imagesByGalleryId.b[0].id).toBe("ib");
});
it("HTTP 202 acceptance invalidates an older ready-row request", async () => {
    const old = deferred(); const calls = responses([old.promise]);
    const pending = useGalleryStore.getState().loadInitialGalleryImages("g"); await waitFor(() => expect(calls()).toBe(1));
    jest.spyOn(useGalleryStore.getState(), "refreshGalleryImages").mockResolvedValue([]);
    jest.spyOn(useGalleryStore.getState(), "refreshGalleries").mockResolvedValue([]);
    queueFunction("delete-gallery-images", { data: { ok: true, deferred: true } });
    expect(await useGalleryStore.getState().deleteOneGalleryImage("g", "gone")).toBe(true);
    old.resolve({ data: [image("gone")], error: null }); await pending;
    expect(useGalleryStore.getState().imagesByGalleryId.g).toEqual([]);
});

it("changing image sort rejects an older descending page without stale append or loading completion", async () => {
    const old = deferred(), fresh = deferred(); const calls = responses([old.promise, fresh.promise]);
    useGalleryStore.setState({ imagesByGalleryId: { g: [image("old")] }, imagesPageByGalleryId: { g: { cursor: { created_at: "2026-01-01", id: "old" }, hasMore: true, isLoadingInitial: false, isLoadingMore: false } } });
    const pending = useGalleryStore.getState().loadMoreGalleryImages("g"); await waitFor(() => expect(calls()).toBe(1));
    const ascending = useGalleryStore.getState().setImageSort("g", "asc"); await waitFor(() => expect(calls()).toBe(2));
    const replacementPage = useGalleryStore.getState().imagesPageByGalleryId.g;
    old.resolve({data:[image("stale")],error:null}); await pending;
    expect(useGalleryStore.getState().imagesPageByGalleryId.g).toBe(replacementPage);
    fresh.resolve({data:[image("old")],error:null}); await ascending;
    expect(useGalleryStore.getState().imagesByGalleryId.g.map(i=>i.id)).toEqual(["old"]);
    expect(useGalleryStore.getState().imageSortByGalleryId.g).toBe("asc");
});
