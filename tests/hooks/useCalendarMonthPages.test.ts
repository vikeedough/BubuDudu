import { act, renderHook, waitFor } from "@testing-library/react-native";

import { fetchCalendar } from "@/api/endpoints/calendar";
import { useCalendarMonthPages } from "@/hooks/useCalendarMonthPages";
import { setIsOnline } from "@/utils/offline/network";

import type { CalendarEvent, CalendarException } from "@/types/calendar";

// Importing the existing month-window helpers also imports the pager component.
// eslint-disable-next-line @typescript-eslint/no-require-imports
jest.mock("react-native-reanimated", () => require("../mocks/calendarPager").reanimatedMock);
jest.mock("react-native-gesture-handler", () => ({ Gesture: {}, GestureDetector: "GestureDetector" }));
jest.mock("@/api/endpoints/calendar", () => ({ fetchCalendar: jest.fn() }));
const fetchMock = fetchCalendar as jest.Mock;
const events: CalendarEvent[] = [], exceptions: CalendarException[] = [];
const event: CalendarEvent = {
    id: "one", space_id: "space", created_by: "member", created_at: "", updated_at: "", deleted_at: null,
    title: "Next month only", description: null, colour: "green", is_all_day: true, start_date: "2026-11-15", end_date: "2026-11-15",
    starts_at: null, ends_at: null, timezone: "Asia/Singapore", recurrence_rule: null, recurrence_end_date: null, reminder_days_before: null,
};
beforeEach(() => { setIsOnline(true); fetchMock.mockReset().mockResolvedValue({ events: [event], exceptions }); });
it("prefetches two bounded windows and includes events outside the authoritative current-month range", async () => {
    const { result, rerender } = renderHook(() => useCalendarMonthPages("space", "2026-10", events, exceptions));
    await waitFor(() => expect(result.current["2026-11"]).toHaveLength(1));
    expect(result.current["2026-11"][0]).toMatchObject({ title: "Next month only", colour: "green", start_date: "2026-11-15" });
    expect(result.current["2026-09"]).toEqual([]);
    expect(fetchMock.mock.calls).toEqual([["space", "2026-08-30", "2026-10-10"], ["space", "2026-11-01", "2026-12-12"]]);
    rerender(undefined); expect(fetchMock).toHaveBeenCalledTimes(2);
});
it("invalidates previews when refreshed/realtime store data changes", async () => {
    const { result, rerender } = renderHook(({ masters }: { masters: CalendarEvent[] }) => useCalendarMonthPages("space", "2026-10", masters, exceptions), { initialProps: { masters: events } });
    await waitFor(() => expect(result.current["2026-11"]).toHaveLength(1));
    fetchMock.mockResolvedValue({ events: [], exceptions });
    rerender({ masters: [event] });
    await waitFor(() => expect(result.current["2026-11"]).toEqual([]));
    expect(fetchMock).toHaveBeenCalledTimes(4);
});
it("ignores stale results after month/space changes and unmount", async () => {
    const pending: ((data: { events: CalendarEvent[]; exceptions: CalendarException[] }) => void)[] = [];
    fetchMock.mockImplementation(() => new Promise((resolve) => pending.push(resolve)));
    const { result, rerender, unmount } = renderHook(({ space, month }: { space: string; month: string }) => useCalendarMonthPages(space, month, events, exceptions), { initialProps: { space: "space", month: "2026-10" } });
    rerender({ space: "other", month: "2026-12" }); expect(result.current).toEqual({});
    await act(async () => { pending[0]({ events: [event], exceptions }); pending[1]({ events: [event], exceptions }); });
    expect(result.current).toEqual({});
    await act(async () => { pending[2]({ events: [], exceptions }); pending[3]({ events: [], exceptions }); });
    expect(Object.keys(result.current).sort()).toEqual(["2026-11", "2027-01"]);
    rerender({ space: "other", month: "2027-01" }); unmount();
    await act(async () => { pending[4]({ events: [event], exceptions }); pending[5]({ events: [event], exceptions }); });
});
it("skips prefetch without membership/connection and retries failed previews on refresh", async () => {
    setIsOnline(false);
    const { result, rerender } = renderHook(({ space, masters }: { space: string | null; masters: CalendarEvent[] }) => useCalendarMonthPages(space, "2026-10", masters, exceptions), { initialProps: { space: null as string | null, masters: events } });
    rerender({ space: "space", masters: events }); expect(fetchMock).not.toHaveBeenCalled();
    setIsOnline(true); fetchMock.mockRejectedValue(new Error("Offline preview"));
    rerender({ space: "space", masters: [event] }); await act(async () => {}); expect(result.current).toEqual({});
    fetchMock.mockResolvedValue({ events: [event], exceptions });
    rerender({ space: "space", masters: [] }); await waitFor(() => expect(result.current["2026-11"]).toHaveLength(1));
});
