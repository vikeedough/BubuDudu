import { waitFor } from "@testing-library/react-native";

import { useGalleryStore } from "@/stores/GalleryStore";
import { secureStoreUtilsMock } from "@/tests/mocks/secureStore";
import { supabaseMock, queueFrom, queueFromSingle, queueFunction } from "@/tests/mocks/supabase";
import { uploadR2Image } from "@/utils/gallery-storage";
import { generateVariants } from "@/utils/generateImageVariants";
import { getOfflineDb, getCachedGalleryImages } from "@/utils/offline/local-db";
jest.mock("@/utils/generateImageVariants", () => ({ generateVariants: jest.fn() }));
jest.mock("@/utils/generateBlurhash", () => ({ generateBlurhash: jest.fn().mockResolvedValue("hash") }));
jest.mock("@/utils/gallery-storage", () => ({ ...jest.requireActual("@/utils/gallery-storage"), uploadR2Image: jest.fn() }));
const image = (id = "i", gallery_id = "g") => ({ id, gallery_id, created_at: "2026-01-01", blur_hash: null, storage_provider: "r2" as const, storage_path_thumb: "thumb", storage_path_grid: "orig", storage_path_orig: "orig", cache_scope: "a/space", url_thumb: "cached-thumb", url_orig: "cached-orig", urls_expires_at: "2000-01-01" });
const deferred = () => { let resolve!: (v: any) => void; const promise = new Promise<any>(r => { resolve = r; }); return { promise, resolve }; };
beforeEach(() => {
    useGalleryStore.getState().clear();
    secureStoreUtilsMock.getSpaceId.mockResolvedValue("space");
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session: { user: { id: "a" } } } });
});
it("read failures preserve cached rows and expose an actionable error instead of empty success", async () => {
    useGalleryStore.setState({ imagesByGalleryId: { g: [image()] } });
    queueFrom("date_images", "select", { error: { message: "read failed" } });
    const rows = await useGalleryStore.getState().loadInitialGalleryImages("g");
    expect(rows[0].url_orig).toBe("cached-orig");
    expect(useGalleryStore.getState().imageErrorsByGalleryId.g).toBe("read failed");
    expect(useGalleryStore.getState().imagesPageByGalleryId.g.isLoadingInitial).toBe(false);
});
it("signing failure keeps matching scoped URLs and successful retry clears its error", async () => {
    useGalleryStore.setState({ imagesByGalleryId: { g: [image()] } });
    queueFrom("date_images", "select", { data: [image()] }, { data: [image()] });
    queueFunction("sign-gallery-urls", { error: { message: "sign failed" } }, { data: { i: { url_thumb: "new-thumb", url_orig: "new-orig", cache_scope: "a/space", urls_expires_at: new Date(Date.now()+3600000).toISOString() } } });
    await useGalleryStore.getState().loadInitialGalleryImages("g");
    expect(useGalleryStore.getState().imagesByGalleryId.g[0].url_orig).toBe("cached-orig");
    expect(useGalleryStore.getState().imageErrorsByGalleryId.g).toBe("sign failed");
    await useGalleryStore.getState().loadInitialGalleryImages("g");
    expect(useGalleryStore.getState().imageErrorsByGalleryId.g).toBeNull();
    expect(useGalleryStore.getState().imagesByGalleryId.g[0].url_orig).toBe("new-orig");
});
it("SQLite rejection settles loading and becomes a retryable read error", async () => {
    const db = await getOfflineDb();
    jest.spyOn(db, "getAllAsync").mockRejectedValueOnce(new Error("cache unavailable"));
    await expect(useGalleryStore.getState().loadInitialGalleryImages("g")).resolves.toEqual([]);
    expect(useGalleryStore.getState().imageErrorsByGalleryId.g).toBe("cache unavailable");
    expect(useGalleryStore.getState().imagesPageByGalleryId.g.isLoadingInitial).toBe(false);
});
it("reconciliation confirms partner-deleted IDs while retaining useful ready rows", async () => {
    const ready = { ...image("keep"), urls_expires_at: new Date(Date.now()+3600000).toISOString() };
    useGalleryStore.setState({ imagesByGalleryId: { g: [image("gone"), ready] } });
    queueFrom("date_images", "select", { data: [ready] }, { data: [] });
    await useGalleryStore.getState().reconcileGalleryImages("g");
    expect(useGalleryStore.getState().imagesByGalleryId.g.map(i => i.id)).toEqual(["keep"]);
    // A subsequent cache read cannot include the confirmed-deleted entity.
    expect((await getCachedGalleryImages("g")).some(i => i.id === "gone")).toBe(false);
});
it("one upload job owns each gallery while different galleries upload independently", async () => {
    const first = deferred(), other = deferred();
    (generateVariants as jest.Mock).mockResolvedValue({ thumb: { uri: "thumb" }, orig: { uri: "orig" }, grid: { uri: "orig" } });
    (uploadR2Image as jest.Mock).mockImplementation((id: string) => id === "g" ? first.promise : other.promise);
    queueFromSingle("galleries", "select", { data: { space_id: "space" } }, { data: { space_id: "space" } });
    const a = useGalleryStore.getState().uploadGalleryImages("g", ["a"]);
    expect(await useGalleryStore.getState().uploadGalleryImages("g", ["duplicate"])).toBe(false);
    const b = useGalleryStore.getState().uploadGalleryImages("other", ["b"]);
    await waitFor(() => expect(uploadR2Image).toHaveBeenCalledTimes(2));
    expect(useGalleryStore.getState().isUploadingByGalleryId.g).toBe(true);
    expect(useGalleryStore.getState().isUploadingByGalleryId.other).toBe(true);
    first.resolve({ ...image(), urls_expires_at: new Date(Date.now()+3600000).toISOString() }); await a;
    expect(useGalleryStore.getState().isUploadingByGalleryId.g).toBe(false);
    expect(useGalleryStore.getState().isUploadingByGalleryId.other).toBe(true);
    other.resolve({ ...image("other-image", "other"), urls_expires_at: new Date(Date.now()+3600000).toISOString() }); await b;
    expect(useGalleryStore.getState().isUploadingByGalleryId.other).toBe(false);
});

it("deduplicates matching reconciliation but does not reuse a job across spaces", async () => {
    const old = deferred();
    const load = jest.spyOn(useGalleryStore.getState(), "loadInitialGalleryImages").mockReturnValueOnce(old.promise).mockResolvedValue([]);
    const a = useGalleryStore.getState().reconcileGalleryImages("g"), b = useGalleryStore.getState().reconcileGalleryImages("g");
    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));
    secureStoreUtilsMock.getSpaceId.mockResolvedValue("new-space");
    await useGalleryStore.getState().reconcileGalleryImages("g");
    expect(load).toHaveBeenCalledTimes(2);
    old.resolve([]); await Promise.all([a,b]);
});
