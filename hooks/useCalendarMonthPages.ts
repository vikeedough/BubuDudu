import { useEffect } from "react";

import { monthWindow, offsetMonth } from "@/components/calendar/MonthCalendar";
import { calendarWindowKey, useCalendarStore } from "@/stores/CalendarStore";

import type { CalendarOccurrence } from "@/types/calendar";

// Active and neighbor pages share bounded 42-day windows. Prefetch changes only
// the cache; no requests are made on pan frames.
export function useCalendarMonthPages(spaceId: string | null, month: string) {
    const { cache, cacheVersion, prefetch } = useCalendarStore();
    useEffect(() => {
        if (spaceId) {
            for (const offset of [-1, 1]) {
                const pageMonth = offsetMonth(month, offset);
                const { from, to } = monthWindow(pageMonth);
                void prefetch(spaceId, from, to).catch(() => {
                    // The normal store reports load failures when navigating to
                    // that month. A failed preview retries after refresh/reconnect.
                });
            }
        }
    }, [spaceId, month, cacheVersion, prefetch]);
    const pages: Record<string, CalendarOccurrence[]> = {};
    if (spaceId) for (const offset of [-1, 1]) {
        const pageMonth = offsetMonth(month, offset);
        const { from, to } = monthWindow(pageMonth);
        const window = cache[calendarWindowKey(spaceId, from, to)];
        if (window) pages[pageMonth] = window.occurrences;
    }
    return pages;
}
