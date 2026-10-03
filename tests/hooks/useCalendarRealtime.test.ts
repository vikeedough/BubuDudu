import { act, renderHook } from "@testing-library/react-native";

import { supabase } from "@/api/clients/supabaseClient";
import { useCalendarRealtime } from "@/hooks/useCalendarRealtime";
import { useCalendarStore } from "@/stores/CalendarStore";

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
