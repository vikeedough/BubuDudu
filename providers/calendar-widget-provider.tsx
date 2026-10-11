import { useEffect, useState } from "react";
import { AppState } from "react-native";

import { useAuthContext } from "@/hooks/useAuthContext";
import { useCalendarRealtime } from "@/hooks/useCalendarRealtime";
import { calendarWindowKey, useCalendarStore } from "@/stores/CalendarStore";
import { addDays, dateInSingapore } from "@/utils/calendar";
import { getSpaceId, subscribeToSpaceId } from "@/utils/secure-store";
import { widgetCalendarRange } from "@/widgets/calendar/snapshot";
import { publishCalendarWidget, reportWidgetError, setWidgetOwner } from "@/widgets/calendar/sync";

// Mounted under AuthProvider regardless of the selected tab. The existing
// realtime hook now has one session-wide subscriber instead of a tab subscriber.
export default function CalendarWidgetProvider() {
    const { session, isLoading } = useAuthContext();
    const userId = session?.user.id;
    const [spaceId, setSpace] = useState<string | null>(null);
    useCalendarRealtime(userId ? spaceId : null);
    useEffect(() => {
        if (isLoading) return;
        let active = true;
        let timer: ReturnType<typeof setTimeout> | undefined;
        let debounce: ReturnType<typeof setTimeout> | undefined;
        let identity: string | null | undefined;
        let ticket = 0;
        let key = "";
        let publishedWindow: object | undefined;
        let publishedDate = "";
        const sync = async () => {
            const space = userId ? await getSpaceId() : null;
            if (!active) return;
            const next = userId && space ? `${userId}:${space}` : null;
            if (identity !== next) {
                identity = next;
                publishedWindow = undefined;
                setSpace(space);
                ticket = await setWidgetOwner(next);
                if (!active || identity !== next) return;
            }
            if (!next || !space) return;
            const today = dateInSingapore();
            const { from, to } = widgetCalendarRange(today);
            key = calendarWindowKey(space, from, to);
            const version = useCalendarStore.getState().cacheVersion;
            await useCalendarStore.getState().prefetch(space, from, to);
            if (!active || identity !== next || version !== useCalendarStore.getState().cacheVersion) return;
            const window = useCalendarStore.getState().cache[key];
            if (window?.version === version && (window !== publishedWindow || today !== publishedDate)) {
                await publishCalendarWidget(window.occurrences, ticket);
                publishedWindow = window;
                publishedDate = today;
            }
        };
        let pending: Promise<void> = Promise.resolve();
        const run = () => { pending = pending.catch(reportWidgetError).then(() => active ? sync() : undefined).catch(reportWidgetError); };
        const clock = () => {
            clearTimeout(timer);
            run();
            timer = setTimeout(clock, Date.parse(addDays(dateInSingapore(), 1) + "T00:00:00+08:00") - Date.now() + 50);
        };
        const store = useCalendarStore.subscribe((state, previous) => {
            if (state.cacheVersion !== previous.cacheVersion || (key && state.cache[key] !== previous.cache[key])) {
                clearTimeout(debounce);
                debounce = setTimeout(run, 100);
            }
        });
        const space = subscribeToSpaceId(run);
        const foreground = AppState.addEventListener("change", (state) => { if (state === "active") clock(); });
        clock();
        return () => { active = false; clearTimeout(timer); clearTimeout(debounce); store(); space(); foreground.remove(); };
    }, [userId, isLoading]);
    return null;
}
