jest.mock("blurhash", () => ({
  encode: jest.fn().mockReturnValue("mock-blurhash"),
}));

jest.mock("upng-js", () => ({
  decode: jest.fn().mockReturnValue({}),
  toRGBA8: jest.fn().mockReturnValue([new Uint8Array(32 * 32 * 4)]),
}));

import { encode } from "blurhash";
import { generateBlurhash } from "@/utils/generateBlurhash";

describe("utils/generateBlurhash", () => {
  it("returns encoded blurhash", async () => {
    const hash = await generateBlurhash("file://input.jpg");

    expect(hash).toBe("mock-blurhash");
    expect(encode).toHaveBeenCalled();
  });
});
