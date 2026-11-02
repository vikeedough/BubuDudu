import { uploadR2Image, needsUrlRefresh, refreshSignedImages } from "@/utils/gallery-storage";
import { queueFunction, supabaseMock } from "@/tests/mocks/supabase";
import { setIsOnline } from "@/utils/offline/network";
import type { GalleryImage } from "@/stores/GalleryStore";
import type { VariantOutput } from "@/utils/generateImageVariants";

const image: GalleryImage = { id: "i1", gallery_id: "g1", created_at: "2026-01-01", blur_hash: null,
    storage_path_thumb: "thumb.jpg", storage_path_grid: "orig.jpg", storage_path_orig: "orig.jpg",
    url_thumb: "https://old/thumb", url_orig: "https://old/orig", urls_expires_at: "2000-01-01" };
const variant = { variant: "orig", width: 100, height: 80, bytes: 8, uri: "file://photo", arrayBuffer: new ArrayBuffer(8) } as VariantOutput;
const variants = { thumb: variant, grid: variant, orig: variant };
describe("gallery storage protocol", () => {
    const originalFetch = global.fetch;
    beforeEach(() => { setIsOnline(true); global.fetch = jest.fn().mockResolvedValue({ ok: true }); });
    afterEach(() => { global.fetch = originalFetch; });
    it("refreshes expired-but-present URLs, keeps provider/scope, and skips fresh URLs", async () => {
        expect(needsUrlRefresh(image)).toBe(true);
        queueFunction("sign-gallery-urls", { data: { i1: { url_orig: "https://new/orig", url_thumb: "https://new/thumb",
            cache_scope: "account/space", urls_expires_at: new Date(Date.now() + 3600000).toISOString() } } });
        const refreshed = await refreshSignedImages("g1", [image]);
        expect(refreshed[0].url_orig).toBe("https://new/orig");
        expect(needsUrlRefresh(refreshed[0])).toBe(false);
        await refreshSignedImages("g1", refreshed);
        expect(supabaseMock.functions.invoke).toHaveBeenCalledTimes(1);
    });
    it("does not try network refresh offline", async () => {
        setIsOnline(false);
        expect(await refreshSignedImages("g1", [image], true)).toEqual([image]);
        expect(supabaseMock.functions.invoke).not.toHaveBeenCalled();
    });
    it("uploads exactly two JPEG buffers directly and finalizes using the same image identity", async () => {
        queueFunction("gallery-upload", { data: { ok: true, expiresAt: new Date(Date.now() + 300000).toISOString(),
            uploads: { thumb: "https://r2-test/thumb", orig: "https://r2-test/orig" } } }, { data: { ok: true, image } });
        expect(await uploadR2Image("g1", variants, "hash")).toEqual(image);
        expect(global.fetch).toHaveBeenCalledTimes(2);
        const bodies = supabaseMock.functions.invoke.mock.calls.map((call: any) => call[1].body);
        expect(bodies.map((body: any) => body.action)).toEqual(["initialize", "finalize"]);
        expect(bodies[0].imageId).toBe(bodies[1].imageId);
        expect(global.fetch).toHaveBeenCalledWith("https://r2-test/orig", expect.objectContaining({ method: "PUT", headers: { "Content-Type": "image/jpeg" } }));
    });
    it("retries a failed variant once, then durably aborts without client DB deletion", async () => {
        const init = { ok: true, expiresAt: new Date(Date.now() + 300000).toISOString(), uploads: { thumb: "https://r2-test/thumb", orig: "https://r2-test/orig" } };
        queueFunction("gallery-upload", { data: init }, { data: init }, { data: { ok: true } });
        (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 403 });
        await expect(uploadR2Image("g1", variants, "hash")).rejects.toThrow("403");
        const bodies = supabaseMock.functions.invoke.mock.calls.map((call: any) => call[1].body);
        expect(bodies.map((body: any) => body.action)).toEqual(["initialize", "initialize", "abort"]);
        expect(new Set(bodies.map((body: any) => body.imageId)).size).toBe(1);
        expect(supabaseMock.from).not.toHaveBeenCalled();
    });
    it("recognizes repeated finalize after a lost response without uploading twice", async () => {
        queueFunction("gallery-upload", { data: { ok: true, image } });
        expect(await uploadR2Image("g1", variants, "hash")).toEqual(image);
        expect(global.fetch).not.toHaveBeenCalled();
    });
    it("surfaces configuration errors and never falls back to Supabase storage", async () => {
        queueFunction("gallery-upload", { error: { message: "Missing R2 configuration" } }, { error: { message: "Missing R2 configuration" } }, { data: { ok: true } });
        await expect(uploadR2Image("g1", variants, "hash")).rejects.toThrow("Missing R2");
        expect(supabaseMock.storage.from).not.toHaveBeenCalled();
    });
});
