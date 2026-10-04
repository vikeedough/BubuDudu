import { useEffect, useState } from "react";

import { fetchCalendar } from "@/api/endpoints/calendar";
import { monthWindow, offsetMonth } from "@/components/calendar/MonthCalendar";
import { expandOccurrences } from "@/utils/calendar";
import { getIsOnline } from "@/utils/offline/network";

import type { CalendarEvent, CalendarException, CalendarOccurrence } from "@/types/calendar";

// Prefetch only two bounded 42-day grids. Authoritative agenda/store loading and
// recurrence expansion are unchanged; no requests are made on pan frames.
export function useCalendarMonthPages(spaceId: string | null, month: string, events: CalendarEvent[], exceptions: CalendarException[]) {
    const key = `${spaceId}:${month}`;
    const [cached, setCached] = useState<{ key: string; pages: Record<string, CalendarOccurrence[]> }>({ key: "", pages: {} });
    useEffect(() => {
        let active = true;
        setCached({ key, pages: {} });
        if (spaceId && getIsOnline()) {
            for (const offset of [-1, 1]) {
                const pageMonth = offsetMonth(month, offset);
                const { from, to } = monthWindow(pageMonth);
                void fetchCalendar(spaceId, from, to).then((data) => {
                    if (active) setCached((current) => ({ key, pages: { ...current.pages, [pageMonth]: expandOccurrences(data.events, data.exceptions, from, to) } }));
                }).catch(() => {
                    // The normal store reports load failures when navigating to
                    // that month. A failed preview retries after refresh/reconnect.
                });
            }
        }
        return () => { active = false; };
        // Store replacement also invalidates previews after realtime/refresh.
    }, [key, spaceId, month, events, exceptions]);
    return cached.key === key ? cached.pages : {};
}
