import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import React from "react";
import { AppState, StyleSheet } from "react-native";

import CalendarScreen from "@/app/(tabs)/(calendar)/calendar";
import CalendarHeader, { formatCalendarHeaderDate } from "@/components/calendar/CalendarHeader";
import CenteredModal from "@/components/common/CenteredModal";
import FloatingAddButton from "@/components/common/FloatingAddButton";
import { getSpaceId } from "@/utils/secure-store";

import type { CalendarEvent } from "@/types/calendar";

// eslint-disable-next-line @typescript-eslint/no-require-imports
jest.mock("react-native-safe-area-context", () => ({ SafeAreaView: require("react-native").View }));
jest.mock("@/assets/svgs/plus.svg", () => "SvgMock");
jest.mock("@/hooks/useAuthContext", () => ({ useAuthContext: () => ({ session: { user: { id: "member" } } }) }));
jest.mock("@/hooks/useCalendarRealtime", () => ({ useCalendarRealtime: jest.fn() }));
jest.mock("@/hooks/usePullToRefresh", () => ({ usePullToRefresh: () => ({ refreshing: false, onRefresh: jest.fn() }) }));
const mockState = { events: [] as CalendarEvent[], exceptions: [], loading: false, error: null,
    load: jest.fn(), refresh: jest.fn(), save: jest.fn(), remove: jest.fn(), clear: jest.fn() };
