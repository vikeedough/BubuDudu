import { act, renderHook, waitFor } from "@testing-library/react-native";

import { fetchCalendar } from "@/api/endpoints/calendar";
import { monthWindow } from "@/components/calendar/MonthCalendar";
import { useCalendarMonthPages } from "@/hooks/useCalendarMonthPages";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useCalendarStore } from "@/stores/CalendarStore";
import { setIsOnline } from "@/utils/offline/network";

import type { CalendarEvent, CalendarException } from "@/types/calendar";

// Importing the existing month-window helpers also imports the pager component.
// eslint-disable-next-line @typescript-eslint/no-require-imports
jest.mock("react-native-reanimated", () => require("../mocks/calendarPager").reanimatedMock);
jest.mock("react-native-gesture-handler", () => ({ Gesture: {}, GestureDetector: "GestureDetector" }));
jest.mock("@/api/endpoints/calendar", () => ({ fetchCalendar: jest.fn() }));
const fetchMock = fetchCalendar as jest.Mock;
const exceptions: CalendarException[] = [];
const event: CalendarEvent = {
    id: "one", space_id: "space", created_by: "member", created_at: "", updated_at: "", deleted_at: null,
    title: "Next month only", description: null, colour: "green", is_all_day: true, start_date: "2026-11-15", end_date: "2026-11-15",
    starts_at: null, ends_at: null, timezone: "Asia/Singapore", recurrence_rule: null, recurrence_end_date: null, reminder_days_before: null,
};
beforeEach(() => { useCalendarStore.getState().clear(); setIsOnline(true); fetchMock.mockReset().mockResolvedValue({ events: [event], exceptions }); });
it("prefetches two bounded windows without changing the active agenda", async () => {
    const { result, rerender } = renderHook(() => useCalendarMonthPages("space", "2026-10"));
    await waitFor(() => expect(result.current["2026-11"]).toHaveLength(1));
    expect(result.current["2026-11"][0]).toMatchObject({ title: "Next month only", colour: "green", start_date: "2026-11-15" });
    expect(result.current["2026-09"]).toEqual([]);
    expect(fetchMock.mock.calls).toEqual([["space", "2026-08-30", "2026-10-10"], ["space", "2026-11-01", "2026-12-12"]]);
    expect(useCalendarStore.getState()).toMatchObject({ spaceId: null, loading: false });
    rerender(undefined); expect(fetchMock).toHaveBeenCalledTimes(2);
});
it("shares active and neighbor windows through Oct → Nov → Dec → Nov → Oct without duplicate requests or blocking revisits", async () => {
    const load = async (month: string) => {
        const { from, to } = monthWindow(month);
        await useCalendarStore.getState().load("space", from, to);
    };
    await load("2026-10");
    const { result, rerender } = renderHook(({ month }: { month: string }) => useCalendarMonthPages("space", month), { initialProps: { month: "2026-10" } });
    await waitFor(() => expect(result.current["2026-11"]).toHaveLength(1));
    const loading: boolean[] = [];
    const unsubscribe = useCalendarStore.subscribe((state) => loading.push(state.loading));
    for (const month of ["2026-11", "2026-10", "2026-11", "2026-12", "2026-11", "2026-10"]) {
        await act(async () => { await load(month); rerender({ month }); });
        const next = month === "2026-11" ? "2026-12" : month === "2026-12" ? "2027-01" : "2026-11";
        await waitFor(() => expect(result.current[next]).toBeDefined());
    }
    unsubscribe();
    expect(loading).not.toContain(true);
    expect(fetchMock).toHaveBeenCalledTimes(5); // September through January, each exactly once.
    expect(new Set(fetchMock.mock.calls.map((args) => args.join(":"))).size).toBe(5);
});
it("marks previews stale on explicit refresh but keeps them visible until replacement arrives", async () => {
    const { result } = renderHook(() => useCalendarMonthPages("space", "2026-10"));
    await waitFor(() => expect(result.current["2026-11"]).toHaveLength(1));
    const pending: ((data: { events: CalendarEvent[]; exceptions: CalendarException[] }) => void)[] = [];
    fetchMock.mockImplementation(() => new Promise((resolve) => pending.push(resolve)));
    await act(async () => { await useCalendarStore.getState().refresh(); });
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(result.current["2026-11"]).toHaveLength(1);
    await act(async () => { pending.forEach((resolve) => resolve({ events: [], exceptions })); });
    expect(result.current["2026-11"]).toEqual([]);
});
it("isolates spaces and rejects pending private data after auth cleanup", async () => {
    const pending: ((data: { events: CalendarEvent[]; exceptions: CalendarException[] }) => void)[] = [];
    fetchMock.mockImplementation(() => new Promise((resolve) => pending.push(resolve)));
    const { result, rerender, unmount } = renderHook(({ space, month }: { space: string; month: string }) => useCalendarMonthPages(space, month), { initialProps: { space: "space", month: "2026-10" } });
    rerender({ space: "other", month: "2026-12" }); expect(result.current).toEqual({});
    await act(async () => { pending[0]({ events: [event], exceptions }); pending[1]({ events: [event], exceptions }); });
    expect(result.current).toEqual({});
    unmount(); useCalendarStore.getState().clear();
    await act(async () => { pending[2]({ events: [event], exceptions }); pending[3]({ events: [event], exceptions }); });
    expect(useCalendarStore.getState().cache).toEqual({});
});
it("skips uncached offline windows and retries on recovery refresh", async () => {
    setIsOnline(false);
    const { result, rerender } = renderHook(({ space }: { space: string | null }) => useCalendarMonthPages(space, "2026-10"), { initialProps: { space: null as string | null } });
    rerender({ space: "space" }); await act(async () => {});
    expect(fetchMock).not.toHaveBeenCalled();
    setIsOnline(true); fetchMock.mockRejectedValue(new Error("Offline preview"));
    await act(async () => { await useCalendarStore.getState().refresh(); });
    expect(result.current).toEqual({});
    fetchMock.mockResolvedValue({ events: [event], exceptions });
    await act(async () => { await useCalendarStore.getState().refresh(); });
    await waitFor(() => expect(result.current["2026-11"]).toHaveLength(1));
});
it("pull-to-refresh fetches explicitly while cached events and agenda remain visible", async () => {
    await useCalendarStore.getState().load("space", "2026-11-01", "2026-12-12");
    let resolve!: (data: { events: CalendarEvent[]; exceptions: CalendarException[] }) => void;
    fetchMock.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
    const { result } = renderHook(() => usePullToRefresh(useCalendarStore.getState().refresh));
    let refresh!: Promise<void>;
    act(() => { refresh = result.current.onRefresh(); });
    expect(result.current.refreshing).toBe(true);
    expect(useCalendarStore.getState()).toMatchObject({ loading: false, events: [event] });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await act(async () => { resolve({ events: [], exceptions }); await refresh; });
    expect(result.current.refreshing).toBe(false);
    expect(useCalendarStore.getState().events).toEqual([]);
});
