jest.mock("@/utils/shrinkImage", () => ({
  shrinkImage: jest.fn(),
}));

import { shrinkImage } from "@/utils/shrinkImage";
import { generateVariants } from "@/utils/generateImageVariants";

describe("utils/generateImageVariants", () => {
  it("generates thumb/grid/orig variants with buffers", async () => {
    (shrinkImage as jest.Mock)
      .mockResolvedValueOnce({ uri: "file://thumb.jpg", width: 10, height: 10 })
      .mockResolvedValueOnce({ uri: "file://grid.jpg", width: 20, height: 20 })
      .mockResolvedValueOnce({ uri: "file://orig.jpg", width: 30, height: 30 });

    const variants = await generateVariants("file://input.jpg");

    expect(shrinkImage).toHaveBeenCalledTimes(3);
    expect(variants.thumb.variant).toBe("thumb");
    expect(variants.grid.variant).toBe("grid");
    expect(variants.orig.variant).toBe("orig");
    expect(variants.thumb.width).toBe(10);
    expect(variants.grid.width).toBe(20);
    expect(variants.orig.width).toBe(30);
    expect(variants.thumb.arrayBuffer).toBeInstanceOf(ArrayBuffer);
    expect(variants.thumb.bytes).toBeGreaterThan(0);
  });
});
