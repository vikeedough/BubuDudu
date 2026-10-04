import { act } from "@testing-library/react-native";

import { changeCalendarFuture, deleteCalendarEvent, fetchCalendar, saveCalendarEvent, saveCalendarException } from "@/api/endpoints/calendar";
import { calendarWindowKey, useCalendarStore } from "@/stores/CalendarStore";
import { setIsOnline } from "@/utils/offline/network";

import type { CalendarDraft, CalendarEvent, CalendarOccurrence } from "@/types/calendar";

jest.mock("@/api/endpoints/calendar", () => ({ changeCalendarFuture: jest.fn(), fetchCalendar: jest.fn(), saveCalendarEvent: jest.fn(), saveCalendarException: jest.fn(), deleteCalendarEvent: jest.fn() }));
const fetchMock = fetchCalendar as jest.Mock;
const draft: CalendarDraft = { title: "Plan", description: null, colour: "pink", is_all_day: true, start_date: "2026-10-03", end_date: "2026-10-03", starts_at: null, ends_at: null, timezone: "Asia/Singapore", recurrence_rule: "FREQ=WEEKLY", recurrence_end_date: null, reminder_days_before: null };
const master: CalendarEvent = { ...draft, id: "event", space_id: "space", created_by: "creator", created_at: "", updated_at: "", deleted_at: null };
const occurrence: CalendarOccurrence = { ...draft, key: "event:2026-10-03", event_id: "event", original_date: "2026-10-03", is_exception: false };
beforeEach(() => { jest.clearAllMocks(); useCalendarStore.getState().clear(); setIsOnline(true); fetchMock.mockResolvedValue({ events: [master], exceptions: [] }); });
it("routes single-occurrence edits/deletes separately from series edits/deletes", async () => {
    const state = useCalendarStore.getState();
    await state.load("space", "2026-10-01", "2026-10-31");
    await state.save(draft, master, occurrence);
    expect(saveCalendarException).toHaveBeenCalledWith("space", occurrence, draft);
    expect(saveCalendarEvent).not.toHaveBeenCalled();
    await state.save(draft, master);
    expect(saveCalendarEvent).toHaveBeenCalledWith("space", draft, "event");
    await state.remove(master, occurrence);
    expect(saveCalendarException).toHaveBeenCalledWith("space", occurrence, null);
    await state.remove(master);
    expect(deleteCalendarEvent).toHaveBeenCalledWith("space", "event");
});
it("drops stale requests when navigating or changing space", async () => {
    let resolve!: (value: unknown) => void;
    fetchMock.mockReturnValueOnce(new Promise((done) => { resolve = done; }));
    const pending = useCalendarStore.getState().load("old-space", "2026-10-01", "2026-10-31");
    fetchMock.mockResolvedValueOnce({ events: [], exceptions: [] });
    await useCalendarStore.getState().load("new-space", "2026-11-01", "2026-11-30");
    resolve({ events: [master], exceptions: [] }); await pending;
    expect(useCalendarStore.getState()).toMatchObject({ spaceId: "new-space", events: [] });
});
it("routes future edits and deletes to the atomic RPC, then refreshes both masters and exceptions", async () => {
    const state = useCalendarStore.getState();
    await state.load("space", "2026-10-01", "2026-10-31");
    fetchMock.mockClear();
    await state.save(draft, master, occurrence, "future");
    expect(changeCalendarFuture).toHaveBeenCalledWith("space", master, occurrence, draft);
    await state.remove(master, occurrence, "future");
    expect(changeCalendarFuture).toHaveBeenLastCalledWith("space", master, occurrence, null);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(saveCalendarEvent).not.toHaveBeenCalled();
    expect(saveCalendarException).not.toHaveBeenCalled();
    expect(deleteCalendarEvent).not.toHaveBeenCalled();
});
it("surfaces atomic split failure without issuing compensating client writes", async () => {
    await useCalendarStore.getState().load("space", "2026-10-01", "2026-10-31");
    (changeCalendarFuture as jest.Mock).mockRejectedValueOnce(new Error("Refresh Calendar"));
    await expect(useCalendarStore.getState().save(draft, master, occurrence, "future")).rejects.toThrow("Refresh Calendar");
    expect(saveCalendarEvent).not.toHaveBeenCalled();
});
it("clears private data on auth cleanup and displays offline errors", async () => {
    await useCalendarStore.getState().load("space", "2026-10-01", "2026-10-31");
    act(() => useCalendarStore.getState().clear());
    expect(useCalendarStore.getState().events).toEqual([]);
    setIsOnline(false);
    await useCalendarStore.getState().load("space", "2026-10-01", "2026-10-31");
    expect(useCalendarStore.getState().error).toContain("internet connection");
});
it("loads a new window, then immediately reuses cached events, exceptions and occurrences", async () => {
    let resolve!: (value: unknown) => void;
    fetchMock.mockReturnValueOnce(new Promise((done) => { resolve = done; }));
    const state = useCalendarStore.getState();
    const first = state.load("space", "2026-10-01", "2026-10-31");
    expect(useCalendarStore.getState().loading).toBe(true);
    resolve({ events: [master], exceptions: [] }); await first;
    const cached = useCalendarStore.getState().cache[calendarWindowKey("space", "2026-10-01", "2026-10-31")];
    expect(cached.occurrences).toHaveLength(5);
    await state.load("space", "2026-11-01", "2026-11-30");
    const revisit = state.load("space", "2026-10-01", "2026-10-31");
    expect(useCalendarStore.getState()).toMatchObject({ loading: false, events: cached.events, exceptions: cached.exceptions });
    await revisit;
    expect(fetchMock).toHaveBeenCalledTimes(2);
});
it("deduplicates an in-flight prefetch and active load for the same window", async () => {
    let resolve!: (value: unknown) => void;
    fetchMock.mockReturnValueOnce(new Promise((done) => { resolve = done; }));
    const state = useCalendarStore.getState();
    const prefetch = state.prefetch("space", "2026-10-01", "2026-10-31");
    const load = state.load("space", "2026-10-01", "2026-10-31");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    resolve({ events: [master], exceptions: [] }); await Promise.all([prefetch, load]);
    expect(useCalendarStore.getState()).toMatchObject({ loading: false, events: [master] });
});
it.each(["create", "series edit", "exception edit", "split", "series delete", "exception delete", "future delete"])("%s invalidates cached windows without wiping snapshots", async (mutation) => {
    const state = useCalendarStore.getState();
    await state.load("space", "2026-10-01", "2026-10-31");
    await state.load("space", "2026-11-01", "2026-11-30");
    await state.load("space", "2026-10-01", "2026-10-31");
    const key = calendarWindowKey("space", "2026-11-01", "2026-11-30");
    const cached = useCalendarStore.getState().cache[key];
    if (mutation === "create") await state.save(draft);
    else if (mutation === "series edit") await state.save(draft, master);
    else if (mutation === "exception edit") await state.save(draft, master, occurrence);
    else if (mutation === "split") await state.save(draft, master, occurrence, "future");
    else if (mutation === "series delete") await state.remove(master);
    else if (mutation === "exception delete") await state.remove(master, occurrence);
    else await state.remove(master, occurrence, "future");
    expect(useCalendarStore.getState().cache[key]).toBe(cached);
    expect(cached.version).toBeLessThan(useCalendarStore.getState().cacheVersion);
    const revisit = state.load("space", "2026-11-01", "2026-11-30");
    expect(useCalendarStore.getState()).toMatchObject({ loading: false, events: cached.events });
    await revisit;
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(useCalendarStore.getState().cache[key].version).toBe(useCalendarStore.getState().cacheVersion);
});
it("keeps cached content after refresh failure and reuses valid cached windows offline", async () => {
    const state = useCalendarStore.getState();
    await state.load("space", "2026-10-01", "2026-10-31");
    setIsOnline(false);
    await state.load("space", "2026-10-01", "2026-10-31");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(useCalendarStore.getState()).toMatchObject({ loading: false, events: [master], error: null });
    await state.refresh();
    expect(useCalendarStore.getState()).toMatchObject({ loading: false, events: [master] });
    expect(useCalendarStore.getState().error).toContain("internet connection");
    setIsOnline(true); fetchMock.mockRejectedValueOnce(new Error("Refresh failed"));
    await state.refresh();
    expect(useCalendarStore.getState()).toMatchObject({ loading: false, events: [master], error: "Refresh failed" });
});
it("rejects stale in-flight cache writes after clear without disturbing a newer request", async () => {
    let oldResolve!: (value: unknown) => void, newResolve!: (value: unknown) => void;
    fetchMock.mockReturnValueOnce(new Promise((done) => { oldResolve = done; })).mockReturnValueOnce(new Promise((done) => { newResolve = done; }));
    const state = useCalendarStore.getState();
    const old = state.prefetch("space", "2026-10-01", "2026-10-31");
    state.clear();
    const fresh = state.prefetch("space", "2026-10-01", "2026-10-31");
    oldResolve({ events: [master], exceptions: [] }); await old;
    expect(useCalendarStore.getState().cache).toEqual({});
    const load = state.load("space", "2026-10-01", "2026-10-31");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    newResolve({ events: [], exceptions: [] }); await Promise.all([fresh, load]);
    expect(Object.keys(useCalendarStore.getState().cache)).toHaveLength(1);
    expect(useCalendarStore.getState()).toMatchObject({ loading: false, events: [] });
});
