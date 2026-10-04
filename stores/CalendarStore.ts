import { create } from "zustand";

import { changeCalendarFuture, deleteCalendarEvent, fetchCalendar, saveCalendarEvent, saveCalendarException } from "@/api/endpoints/calendar";
import { expandOccurrences } from "@/utils/calendar";
import { getIsOnline } from "@/utils/offline/network";

import type { CalendarDraft, CalendarEvent, CalendarException, CalendarOccurrence, CalendarScope } from "@/types/calendar";

interface CalendarWindow {
    events: CalendarEvent[];
    exceptions: CalendarException[];
    occurrences: CalendarOccurrence[];
    version: number;
}
export const calendarWindowKey = (spaceId: string, from: string, to: string) => `${spaceId}:${from}:${to}`;
interface CalendarState {
    spaceId: string | null;
    from: string;
    to: string;
    events: CalendarEvent[];
    exceptions: CalendarException[];
    loading: boolean;
    error: string | null;
    cache: Record<string, CalendarWindow>;
    cacheVersion: number;
    prefetch: (spaceId: string, from: string, to: string) => Promise<void>;
    load: (spaceId: string, from: string, to: string) => Promise<void>;
    refresh: () => Promise<void>;
    save: (draft: CalendarDraft, event?: CalendarEvent, occurrence?: CalendarOccurrence, scope?: CalendarScope) => Promise<void>;
    remove: (event: CalendarEvent, occurrence?: CalendarOccurrence, scope?: CalendarScope) => Promise<void>;
    clear: () => void;
}
let request = 0;
const pending = new Map<string, { version: number; promise: Promise<CalendarWindow> }>();
export const useCalendarStore = create<CalendarState>((set, get) => {
    const fetchWindow = (spaceId: string, from: string, to: string): Promise<CalendarWindow> => {
        const key = calendarWindowKey(spaceId, from, to);
        const { cache, cacheVersion: version } = get();
        if (cache[key]?.version === version) return Promise.resolve(cache[key]);
        if (pending.get(key)?.version === version) return pending.get(key)!.promise;
        if (!getIsOnline()) return Promise.reject(new Error("Calendar needs an internet connection. Pull to refresh when you’re online."));
        const entry = { version, promise: fetchCalendar(spaceId, from, to).then((data) => {
            const window = { ...data, occurrences: expandOccurrences(data.events, data.exceptions, from, to), version };
            // Auth cleanup/invalidation must never accept an older response.
            if (get().cacheVersion === version) set((state) => ({ cache: { ...state.cache, [key]: window } }));
            return window;
        }).finally(() => { if (pending.get(key) === entry) pending.delete(key); }) };
        pending.set(key, entry);
        return entry.promise;
    };
    return {
    spaceId: null, from: "", to: "", events: [], exceptions: [], loading: false, error: null,
    cache: {}, cacheVersion: 0,
    prefetch: async (spaceId, from, to) => { await fetchWindow(spaceId, from, to); },
    load: async (spaceId, from, to) => {
        const sequence = ++request;
        const cached = get().cache[calendarWindowKey(spaceId, from, to)];
        set({ spaceId, from, to, loading: !cached, error: null, events: cached?.events ?? [], exceptions: cached?.exceptions ?? [] });
        if (cached?.version === get().cacheVersion) return;
        try {
            const result = await fetchWindow(spaceId, from, to);
            if (sequence === request && result.version === get().cacheVersion) set({ events: result.events, exceptions: result.exceptions });
        } catch (error) {
            if (sequence === request) set({ error: error instanceof Error ? error.message : "Could not load Calendar. Pull to retry." });
        } finally {
            if (sequence === request) set({ loading: false });
        }
    },
    refresh: async () => {
        const { spaceId, from, to } = get();
        // Recurrence/exception edits can affect arbitrary ranges. Keep snapshots
        // visible, mark them stale, and revalidate only active/needed windows.
        set((state) => ({ cacheVersion: state.cacheVersion + 1 }));
        if (spaceId) await get().load(spaceId, from, to);
    },
    save: async (draft, event, occurrence, scope) => {
        const spaceId = get().spaceId;
        if (!spaceId) throw new Error("No active space.");
        if (scope === "future") {
            if (!event || !occurrence) throw new Error("Choose a recurring occurrence.");
            await changeCalendarFuture(spaceId, event, occurrence, draft);
        }
        else if (occurrence) await saveCalendarException(spaceId, occurrence, draft);
        else await saveCalendarEvent(spaceId, draft, event?.id);
        await get().refresh();
    },
    remove: async (event, occurrence, scope) => {
        const spaceId = get().spaceId;
        if (!spaceId) throw new Error("No active space.");
        if (scope === "future") {
            if (!occurrence) throw new Error("Choose a recurring occurrence.");
            await changeCalendarFuture(spaceId, event, occurrence, null);
        }
        else if (occurrence) await saveCalendarException(spaceId, occurrence, null);
        else await deleteCalendarEvent(spaceId, event.id);
        await get().refresh();
    },
    clear: () => {
        request++; pending.clear();
        set((state) => ({ spaceId: null, events: [], exceptions: [], loading: false, error: null, from: "", to: "", cache: {}, cacheVersion: state.cacheVersion + 1 }));
    },
    };
});
