import { isCalendarDate, singaporePublicHolidays } from "@/data/singaporePublicHolidays";
import { addDays, dateInSingapore, occurrenceEnd, occurrenceStart, timeInSingapore } from "@/utils/calendar";
import { HOLIDAY_COLOUR } from "@/utils/calendar-display";

import type { CalendarColour, CalendarOccurrence } from "@/types/calendar";

export type CalendarWidgetItem = {
    id: string; kind: "event" | "holiday"; title: string; date: string;
    isAllDay: boolean; startTime?: string; endTime?: string; colorKey: CalendarColour;
};
export type CalendarWidgetDay = { date: string; day: number; inMonth: boolean; isToday: boolean; colorKeys: CalendarColour[] };
export type CalendarWidgetSnapshot = {
    generatedAt: string; singaporeDate: string; dateLabel: string; signedIn: boolean;
    month: { year: number; month: number; label: string; days: CalendarWidgetDay[] };
    today: CalendarWidgetItem[]; upcoming: CalendarWidgetItem[]; emptyText: string;
};
// This is the complete widget-visible payload. No masters, descriptions,
// exceptions, account IDs, tokens, Supabase URLs or credentials cross the bridge.
export type CalendarWidgetData = {
    schemaVersion: 1; signedIn: boolean; generatedAt: string; calendarUrl: string;
    items: CalendarWidgetItem[]; holidays: CalendarWidgetItem[];
    timeline: { date: string; snapshot: CalendarWidgetSnapshot }[];
};

export const holidayWidgetItems: CalendarWidgetItem[] = singaporePublicHolidays.map((h) => ({
    id: `holiday:${h.date}:${h.name}`, kind: "holiday", title: h.name, date: h.date, isAllDay: true, colorKey: HOLIDAY_COLOUR,
}));

export function widgetCalendarRange(date: string) {
    const first = date.slice(0, 7) + "-01";
    const from = addDays(first, -new Date(first + "T00:00:00Z").getUTCDay());
    const nextMonth = new Date(first + "T00:00:00Z");
    nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 2, 0);
    return { from, to: addDays(nextMonth.toISOString().slice(0, 10), 7) };
}

export function widgetItemsFromOccurrences(occurrences: CalendarOccurrence[], from: string, to: string): CalendarWidgetItem[] {
    const items = new Map<string, CalendarWidgetItem>();
    for (const event of occurrences) {
        const start = occurrenceStart(event), end = occurrenceEnd(event);
        for (let date = start < from ? from : start; date <= end && date <= to; date = addDays(date, 1)) {
            const id = `${event.key}:${date}`;
            items.set(id, { id, kind: "event", title: event.title, date, isAllDay: event.is_all_day,
                ...(!event.is_all_day ? { startTime: date === start ? timeInSingapore(event.starts_at!) : "00:00", endTime: date === end ? timeInSingapore(event.ends_at!) : "24:00" } : {}),
                colorKey: event.colour });
        }
    }
    return [...items.values()];
}

function sortItems(a: CalendarWidgetItem, b: CalendarWidgetItem) {
    return a.date.localeCompare(b.date) || Number(b.isAllDay) - Number(a.isAllDay) || (a.startTime ?? "").localeCompare(b.startTime ?? "") || a.title.localeCompare(b.title) || a.id.localeCompare(b.id);
}
export function widgetItemTime(item: CalendarWidgetItem) {
    return item.kind === "holiday" ? "Public holiday · All day" : item.isAllDay ? "All day" : `${item.startTime} – ${item.endTime}`;
}

export function buildCalendarWidgetSnapshot({ items = [], holidays = holidayWidgetItems, singaporeDate, generatedAt = new Date().toISOString(), signedIn = true }: {
    items?: CalendarWidgetItem[]; holidays?: CalendarWidgetItem[]; singaporeDate: string; generatedAt?: string; signedIn?: boolean;
}): CalendarWidgetSnapshot {
    if (!isCalendarDate(singaporeDate)) throw new Error("Invalid Singapore widget date.");
    const monthKey = singaporeDate.slice(0, 7);
    const first = monthKey + "-01";
    const from = addDays(first, -new Date(first + "T00:00:00Z").getUTCDay());
    const merged = signedIn ? [...new Map([...items, ...holidays].map((item) => [item.id, item])).values()].sort(sortItems) : [];
    const days = Array.from({ length: 42 }, (_, i) => {
        const date = addDays(from, i);
        return { date, day: Number(date.slice(8)), inMonth: date.startsWith(monthKey), isToday: date === singaporeDate,
            colorKeys: [...new Set(merged.filter((item) => item.date === date).map((item) => item.colorKey))] };
    });
    const date = new Date(singaporeDate + "T00:00:00Z");
    return { generatedAt, singaporeDate, signedIn,
        dateLabel: date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "long", timeZone: "UTC" }),
        month: { year: Number(first.slice(0, 4)), month: Number(first.slice(5, 7)), label: date.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }), days },
        today: merged.filter((item) => item.date === singaporeDate),
        upcoming: merged.filter((item) => item.date > singaporeDate && item.date <= addDays(singaporeDate, 14)),
        emptyText: signedIn ? "No events planned!" : "Open BubuDudu to view your calendar" };
}

export function buildCalendarWidgetData(occurrences: CalendarOccurrence[], calendarUrl: string, signedIn: boolean, now = new Date()): CalendarWidgetData {
    const singaporeDate = dateInSingapore(now);
    const { from, to } = widgetCalendarRange(singaporeDate);
    const generatedAt = now.toISOString();
    const items = signedIn ? widgetItemsFromOccurrences(occurrences, from, to) : [];
    const holidays = signedIn ? holidayWidgetItems : [];
    // Current entry plus 34 Singapore midnights; native providers regenerate
    // holiday-only/future snapshots after this horizon, without network access.
    const timeline = Array.from({ length: 35 }, (_, i) => {
        const date = addDays(singaporeDate, i);
        return { date: i === 0 ? generatedAt : new Date(date + "T00:00:00+08:00").toISOString(),
            snapshot: buildCalendarWidgetSnapshot({ items, holidays, singaporeDate: date, generatedAt, signedIn }) };
    });
    return { schemaVersion: 1, signedIn, generatedAt, calendarUrl, items, holidays, timeline };
}
