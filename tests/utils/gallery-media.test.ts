import { File } from "expo-file-system";
import { ImageManipulator } from "expo-image-manipulator";

import { removeGalleryTempFiles } from "@/utils/gallery-media";
import { generateBlurhash } from "@/utils/generateBlurhash";
import { shrinkImage } from "@/utils/shrinkImage";
jest.mock("upng-js", () => ({ decode: jest.fn(() => ({})), toRGBA8: jest.fn(() => [new Uint8Array(32*32*4).fill(255).buffer]) }));
it("never deletes the picker source and deduplicates compatibility aliases", () => {
    const deleted: string[] = [];
    jest.spyOn(File.prototype, "delete").mockImplementation(function (this: File) { deleted.push(this.uri); });
    removeGalleryTempFiles(["file:///original.jpg", "file:///generated.jpg", "file:///generated.jpg"], "file:///original.jpg");
    expect(deleted).toEqual(["file:///generated.jpg"]);
});
it("releases native references even when saving a resized JPEG fails", async () => {
    const original = { width: 4000, height: 2000, release: jest.fn() };
    const resized = { saveAsync: jest.fn().mockRejectedValue(new Error("save failed")), release: jest.fn() };
    const ctx = { renderAsync: jest.fn().mockResolvedValueOnce(original).mockResolvedValueOnce(resized), resize: jest.fn(), reset: jest.fn(), release: jest.fn() };
    (ImageManipulator.manipulate as jest.Mock).mockReturnValueOnce(ctx);
    await expect(shrinkImage("file:///source.jpg", { maxLongEdge: 2000, jpegQuality: .9 })).rejects.toThrow("save failed");
    expect(original.release).toHaveBeenCalledTimes(1); expect(resized.release).toHaveBeenCalledTimes(1); expect(ctx.release).toHaveBeenCalledTimes(1);
});
it("keeps the existing 32px/4x3 BlurHash output and cleans only its generated PNG", async () => {
    const deleted: string[] = [];
    jest.spyOn(File.prototype, "delete").mockImplementation(function (this: File) { deleted.push(this.uri); });
    const image = { saveAsync: jest.fn().mockResolvedValue({ uri: "file:///hash.png" }), release: jest.fn() };
    const ctx = { resize: jest.fn(), renderAsync: jest.fn().mockResolvedValue(image), release: jest.fn() };
    (ImageManipulator.manipulate as jest.Mock).mockReturnValueOnce(ctx);
    const hash = await generateBlurhash("file:///thumb.jpg");
    expect(hash).toBe("L9TSUA~qfQ~q~qoffQoffQfQfQfQ");
    expect(ctx.resize).toHaveBeenCalledWith({ width: 32, height: 32 });
    expect(image.release).toHaveBeenCalledTimes(1); expect(ctx.release).toHaveBeenCalledTimes(1);
    expect(deleted).toEqual(["file:///hash.png"]);
});