jest.mock("@/stores/CalendarStore", () => ({ useCalendarStore: () => mockState }));
const event: CalendarEvent = {
    id: "event", space_id: "space", created_by: "member", title: "Weekly plan", description: "Hidden description",
    colour: "green", is_all_day: true, start_date: "2026-10-04", end_date: "2026-10-04", starts_at: null, ends_at: null,
    timezone: "Asia/Singapore", reminder_days_before: 0, recurrence_rule: "FREQ=WEEKLY", recurrence_end_date: null, deleted_at: null, created_at: "", updated_at: "",
};
beforeEach(() => {
    jest.useFakeTimers(); jest.setSystemTime(new Date("2026-10-03T17:00:00Z"));
    mockState.events = []; mockState.save.mockReset().mockResolvedValue(undefined); mockState.remove.mockReset().mockResolvedValue(undefined);
    (getSpaceId as jest.Mock).mockResolvedValue("space");
});
it("matches Expenses title/date structure, keeps today's Singapore date on day/month changes, and opens the editor with the shared FAB", async () => {
    const view = render(<CalendarScreen />);
    await waitFor(() => expect(view.getByLabelText("Add event")).not.toBeDisabled());
    expect(view.getByText("Sunday, 4th October 2026")).toBeTruthy();
    expect(view.queryByText("Our plans, together")).toBeNull();
    expect(view.queryByText("+ Event")).toBeNull();
    expect(view.getByText("No events planned!")).toBeTruthy();
    fireEvent.press(view.getByLabelText("2026-10-05, 0 events"));
    expect(view.getByText("Sunday, 4th October 2026")).toBeTruthy();
    fireEvent.press(view.getByLabelText("Next month"));
    expect(view.getByText("Sunday, 4th October 2026")).toBeTruthy();
    fireEvent.press(view.getByLabelText("Go to today"));
    expect(view.getByLabelText("2026-10-04, 0 events").props.accessibilityState.selected).toBe(true);
    const fab = view.UNSAFE_getByType(FloatingAddButton);
    expect(fab).toBeTruthy();
    expect(StyleSheet.flatten(view.getByLabelText("Add event").props.style)).toEqual(expect.objectContaining({ width: 54, height: 54, right: 22, bottom: 120, elevation: 6 }));
    fireEvent.press(view.getByLabelText("Add event"));
    expect(view.getByText("New event")).toBeTruthy();
    fireEvent.changeText(view.getByLabelText("Event title"), "New plan");
    fireEvent.press(view.getByText("Save"));
    await waitFor(() => expect(mockState.save).toHaveBeenCalledWith(expect.objectContaining({ title: "New plan", description: null }), undefined, undefined));
});
it.each([[1, "1st"], [2, "2nd"], [3, "3rd"], [4, "4th"], [11, "11th"], [12, "12th"], [13, "13th"], [21, "21st"], [22, "22nd"], [23, "23rd"], [31, "31st"]])("formats ordinal %s correctly", (day, ordinal) => {
    expect(formatCalendarHeaderDate(`2027-01-${String(day).padStart(2, "0")}`)).toContain(`, ${ordinal} January 2027`);
});
it("updates the header at Singapore midnight and after resuming", () => {
    jest.setSystemTime(new Date("2026-10-04T15:59:00Z"));
    let resume!: (state: "active") => void;
    jest.spyOn(AppState, "addEventListener").mockImplementation((_name, listener) => {
        resume = listener; return { remove: jest.fn() };
    });
    const view = render(<CalendarHeader onToday={jest.fn()} />);
    act(() => jest.advanceTimersByTime(60000));
    expect(view.getByText("Monday, 5th October 2026")).toBeTruthy();
    jest.setSystemTime(new Date("2026-10-05T16:00:00Z"));
    act(() => resume("active"));
    expect(view.getByText("Tuesday, 6th October 2026")).toBeTruthy();
});
it.each([true, false])("recurring edit keeps this/all scope (%s), white surfaces and hides descriptions", async (single) => {
    mockState.events = [event];
    const view = render(<CalendarScreen />);
    fireEvent.press(view.getByLabelText("Open Weekly plan"));
    expect(view.queryByText("Hidden description")).toBeNull();
    expect(StyleSheet.flatten(view.UNSAFE_getByType(CenteredModal).props.containerStyle).backgroundColor).toBe("#fff");
    fireEvent.press(view.getByText("Edit"));
    fireEvent.press(view.getByText(single ? "This event" : "All events"));
    expect(view.getByText("Edit event")).toBeTruthy();
    expect(Boolean(view.queryByLabelText("Repeat"))).toBe(!single);
    fireEvent.press(view.getByText("Save"));
    await waitFor(() => expect(mockState.save).toHaveBeenCalledWith(expect.objectContaining({ recurrence_rule: "FREQ=WEEKLY", description: null, reminder_days_before: null }), event, single ? expect.objectContaining({ event_id: "event" }) : undefined));
});
it.each([true, false])("recurring delete keeps this/all scope (%s)", async (single) => {
    mockState.events = [event];
    const view = render(<CalendarScreen />);
    fireEvent.press(view.getByLabelText("Open Weekly plan"));
    fireEvent.press(view.getByText("Delete"));
    fireEvent.press(view.getByText(single ? "This event" : "All events"));
    await waitFor(() => expect(mockState.remove).toHaveBeenCalledWith(event, single ? expect.objectContaining({ event_id: "event" }) : undefined));
});
it("edits and deletes future occurrences via the third scope, with the selected occurrence as editor start", async () => {
    mockState.events = [event];
    const view = render(<CalendarScreen />);
    fireEvent.press(view.getByLabelText("2026-10-18, 1 events"));
    fireEvent.press(view.getByLabelText("Open Weekly plan")); fireEvent.press(view.getByText("Edit"));
    expect(view.getByText("This event")).toBeTruthy(); expect(view.getByText("All events")).toBeTruthy();
    fireEvent.press(view.getByText("This event and future events"));
    expect(view.getAllByText("18 Oct 2026")).toHaveLength(2);
    expect(view.getByLabelText("Repeat")).toBeTruthy();
    fireEvent.press(view.getByText("Save"));
    await waitFor(() => expect(mockState.save).toHaveBeenCalledWith(expect.objectContaining({ start_date: "2026-10-18", recurrence_end_date: null }), event, expect.objectContaining({ original_date: "2026-10-18" }), "future"));
    fireEvent.press(view.getByLabelText("Open Weekly plan")); fireEvent.press(view.getByText("Delete"));
    fireEvent.press(view.getByText("This event and future events"));
    await waitFor(() => expect(mockState.remove).toHaveBeenCalledWith(event, expect.objectContaining({ original_date: "2026-10-18" }), "future"));
});
it("nonrecurring edit opens directly; delete confirms without a scope chooser", async () => {
    mockState.events = [{ ...event, recurrence_rule: null }];
    const view = render(<CalendarScreen />);
    fireEvent.press(view.getByLabelText("Open Weekly plan")); fireEvent.press(view.getByText("Edit"));
    expect(view.getByText("Edit event")).toBeTruthy(); expect(view.queryByText("All events")).toBeNull();
    fireEvent.press(view.getByText("Cancel"));
    fireEvent.press(view.getByLabelText("Open Weekly plan")); fireEvent.press(view.getByText("Delete"));
    expect(view.queryByText("This event and future events")).toBeNull();
    fireEvent.press(view.getByText("Delete event"));
    await waitFor(() => expect(mockState.remove).toHaveBeenCalledWith(mockState.events[0], undefined));
});
