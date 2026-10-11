import { getSingaporePublicHolidays, isCalendarDate, singaporePublicHolidays } from "@/data/singaporePublicHolidays";
import { selectDigest } from "@/supabase/functions/_shared/calendar";
import { expandOccurrences } from "@/utils/calendar";
import { calendarDisplayItems, displayItemsOnDate, HOLIDAY_COLOUR } from "@/utils/calendar-display";

import { calendarTestEvent } from "../helpers/calendar";

const dates = {
    2026: ["01-01", "02-17", "02-18", "03-21", "04-03", "05-01", "05-27", "05-31", "06-01", "08-09", "08-10", "11-08", "11-09", "12-25"],
    2027: ["01-01", "02-06", "02-07", "02-08", "03-10", "03-26", "05-01", "05-17", "05-20", "08-09", "10-28", "12-25"],
};
it.each([2026, 2027] as const)("contains exactly MOM's requested %s dates", (year) => {
    expect(getSingaporePublicHolidays(`${year}-01-01`, `${year}-12-31`).map((h) => h.date)).toEqual(dates[year].map((date) => `${year}-${date}`));
});
it("has well-formed unique date/name records and only explicit observed days", () => {
    expect(singaporePublicHolidays).toHaveLength(26);
    expect(new Set(singaporePublicHolidays.map((h) => h.date + h.name)).size).toBe(26);
    for (const holiday of singaporePublicHolidays) {
        expect(isCalendarDate(holiday.date)).toBe(true);
        expect(holiday.source).toBe("MOM");
        expect(holiday.name.trim()).toBeTruthy();
    }
    expect(singaporePublicHolidays.filter((h) => h.observedFor).map((h) => [h.date, h.observedFor])).toEqual([
        ["2026-06-01", "2026-05-31"], ["2026-08-10", "2026-08-09"], ["2026-11-09", "2026-11-08"], ["2027-02-08", "2027-02-07"],
    ]);
    expect(singaporePublicHolidays.filter((h) => h.observedFor).every((h) => h.name.endsWith("(Observed)"))).toBe(true);
});
it("validates malformed dates and bounds the inclusive query", () => {
    for (const date of ["2026-02-30", "2026-1-01", "2026-13-01", "tomorrow"]) {
        expect(isCalendarDate(date)).toBe(false);
        expect(() => getSingaporePublicHolidays(date, "2027-12-31")).toThrow();
    }
    expect(() => getSingaporePublicHolidays("2027-01-01", "2026-01-01")).toThrow();
    expect(getSingaporePublicHolidays("2026-08-09", "2026-08-10")).toHaveLength(2);
    expect(getSingaporePublicHolidays("2028-01-01", "2028-12-31")).toEqual([]);
});
it("coexists with a user event without adding system items to persisted or digest inputs", () => {
    const events = [calendarTestEvent()];
    const occurrences = expandOccurrences(events, [], "2026-08-01", "2026-08-31");
    const items = displayItemsOnDate(calendarDisplayItems(occurrences, "2026-08-01", "2026-08-31"), "2026-08-09");
    expect(items.map((item) => item.kind)).toEqual(["holiday", "event"]);
    expect(items[0]).toMatchObject({ title: "National Day", colour: HOLIDAY_COLOUR });
    expect(items[1].colour).toBe("pink");
    expect(events).toHaveLength(1);
    expect(selectDigest(events, [], "2026-08-09").map((item) => item.title)).toEqual(["Together"]);
    expect(selectDigest([], [], "2026-08-09")).toEqual([]);
});
