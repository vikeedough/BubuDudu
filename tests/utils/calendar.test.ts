import { addDays, expandOccurrences, recurrenceDates, selectDigest, validateDraft } from "@/supabase/functions/_shared/calendar";

import type { CalendarEvent, CalendarException } from "@/types/calendar";

export const event = (patch: Partial<CalendarEvent> = {}): CalendarEvent => ({
    id: "event", space_id: "space", created_by: "creator", title: "Together", description: null,
    colour: "pink", is_all_day: true, start_date: "2026-10-03", end_date: "2026-10-03", starts_at: null, ends_at: null,
    timezone: "Asia/Singapore", recurrence_rule: null, reminder_days_before: null,
    created_at: "2026-10-01T00:00:00Z", updated_at: "2026-10-01T00:00:00Z", deleted_at: null, ...patch,
});
const exception = (patch: Partial<CalendarException> = {}): CalendarException => ({
    ...event(), id: "exception", event_id: "event", original_date: "2026-10-03", is_cancelled: false, ...patch,
});
describe("Calendar recurrence", () => {
    test.each([
        ["FREQ=DAILY", ["2026-10-03", "2026-10-04", "2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09", "2026-10-10", "2026-10-11", "2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15", "2026-10-16", "2026-10-17"]],
        ["FREQ=WEEKLY", ["2026-10-03", "2026-10-10", "2026-10-17"]],
        ["FREQ=WEEKLY;INTERVAL=2", ["2026-10-03", "2026-10-17"]],
        ["FREQ=DAILY;INTERVAL=3", ["2026-10-03", "2026-10-06", "2026-10-09", "2026-10-12", "2026-10-15"]],
    ])("expands %s", (recurrence_rule, expected) => {
        expect(recurrenceDates(event({ recurrence_rule }), "2026-10-01", "2026-10-17")).toEqual(expected);
    });
    it("skips invalid month days and leap dates", () => {
        expect(recurrenceDates(event({ start_date: "2026-01-31", recurrence_rule: "FREQ=MONTHLY" }), "2026-02-01", "2026-04-30")).toEqual(["2026-03-31"]);
        expect(recurrenceDates(event({ start_date: "2024-02-29", recurrence_rule: "FREQ=YEARLY" }), "2025-01-01", "2028-12-31")).toEqual(["2028-02-29"]);
    });
    it("jumps directly to the requested range for an old series", () => {
        expect(recurrenceDates(event({ start_date: "1900-01-01", recurrence_rule: "FREQ=DAILY" }), "2026-10-03", "2026-10-03")).toEqual(["2026-10-03"]);
    });
    it("bounds very large custom intervals and ignores overrides when recurrence is disabled", () => {
        expect(recurrenceDates(event({ recurrence_rule: "FREQ=YEARLY;INTERVAL=9999" }), "2026-10-01", "2026-10-31")).toEqual(["2026-10-03"]);
        expect(expandOccurrences([event()], [exception({ is_cancelled: true })], "2026-10-03", "2026-10-03")).toHaveLength(1);
    });
    it("keeps series unchanged when moving one occurrence into/out of a window", () => {
        const master = event({ recurrence_rule: "FREQ=WEEKLY" });
        const override = exception({ start_date: "2026-11-05", end_date: "2026-11-05", title: "Moved", reminder_days_before: 2 });
        expect(expandOccurrences([master], [override], "2026-10-03", "2026-10-03")).toEqual([]);
        expect(expandOccurrences([master], [override], "2026-11-05", "2026-11-05")[0]).toMatchObject({ title: "Moved", original_date: "2026-10-03", reminder_days_before: 2 });
        expect(master.title).toBe("Together");
        expect(expandOccurrences([master], [override], "2026-10-10", "2026-10-10")[0].title).toBe("Together");
    });
    it("cancels one occurrence and soft-deletes the entire series", () => {
        const master = event({ recurrence_rule: "FREQ=DAILY" });
        expect(expandOccurrences([master], [exception({ is_cancelled: true })], "2026-10-03", "2026-10-04").map((x) => x.original_date)).toEqual(["2026-10-04"]);
        expect(expandOccurrences([{ ...master, deleted_at: "2026-10-03T00:00:00Z" }], [], "2026-10-03", "2026-10-04")).toEqual([]);
        expect(expandOccurrences([{ ...master, title: "Series edit" }], [], "2026-10-03", "2026-10-04").map((x) => x.title)).toEqual(["Series edit", "Series edit"]);
    });
    it("preserves timed duration across Singapore days and exclusive midnight ends", () => {
        const timed = event({ is_all_day: false, start_date: null, end_date: null, starts_at: "2026-10-02T15:00:00Z", ends_at: "2026-10-02T17:00:00Z", recurrence_rule: "FREQ=WEEKLY" });
        expect(expandOccurrences([timed], [], "2026-10-03", "2026-10-03")).toHaveLength(1);
        expect(expandOccurrences([{ ...timed, ends_at: "2026-10-02T16:00:00Z" }], [], "2026-10-03", "2026-10-03")).toHaveLength(0);
    });
});
describe("Calendar reminders", () => {
    it("includes today with no reminder and deduplicates reminder zero", () => {
        expect(selectDigest([event(), event({ id: "zero", reminder_days_before: 0 })], [], "2026-10-03").map((x) => x.event_id)).toEqual(["event", "zero"]);
    });
    it("includes only due future reminders, applies recurrence and exception reminder/date/time", () => {
        const future = event({ id: "future", start_date: "2026-10-05", end_date: "2026-10-05", reminder_days_before: 2 });
        const recurring = event({ id: "recurring", recurrence_rule: "FREQ=WEEKLY", start_date: "2026-09-26", end_date: "2026-09-26" });
        const override = exception({ is_all_day: false, start_date: null, end_date: null, starts_at: "2026-10-05T01:00:00Z", ends_at: "2026-10-05T02:00:00Z", reminder_days_before: 2 });
        const result = selectDigest([event({ recurrence_rule: "FREQ=WEEKLY" }), future, recurring, { ...future, id: "not-due", reminder_days_before: 1 }, event({ id: "old", start_date: "2026-09-01", end_date: "2026-09-01" })], [override], "2026-10-03");
        expect(result.map((x) => x.event_id)).toEqual(["recurring", "future", "event"]);
        expect(result[2].starts_at).toBe("2026-10-05T01:00:00Z");
    });
    it("honours removed reminders, cancellations, ongoing all-day events, and huge offsets", () => {
        const master = event({ recurrence_rule: "FREQ=WEEKLY", reminder_days_before: 2 });
        expect(selectDigest([master], [exception({ start_date: "2026-10-05", end_date: "2026-10-05", reminder_days_before: null })], "2026-10-03")).toEqual([]);
        expect(selectDigest([master], [exception({ is_cancelled: true })], "2026-10-03")).toEqual([]);
        expect(selectDigest([event({ start_date: "2026-10-01", reminder_days_before: 2147483647 })], [], "2026-10-03")).toHaveLength(1);
        expect(selectDigest([event()], [], "2026-10-04")).toEqual([]);
    });
});
describe("Calendar form validation", () => {
    it("requires a timed end after start, valid all-day ranges, and nonnegative integer reminders", () => {
        expect(() => validateDraft(event())).not.toThrow();
        for (const patch of [{ title: " " }, { end_date: "2026-10-02" }, { start_date: "2026-02-30" }, { reminder_days_before: -1 }, { reminder_days_before: 1.5 }, { recurrence_rule: "FREQ=HOURLY" }, { recurrence_rule: "FREQ=DAILY;INTERVAL=0" }, { is_all_day: false, starts_at: "2026-10-03T01:00:00Z", ends_at: null, start_date: null, end_date: null }]) {
            expect(() => validateDraft(event(patch))).toThrow();
        }
        expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    });
});
