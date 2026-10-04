import { type CalendarEvent, type CalendarException, expandOccurrences, recurrenceDates, selectDigest } from "./calendar.ts";

function equal(actual: unknown, expected: unknown) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}
const event: CalendarEvent = {
    id: "event", space_id: "space", created_by: "member", created_at: "", updated_at: "", deleted_at: null,
    title: "Weekly", description: null, colour: "pink", is_all_day: true, start_date: "2026-10-05", end_date: "2026-10-05",
    starts_at: null, ends_at: null, timezone: "Asia/Singapore", reminder_days_before: 2, recurrence_rule: "FREQ=WEEKLY", recurrence_end_date: "2026-10-19",
};
Deno.test("inclusive cutoff applies to app and digest Today/Coming up expansion", () => {
    equal(recurrenceDates(event, "2026-10-01", "2026-10-31"), ["2026-10-05", "2026-10-12", "2026-10-19"]);
    equal(selectDigest([event], [], "2026-10-19").map((x) => x.original_date), ["2026-10-19"]);
    equal(selectDigest([event], [], "2026-10-17").map((x) => x.original_date), ["2026-10-19"]);
    equal(selectDigest([event], [], "2026-10-24"), []);
    equal(selectDigest([event], [], "2026-10-26"), []);
    equal(recurrenceDates({ ...event, recurrence_end_date: null }, "2026-10-26", "2026-10-26"), ["2026-10-26"]);
});
Deno.test("cutoff and split identities preserve only applicable moved overrides", () => {
    const override: CalendarException = { ...event, id: "override", event_id: "event", original_date: "2026-10-12", is_cancelled: false, start_date: "2026-11-20", end_date: "2026-11-20", reminder_days_before: 3 };
    equal(expandOccurrences([event], [override], "2026-11-20", "2026-11-20").map((x) => x.original_date), ["2026-10-12"]);
    equal(selectDigest([event], [override], "2026-11-17").map((x) => x.original_date), ["2026-10-12"]);
    equal(expandOccurrences([event], [{ ...override, original_date: "2026-10-26" }], "2026-11-20", "2026-11-20"), []);
    const old = { ...event, recurrence_end_date: "2026-10-18" };
    const next = { ...event, id: "next", start_date: "2026-10-19", end_date: "2026-10-19", recurrence_end_date: null };
    equal(expandOccurrences([old, next], [], "2026-10-01", "2026-10-31").map((x) => [x.event_id, x.original_date]), [
        ["event", "2026-10-05"], ["event", "2026-10-12"], ["next", "2026-10-19"], ["next", "2026-10-26"],
    ]);
});
