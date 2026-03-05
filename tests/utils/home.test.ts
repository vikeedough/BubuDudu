import { getDaysUntilNextBirthday, randomNumber } from "@/utils/home";
import { freezeTime, restoreTime } from "@/tests/helpers/time";

describe("utils/home", () => {
  afterEach(() => {
    restoreTime();
  });

  it("returns null when birthday is missing", () => {
    expect(getDaysUntilNextBirthday(null)).toBeNull();
  });

  it("returns 1 for birthday today", () => {
    freezeTime("2026-03-06T12:00:00.000Z");
    expect(getDaysUntilNextBirthday("2000-03-06")).toBe(1);
  });

  it("handles birthday in the future this year", () => {
    freezeTime("2026-03-06T12:00:00.000Z");
    expect(getDaysUntilNextBirthday("2000-03-07")).toBe(1);
  });

  it("rolls over birthday already passed this year", () => {
    freezeTime("2026-03-06T12:00:00.000Z");
    expect(getDaysUntilNextBirthday("2000-03-05")).toBe(364);
  });

  it("generates random numbers inside inclusive bounds", () => {
    jest.spyOn(Math, "random").mockReturnValueOnce(0);
    expect(randomNumber(3, 8)).toBe(3);

    (Math.random as jest.Mock).mockReturnValueOnce(0.999999);
    expect(randomNumber(3, 8)).toBe(8);
  });
});
