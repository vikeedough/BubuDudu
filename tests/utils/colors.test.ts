import {
    getReadableAccentTextColor,
    getReadableTextColor,
    normalizeHexColor,
    parseHexColor,
    rgbToHex,
} from "@/utils/colors";

describe("utils/colors", () => {
    it("normalizes short and long hex colours", () => {
        expect(normalizeHexColor("#abc")).toBe("#AABBCC");
        expect(normalizeHexColor("f04770")).toBe("#F04770");
    });

    it("rejects invalid hex colours", () => {
        expect(normalizeHexColor("#12")).toBeNull();
        expect(normalizeHexColor("not-a-color")).toBeNull();
        expect(parseHexColor(null)).toBeNull();
    });

    it("clamps rgb channels when converting to hex", () => {
        expect(rgbToHex({ r: -10, g: 128.4, b: 999 })).toBe("#0080FF");
    });

    it("chooses readable text for arbitrary backgrounds", () => {
        expect(getReadableTextColor("#FFFFFF")).toBe("#505739");
        expect(getReadableTextColor("#073A4B")).toBe("#FFFFFF");
    });

    it("falls back when an accent is too light on white", () => {
        expect(getReadableAccentTextColor("#FDF1C9")).toBe("#505739");
        expect(getReadableAccentTextColor("#0F8AAF")).toBe("#0F8AAF");
    });
});
