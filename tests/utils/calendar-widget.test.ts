import { expandOccurrences } from "@/utils/calendar";
import { buildCalendarWidgetData, buildCalendarWidgetSnapshot, widgetCalendarRange, widgetItemsFromOccurrences, widgetItemTime } from "@/widgets/calendar/snapshot";

import { calendarTestEvent } from "../helpers/calendar";

import type { CalendarException } from "@/types/calendar";
import type { CalendarWidgetItem } from "@/widgets/calendar/snapshot";

const item = (patch: Partial<CalendarWidgetItem> = {}): CalendarWidgetItem => ({ id: "event:one", kind: "event", title: "Together", date: "2026-08-09", isAllDay: true, colorKey: "pink", ...patch });
it("sorts Today all-day first then times, and merges a holiday once", () => {
    const items = [item({ id: "late", isAllDay: false, startTime: "17:00", endTime: "18:00" }), item({ id: "early", isAllDay: false, startTime: "09:00", endTime: "10:00" }), item(), item()];
    const snapshot = buildCalendarWidgetSnapshot({ singaporeDate: "2026-08-09", items });
    expect(snapshot.today.map((i) => i.id)).toEqual(["holiday:2026-08-09:National Day", "event:one", "early", "late"]);
    expect(snapshot.month.days.find((d) => d.date === "2026-08-09")).toMatchObject({ isToday: true, colorKeys: ["orange", "pink"] });
    expect(widgetItemTime(snapshot.today[0])).toBe("Public holiday · All day");
    expect(widgetItemTime(items[2])).toBe("All day");
    expect(widgetItemTime(items[0])).toBe("17:00 – 18:00");
});
it("sorts upcoming by date then all-day then time, bounding it to 14 days", () => {
    const snapshot = buildCalendarWidgetSnapshot({ singaporeDate: "2026-10-01", items: [
        item({ id: "later-day", date: "2026-10-03" }), item({ id: "late", date: "2026-10-02", isAllDay: false, startTime: "17:00" }),
        item({ id: "all-day", date: "2026-10-02" }), item({ id: "early", date: "2026-10-02", isAllDay: false, startTime: "09:00" }),
        item({ id: "too-far", date: "2026-10-16" }), item({ id: "last", date: "2026-10-15" }),
    ] });
    expect(snapshot.upcoming.map((i) => i.id)).toEqual(["all-day", "early", "late", "later-day", "last"]);
});
it("provides empty/signed-out states and clears all private data from the payload", () => {
    expect(buildCalendarWidgetSnapshot({ singaporeDate: "2026-10-05" }).emptyText).toBe("No events planned!");
    const occurrences = expandOccurrences([calendarTestEvent()], [], "2026-08-01", "2026-08-31");
    const data = buildCalendarWidgetData(occurrences, "bubududu://calendar-widget", false, new Date("2026-08-08T18:00:00Z"));
    expect(data.items).toEqual([]); expect(data.holidays).toEqual([]);
    for (const { snapshot } of data.timeline) {
        expect(snapshot.today).toEqual([]); expect(snapshot.upcoming).toEqual([]);
        expect(snapshot.month.days.every((day) => !day.colorKeys.length)).toBe(true);
        expect(snapshot.emptyText).toBe("Open BubuDudu to view your calendar");
    }
    expect(JSON.stringify(data)).not.toContain("Together");
});
it("rolls over at Singapore midnight and switches months/years without Supabase rows", () => {
    const data = buildCalendarWidgetData([], "bubududu://calendar-widget", true, new Date("2026-12-31T15:59:59Z"));
    expect(data.timeline[0].snapshot.singaporeDate).toBe("2026-12-31");
    expect(data.timeline[1].date).toBe("2026-12-31T16:00:00.000Z");
    expect(data.timeline[1].snapshot.month).toMatchObject({ year: 2027, month: 1 });
    expect(data.timeline[1].snapshot.today.map((i) => i.title)).toEqual(["New Year's Day"]);
    expect(data.timeline.every((entry, i) => i === 0 || Date.parse(entry.date) > Date.parse(data.timeline[i - 1].date))).toBe(true);
    expect(buildCalendarWidgetData([], "url", true, new Date("2026-08-09T16:00:00Z")).timeline[0].snapshot.today[0].title).toBe("National Day (Observed)");
});
it("keeps queries bounded, including current month, neighboring grid and 14 upcoming days", () => {
    expect(widgetCalendarRange("2026-12-31")).toEqual({ from: "2026-11-29", to: "2027-02-07" });
});
it("respects recurrence ends, cancellation and moved exceptions from the existing occurrence engine", () => {
    const event = calendarTestEvent({ start_date: "2026-10-01", end_date: "2026-10-01", recurrence_rule: "FREQ=DAILY", recurrence_end_date: "2026-10-03" });
    const cancelled: CalendarException = { ...event, id: "cancel", event_id: event.id, original_date: "2026-10-02", is_cancelled: true };
    const moved: CalendarException = { ...event, id: "move", event_id: event.id, original_date: "2026-10-03", start_date: "2026-10-05", end_date: "2026-10-05", is_cancelled: false };
    const occurrences = expandOccurrences([event], [cancelled, moved], "2026-10-01", "2026-10-31");
    const data = buildCalendarWidgetData(occurrences, "url", true, new Date("2026-10-01T00:00:00+08:00"));
    expect(data.items.map((i) => i.date)).toEqual(["2026-10-01", "2026-10-05"]);
    expect(JSON.stringify(data)).not.toContain("Private description");
    expect(Object.keys(data.items[0]).sort()).toEqual(["colorKey", "date", "id", "isAllDay", "kind", "title"]);
});
it("clips multi-day timed/all-day occurrences to the bounded range and deduplicates overlapping caches", () => {
    const event = calendarTestEvent({ is_all_day: false, start_date: null, end_date: null, starts_at: "2026-09-30T15:00:00Z", ends_at: "2026-10-02T02:00:00Z" });
    const occurrences = expandOccurrences([event], [], "2026-10-01", "2026-10-02");
    const items = widgetItemsFromOccurrences([...occurrences, ...occurrences], "2026-10-01", "2026-10-02");
    expect(items.map((i) => [i.date, i.startTime, i.endTime])).toEqual([["2026-10-01", "00:00", "24:00"], ["2026-10-02", "00:00", "10:00"]]);
});
