jest.mock("@/utils/shrinkImage", () => ({
  shrinkImage: jest.fn(),
}));

import { shrinkImage } from "@/utils/shrinkImage";
import { generateVariants } from "@/utils/generateImageVariants";

describe("utils/generateImageVariants", () => {
  it("generates thumb/grid/orig variants with buffers", async () => {
    (shrinkImage as jest.Mock)
      .mockResolvedValueOnce({ uri: "file://thumb.jpg", width: 10, height: 10 })
      .mockResolvedValueOnce({ uri: "file://orig.jpg", width: 30, height: 30 });

    const variants = await generateVariants("file://input.jpg");

    expect(shrinkImage).toHaveBeenCalledTimes(2);
    expect(variants.thumb.variant).toBe("thumb");
    expect(variants.grid.variant).toBe("grid");
    expect(variants.orig.variant).toBe("orig");
    expect(variants.thumb.width).toBe(10);
    expect(variants.grid.width).toBe(30);
    expect(variants.orig.width).toBe(30);
    expect(variants.thumb.arrayBuffer).toBeInstanceOf(ArrayBuffer);
    expect(variants.grid.uri).toBe(variants.orig.uri);
    expect(variants.grid.arrayBuffer).toBe(variants.orig.arrayBuffer);
    expect(variants.grid.bytes).toBe(0);
    expect(shrinkImage).toHaveBeenNthCalledWith(1, "file://input.jpg", { maxLongEdge: 1000, jpegQuality: 0.7 });
    expect(shrinkImage).toHaveBeenNthCalledWith(2, "file://input.jpg", { maxLongEdge: 2000, jpegQuality: 0.9 });
    expect(variants.thumb.bytes).toBeGreaterThan(0);
  });
});
