import { getSingaporePublicHolidays } from "@/data/singaporePublicHolidays";
import { occurrenceEnd, occurrenceStart } from "@/utils/calendar";

import type { SingaporePublicHoliday } from "@/data/singaporePublicHolidays";
import type { CalendarColour, CalendarOccurrence } from "@/types/calendar";

export const HOLIDAY_COLOUR: CalendarColour = "orange";
export type CalendarDisplayItem =
    | { kind: "event"; key: string; title: string; colour: CalendarColour; occurrence: CalendarOccurrence }
    | { kind: "holiday"; key: string; title: string; colour: CalendarColour; holiday: SingaporePublicHoliday };

export function calendarDisplayItems(occurrences: CalendarOccurrence[], from: string, to: string): CalendarDisplayItem[] {
    return [
        ...occurrences.map((occurrence): CalendarDisplayItem => ({ kind: "event", key: occurrence.key, title: occurrence.title, colour: occurrence.colour, occurrence })),
        ...getSingaporePublicHolidays(from, to).map((holiday): CalendarDisplayItem => ({ kind: "holiday", key: `holiday:${holiday.date}:${holiday.name}`, title: holiday.name, colour: HOLIDAY_COLOUR, holiday })),
    ];
}

export function displayItemsOnDate(items: CalendarDisplayItem[], date: string): CalendarDisplayItem[] {
    return items.filter((item) => item.kind === "holiday" ? item.holiday.date === date : occurrenceStart(item.occurrence) <= date && occurrenceEnd(item.occurrence) >= date)
        .sort((a, b) => {
            const time = (item: CalendarDisplayItem) => item.kind === "holiday" || item.occurrence.is_all_day ? "" : item.occurrence.starts_at!;
            return time(a).localeCompare(time(b)) || a.title.localeCompare(b.title);
        });
}
