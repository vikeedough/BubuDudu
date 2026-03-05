import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

import { shrinkImage } from "@/utils/shrinkImage";

function makeImageRef(width: number, height: number, uri: string) {
  return {
    width,
    height,
    saveAsync: jest.fn().mockResolvedValue({ uri }),
    release: jest.fn(),
  };
}

describe("utils/shrinkImage", () => {
  it("resizes when image exceeds maxLongEdge", async () => {
    const originalRef = makeImageRef(200, 100, "file://original.jpg");
    const resizedRef = makeImageRef(100, 50, "file://resized.jpg");

    const ctx = {
      renderAsync: jest
        .fn()
        .mockResolvedValueOnce(originalRef)
        .mockResolvedValueOnce(resizedRef),
      resize: jest.fn(),
      reset: jest.fn(),
      release: jest.fn(),
    };

    (ImageManipulator.manipulate as jest.Mock).mockReturnValueOnce(ctx);

    const result = await shrinkImage("file://input.jpg", {
      maxLongEdge: 100,
      jpegQuality: 0.7,
    });

    expect(ctx.resize).toHaveBeenCalledWith({ width: 100, height: 50 });
    expect(resizedRef.saveAsync).toHaveBeenCalledWith({
      format: SaveFormat.JPEG,
      compress: 0.7,
    });
    expect(result).toEqual({
      uri: "file://resized.jpg",
      width: 100,
      height: 50,
    });
  });

  it("compresses without resizing when image is within maxLongEdge", async () => {
    const originalRef = makeImageRef(80, 60, "file://original.jpg");
    const compressedRef = makeImageRef(80, 60, "file://compressed.jpg");

    const ctx = {
      renderAsync: jest
        .fn()
        .mockResolvedValueOnce(originalRef)
        .mockResolvedValueOnce(compressedRef),
      resize: jest.fn(),
      reset: jest.fn(),
      release: jest.fn(),
    };

    (ImageManipulator.manipulate as jest.Mock).mockReturnValueOnce(ctx);

    const result = await shrinkImage("file://input.jpg", {
      maxLongEdge: 100,
      jpegQuality: 0.5,
    });

    expect(ctx.resize).not.toHaveBeenCalled();
    expect(compressedRef.saveAsync).toHaveBeenCalledWith({
      format: SaveFormat.JPEG,
      compress: 0.5,
    });
    expect(result).toEqual({
      uri: "file://compressed.jpg",
      width: 80,
      height: 60,
    });
  });
});
