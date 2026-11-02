import { File } from "expo-file-system";
import * as MediaLibrary from "expo-media-library";

import { multipleDownloadAndSaveImage } from "@/utils/gallery";
const image = (id: string, url_orig: string | undefined = `https://mock/${id}`) => ({ id, url_orig } as any);
beforeEach(() => {
    (MediaLibrary.requestPermissionsAsync as jest.Mock).mockReset().mockResolvedValue({ status: "granted" });
    (MediaLibrary.getAlbumAsync as jest.Mock).mockReset().mockResolvedValue({ id: "album" });
    (MediaLibrary.createAssetAsync as jest.Mock).mockReset().mockResolvedValue({ id: "saved" });
});
it("reports partial success, every failure and missing original; retries only the unsuccessful IDs", async () => {
    const download = jest.spyOn(File, "downloadFileAsync").mockImplementation(async (_url, file: any) => file);
    (MediaLibrary.createAssetAsync as jest.Mock).mockResolvedValueOnce({ id: "one" }).mockRejectedValueOnce(new Error("save two failed")).mockResolvedValueOnce({ id: "three" });
    const progress = jest.fn();
    const rows = [image("one"), image("two"), image("three"), { id: "missing" } as any];
    const result = await multipleDownloadAndSaveImage(rows, undefined, { onProgress: progress });
    expect(result.savedIds).toEqual(["one", "three"]);
    expect(result.failedIds).toEqual(["two"]); expect(result.skippedIds).toEqual(["missing"]);
    expect(progress).toHaveBeenLastCalledWith({ saved: 2, failed: 1, skipped: 1, processed: 4, total: 4 });
    const retry = await multipleDownloadAndSaveImage(rows.filter(row => result.failedIds.includes(row.id)));
    expect(retry.savedIds).toEqual(["two"]);
    expect(download.mock.calls.map(call => call[0])).toEqual(["https://mock/one", "https://mock/two", "https://mock/three", "https://mock/two"]);
});
it("shares one expiry renewal across the remaining loop instead of downloading each stale URL", async () => {
    const download = jest.spyOn(File, "downloadFileAsync").mockRejectedValueOnce(new Error("HTTP 403 expired")).mockImplementation(async (_url, file: any) => file);
    const refresh = jest.fn().mockResolvedValue([image("one", "https://new/one"), image("two", "https://new/two")]);
    const result = await multipleDownloadAndSaveImage([image("one"), image("two")], refresh);
    expect(result.savedIds).toEqual(["one", "two"]);
    expect(refresh).toHaveBeenCalledTimes(1); expect(refresh).toHaveBeenCalledWith(["one", "two"]);
    expect(download.mock.calls.map(call => call[0])).toEqual(["https://mock/one", "https://new/one", "https://new/two"]);
    expect(MediaLibrary.getAlbumAsync).toHaveBeenCalledTimes(1);
});
it("permission denial retains skipped IDs without starting a download", async () => {
    (MediaLibrary.requestPermissionsAsync as jest.Mock).mockResolvedValue({ status: "denied", canAskAgain: false });
    const download = jest.spyOn(File, "downloadFileAsync");
    const result = await multipleDownloadAndSaveImage([image("one")]);
    expect(result.permissionDenied).toBe(true); expect(result.skippedIds).toEqual(["one"]);
    expect(download).not.toHaveBeenCalled();
});
it("cancellation stops subsequent saves and cleans the owned in-progress temporary file", async () => {
    const controller = new AbortController();
    const removed: string[] = [];
    jest.spyOn(File.prototype, "delete").mockImplementation(function (this: File) { removed.push(this.uri); });
    jest.spyOn(File, "downloadFileAsync").mockImplementation(async (_url, file: any) => { controller.abort(); return file; });
    const result = await multipleDownloadAndSaveImage([image("one"), image("two")], undefined, { signal: controller.signal });
    expect(result.cancelled).toBe(true); expect(result.skippedIds).toEqual(["one", "two"]);
    expect(MediaLibrary.createAssetAsync).not.toHaveBeenCalled();
    expect(removed).toHaveLength(1); expect(removed[0]).toContain("BubuDudu/one-");
});
it("cleans partial download files, preserves successful results if cleanup fails, and never deletes a source URI", async () => {
    const removed: string[] = [];
    jest.spyOn(File.prototype, "delete").mockImplementation(function (this: File) { removed.push(this.uri); throw new Error("cleanup failure"); });
    jest.spyOn(File, "downloadFileAsync").mockRejectedValueOnce(new Error("partial network failure")).mockImplementation(async (_url, file: any) => file);
    const result = await multipleDownloadAndSaveImage([image("bad"), image("good", "file:///picker/original.jpg")]);
    expect(result.failedIds).toEqual(["bad"]); expect(result.savedIds).toEqual(["good"]);
    expect(removed).toHaveLength(2); expect(removed).not.toContain("file:///picker/original.jpg");
    expect(removed.every(uri => uri.includes("BubuDudu/"))).toBe(true);
});
