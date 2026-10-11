import { act, render, waitFor } from "@testing-library/react-native";
import { AppState } from "react-native";

import { fetchCalendar } from "@/api/endpoints/calendar";
import CalendarWidgetProvider from "@/providers/calendar-widget-provider";
import { useCalendarStore } from "@/stores/CalendarStore";
import { getSpaceId } from "@/utils/secure-store";
import { publishCalendarWidget, setWidgetOwner } from "@/widgets/calendar/sync";

import { calendarTestEvent } from "../helpers/calendar";

const mockAuth = { session: { user: { id: "member" } } as { user: { id: string } } | null, isLoading: false };
jest.mock("@/hooks/useAuthContext", () => ({ useAuthContext: () => mockAuth }));
jest.mock("@/hooks/useCalendarRealtime", () => ({ useCalendarRealtime: jest.fn() }));
jest.mock("@/api/endpoints/calendar", () => ({ fetchCalendar: jest.fn() }));
jest.mock("@/widgets/calendar/sync", () => ({ setWidgetOwner: jest.fn().mockResolvedValue(1), publishCalendarWidget: jest.fn().mockResolvedValue(undefined), reportWidgetError: jest.fn() }));

beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date("2026-08-09T00:00:00+08:00"));
    useCalendarStore.getState().clear();
    (getSpaceId as jest.Mock).mockResolvedValue("space");
    (fetchCalendar as jest.Mock).mockReset().mockResolvedValue({ events: [calendarTestEvent()], exceptions: [] });
    (publishCalendarWidget as jest.Mock).mockClear(); (setWidgetOwner as jest.Mock).mockClear();
    mockAuth.session = { user: { id: "member" } };
});
afterEach(() => jest.useRealTimers());

it("loads and publishes a bounded cache without visiting Calendar; invalidation refreshes it", async () => {
    const view = render(<CalendarWidgetProvider />);
    await waitFor(() => expect(publishCalendarWidget).toHaveBeenCalled());
    expect(setWidgetOwner).toHaveBeenCalledWith("member:space");
    expect(fetchCalendar).toHaveBeenCalledWith("space", "2026-07-26", "2026-10-07");
    expect(useCalendarStore.getState().spaceId).toBeNull();
    (fetchCalendar as jest.Mock).mockResolvedValue({ events: [calendarTestEvent({ title: "Changed plan" })], exceptions: [] });
    await act(async () => { await useCalendarStore.getState().refresh(); jest.advanceTimersByTime(150); });
    await waitFor(() => expect(publishCalendarWidget).toHaveBeenLastCalledWith([expect.objectContaining({ title: "Changed plan" })], 1));
    view.unmount();
});
it("does not publish an in-flight cache response after the session signs out", async () => {
    let resolve!: (value: unknown) => void;
    (fetchCalendar as jest.Mock).mockImplementation(() => new Promise((done) => { resolve = done; }));
    const view = render(<CalendarWidgetProvider />);
    await waitFor(() => expect(fetchCalendar).toHaveBeenCalled());
    mockAuth.session = null;
    view.rerender(<CalendarWidgetProvider />);
    await waitFor(() => expect(setWidgetOwner).toHaveBeenCalledWith(null));
    await act(async () => { resolve({ events: [calendarTestEvent()], exceptions: [] }); });
    expect(publishCalendarWidget).not.toHaveBeenCalled();
    view.unmount();
});
it("rebuilds the bounded window on Singapore month rollover/foreground", async () => {
    let foreground!: (state: "active") => void;
    const listener = jest.spyOn(AppState, "addEventListener").mockImplementation((_event, callback) => { foreground = callback; return { remove: jest.fn() }; });
    const view = render(<CalendarWidgetProvider />);
    await waitFor(() => expect(publishCalendarWidget).toHaveBeenCalled());
    jest.setSystemTime(new Date("2026-08-31T16:00:00Z"));
    await act(async () => foreground("active"));
    await waitFor(() => expect(fetchCalendar).toHaveBeenCalledWith("space", "2026-08-30", "2026-11-07"));
    view.unmount(); listener.mockRestore();
});
