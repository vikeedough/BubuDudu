import { create } from "zustand";

import { deleteCalendarEvent, fetchCalendar, saveCalendarEvent, saveCalendarException } from "@/api/endpoints/calendar";
import { getIsOnline } from "@/utils/offline/network";

import type { CalendarDraft, CalendarEvent, CalendarException, CalendarOccurrence } from "@/types/calendar";

interface CalendarState {
    spaceId: string | null;
    from: string;
    to: string;
    events: CalendarEvent[];
    exceptions: CalendarException[];
    loading: boolean;
    error: string | null;
    load: (spaceId: string, from: string, to: string) => Promise<void>;
    refresh: () => Promise<void>;
    save: (draft: CalendarDraft, event?: CalendarEvent, occurrence?: CalendarOccurrence) => Promise<void>;
    remove: (event: CalendarEvent, occurrence?: CalendarOccurrence) => Promise<void>;
    clear: () => void;
}
let request = 0;
export const useCalendarStore = create<CalendarState>((set, get) => ({
    spaceId: null, from: "", to: "", events: [], exceptions: [], loading: false, error: null,
    load: async (spaceId, from, to) => {
        const sequence = ++request;
        const changed = get().spaceId !== spaceId || get().from !== from || get().to !== to;
        set({ spaceId, from, to, loading: true, error: null, ...(changed ? { events: [], exceptions: [] } : {}) });
        try {
            if (!getIsOnline()) throw new Error("Calendar needs an internet connection. Pull to refresh when you’re online.");
            const result = await fetchCalendar(spaceId, from, to);
            if (sequence === request) set(result);
        } catch (error) {
            if (sequence === request) set({ error: error instanceof Error ? error.message : "Could not load Calendar. Pull to retry." });
        } finally {
            if (sequence === request) set({ loading: false });
        }
    },
    refresh: async () => {
        const { spaceId, from, to } = get();
        if (spaceId) await get().load(spaceId, from, to);
    },
    save: async (draft, event, occurrence) => {
        const spaceId = get().spaceId;
        if (!spaceId) throw new Error("No active space.");
        if (occurrence) await saveCalendarException(spaceId, occurrence, draft);
        else await saveCalendarEvent(spaceId, draft, event?.id);
        await get().refresh();
    },
    remove: async (event, occurrence) => {
        const spaceId = get().spaceId;
        if (!spaceId) throw new Error("No active space.");
        if (occurrence) await saveCalendarException(spaceId, occurrence, null);
        else await deleteCalendarEvent(spaceId, event.id);
        await get().refresh();
    },
    clear: () => { request++; set({ spaceId: null, events: [], exceptions: [], loading: false, error: null, from: "", to: "" }); },
}));
