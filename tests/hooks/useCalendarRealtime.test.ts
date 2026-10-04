import { act, renderHook } from "@testing-library/react-native";
import { AppState } from "react-native";

import { supabase } from "@/api/clients/supabaseClient";
import { fetchCalendar } from "@/api/endpoints/calendar";
import { useCalendarRealtime } from "@/hooks/useCalendarRealtime";
import { useCalendarStore } from "@/stores/CalendarStore";
import { setIsOnline } from "@/utils/offline/network";

import type { CalendarEvent } from "@/types/calendar";

jest.mock("@/api/endpoints/calendar", () => ({ fetchCalendar: jest.fn() }));

it("refreshes both table changes, reconnects, and cleans up the subscription", async () => {
    jest.useFakeTimers();
    const callbacks: (() => void)[] = [];
    let statusCallback!: (status: string) => void;
    const channel: { on: jest.Mock; subscribe: jest.Mock } = { on: jest.fn((_type, _filter, fn) => { callbacks.push(fn); return channel; }), subscribe: jest.fn((fn) => { statusCallback = fn; return channel; }) };
    const client = supabase as unknown as { channel: jest.Mock; removeChannel: jest.Mock };
    client.channel = jest.fn(() => channel); client.removeChannel = jest.fn().mockResolvedValue(undefined);
    const refresh = jest.fn().mockResolvedValue(undefined);
    const original = useCalendarStore.getState().refresh;
    useCalendarStore.setState({ refresh });
    const hook = renderHook(() => useCalendarRealtime("space"));
    expect(channel.on.mock.calls.map((call) => call[1])).toEqual([
        { event: "*", schema: "public", table: "calendar_events", filter: "space_id=eq.space" },
        { event: "*", schema: "public", table: "calendar_event_exceptions", filter: "space_id=eq.space" },
    ]);
    act(() => { callbacks[0](); callbacks[1](); jest.advanceTimersByTime(200); });
    expect(refresh).toHaveBeenCalledTimes(1);
    act(() => { statusCallback("SUBSCRIBED"); jest.advanceTimersByTime(200); });
    expect(refresh).toHaveBeenCalledTimes(2);
    hook.unmount();
    expect(client.removeChannel).toHaveBeenCalledWith(channel);
    useCalendarStore.setState({ refresh: original }); jest.useRealTimers();
});

it.each(["event", "exception", "subscription", "foreground", "network"])("%s recovery refreshes the cache while retaining visible content", async (trigger) => {
    jest.useFakeTimers();
    const event: CalendarEvent = {
        id: "event", space_id: "space", created_by: "member", title: "Plan", description: null, colour: "pink",
        is_all_day: true, start_date: "2026-10-03", end_date: "2026-10-03", starts_at: null, ends_at: null,
        timezone: "Asia/Singapore", recurrence_rule: null, recurrence_end_date: null, reminder_days_before: null,
        created_at: "", updated_at: "", deleted_at: null,
    };
    const fetchMock = fetchCalendar as jest.Mock;
    const callbacks: (() => void)[] = [];
    let statusCallback!: (status: string) => void;
    let foreground!: (status: "active") => void;
    const foregroundMock = jest.spyOn(AppState, "addEventListener").mockImplementation((_type, callback) => {
        foreground = callback; return { remove: jest.fn() };
    });
    const channel: { on: jest.Mock; subscribe: jest.Mock } = {
        on: jest.fn((_type, _filter, callback) => { callbacks.push(callback); return channel; }),
        subscribe: jest.fn((callback) => { statusCallback = callback; return channel; }),
    };
    const client = supabase as unknown as { channel: jest.Mock; removeChannel: jest.Mock };
    client.channel = jest.fn(() => channel); client.removeChannel = jest.fn().mockResolvedValue(undefined);
    useCalendarStore.getState().clear(); setIsOnline(true);
    fetchMock.mockReset().mockResolvedValue({ events: [event], exceptions: [] });
    await useCalendarStore.getState().load("space", "2026-10-01", "2026-10-31");
    const version = useCalendarStore.getState().cacheVersion;
    let resolve!: (value: unknown) => void;
    fetchMock.mockReturnValueOnce(new Promise((done) => { resolve = done; }));
    const hook = renderHook(() => useCalendarRealtime("space"));
    try {
        act(() => {
            if (trigger === "event") callbacks[0]();
            else if (trigger === "exception") callbacks[1]();
            else if (trigger === "subscription") statusCallback("SUBSCRIBED");
            else if (trigger === "foreground") foreground("active");
            else { setIsOnline(false); setIsOnline(true); }
            jest.advanceTimersByTime(200);
        });
        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(useCalendarStore.getState()).toMatchObject({ cacheVersion: version + 1, events: [event], loading: false });
        await act(async () => { resolve({ events: [], exceptions: [] }); });
        expect(useCalendarStore.getState().events).toEqual([]);
    } finally {
        hook.unmount(); foregroundMock.mockRestore(); jest.useRealTimers();
    }
});
