import {
  convertToDisplayDate,
  dateToYYYYMMDD,
  formatDate,
} from "@/utils/settings";

describe("utils/settings", () => {
  it("formats ordinal dates correctly", () => {
    expect(formatDate("2026-01-01")).toBe("1st January 2026");
    expect(formatDate("2026-01-02")).toBe("2nd January 2026");
    expect(formatDate("2026-01-03")).toBe("3rd January 2026");
    expect(formatDate("2026-01-04")).toBe("4th January 2026");
    expect(formatDate("2026-01-11")).toBe("11th January 2026");
    expect(formatDate("2026-01-12")).toBe("12th January 2026");
    expect(formatDate("2026-01-13")).toBe("13th January 2026");
    expect(formatDate("2026-01-21")).toBe("21st January 2026");
  });

  it("converts Date to YYYY-MM-DD with zero-padding", () => {
    const date = new Date("2026-03-06T14:00:00.000Z");
    expect(dateToYYYYMMDD(date)).toBe("2026-03-06");
  });

  it("converts Date directly to display string", () => {
    const date = new Date("2026-12-25T12:00:00.000Z");
    expect(convertToDisplayDate(date)).toBe("25th December 2026");
  });
});
