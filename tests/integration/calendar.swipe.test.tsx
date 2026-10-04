import { act, fireEvent, render, waitFor, within } from "@testing-library/react-native";
import React from "react";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";

import { fetchCalendar } from "@/api/endpoints/calendar";
import CalendarScreen from "@/app/(tabs)/(calendar)/calendar";
import MonthCalendar, { monthSwipeDirection, offsetMonth } from "@/components/calendar/MonthCalendar";
import { Colors } from "@/constants/colors";
import { getSpaceId } from "@/utils/secure-store";

import { pagerAnimation } from "../mocks/calendarPager";

import type { CalendarEvent, CalendarOccurrence } from "@/types/calendar";

type PanEvent = { translationX: number; translationY: number; velocityX: number };
const mockPan: Record<string, jest.Mock> = {};
const mockHandlers: { start?: () => void; update?: (e: PanEvent) => void; end?: (e: PanEvent, success: boolean) => void; finalize?: () => void } = {};
// eslint-disable-next-line @typescript-eslint/no-require-imports
jest.mock("react-native-reanimated", () => require("../mocks/calendarPager").reanimatedMock);
jest.mock("react-native-gesture-handler", () => ({
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    ScrollView: require("react-native").ScrollView,
    GestureDetector: ({ children }: { children: React.ReactNode }) => children,
    Gesture: { Native: () => ({ simultaneousWithExternalGesture: jest.fn() }), Pan: () => {
        for (const name of ["enabled", "maxPointers", "activeOffsetX", "failOffsetY"]) mockPan[name] = jest.fn(() => mockPan);
        for (const [method, key] of [["onStart", "start"], ["onUpdate", "update"], ["onEnd", "end"], ["onFinalize", "finalize"]] as const) {
            mockPan[method] = jest.fn((handler) => { mockHandlers[key] = handler; return mockPan; });
        }
        return mockPan;
    } },
}));
// eslint-disable-next-line @typescript-eslint/no-require-imports
jest.mock("react-native-safe-area-context", () => ({ SafeAreaView: require("react-native").View }));
jest.mock("@/assets/svgs/plus.svg", () => "SvgMock");
jest.mock("@/hooks/useAuthContext", () => ({ useAuthContext: () => ({ session: { user: { id: "member" } } }) }));
jest.mock("@/hooks/useCalendarRealtime", () => ({ useCalendarRealtime: jest.fn() }));
jest.mock("@/hooks/usePullToRefresh", () => ({ usePullToRefresh: () => ({ refreshing: false, onRefresh: jest.fn() }) }));
jest.mock("@/api/endpoints/calendar", () => ({ fetchCalendar: jest.fn().mockResolvedValue({ events: [], exceptions: [] }) }));
const mockState = { events: [] as CalendarEvent[], exceptions: [], loading: false, error: null, load: jest.fn(), refresh: jest.fn(), save: jest.fn(), remove: jest.fn(), clear: jest.fn() };
jest.mock("@/stores/CalendarStore", () => ({ useCalendarStore: () => mockState }));
const event: CalendarEvent = {
    id: "one", space_id: "space", created_by: "member", created_at: "", updated_at: "", deleted_at: null,
    title: "Plan", description: null, colour: "green", is_all_day: true, start_date: "2026-10-05", end_date: "2026-10-05",
    starts_at: null, ends_at: null, timezone: "Asia/Singapore", recurrence_rule: null, recurrence_end_date: null, reminder_days_before: null,
};
function measure(view: ReturnType<typeof render>, width = 320) {
    fireEvent(view.getByTestId("calendar-month-viewport"), "layout", { nativeEvent: { layout: { width } } });
}
function drag(x: number, y = 0, velocityX = 0, success = true) {
    const e = { translationX: x, translationY: y, velocityX };
    act(() => { mockHandlers.start!(); mockHandlers.update!(e); mockHandlers.end!(e, success); mockHandlers.finalize!(); });
}
beforeEach(() => { pagerAnimation.reset(); mockState.events = []; mockState.load.mockClear(); });
it("prepares three equal-width clipped 42-day grids, preserving indicators and year boundaries", () => {
    const occurrence: CalendarOccurrence = { ...event, event_id: event.id, key: "one:2026-10-05", original_date: "2026-10-05", is_exception: false };
    const nextOccurrence: CalendarOccurrence = { ...occurrence, key: "next:2026-11-15", event_id: "next", original_date: "2026-11-15", start_date: "2026-11-15", end_date: "2026-11-15", colour: "pink" };
    const view = render(<MonthCalendar month="2026-10" selected="2026-10-05" occurrences={[occurrence]} adjacentOccurrences={{ "2026-09": [], "2026-11": [nextOccurrence] }} onMonth={jest.fn()} onSelect={jest.fn()} />);
    measure(view);
    for (const month of ["2026-09", "2026-10", "2026-11"]) {
        const page = view.getByTestId(`calendar-month-page-${month}`, { includeHiddenElements: true });
        expect(within(page).getAllByRole("button", { includeHiddenElements: true })).toHaveLength(42);
        expect(StyleSheet.flatten(view.getByTestId(`calendar-page-slot-${month}`, { includeHiddenElements: true }).props.style).width).toBe(320);
    }
    expect(StyleSheet.flatten(view.getByTestId("calendar-month-viewport").props.style).overflow).toBe("hidden");
    expect(pagerAnimation.style().transform[0].translateX).toBe(-320);
    const cell = view.getByLabelText("2026-10-05, 1 events");
    expect(cell.props.accessibilityState.selected).toBe(true);
    expect(cell.findAll((node: { props: { style?: StyleProp<ViewStyle> } }) => StyleSheet.flatten(node.props.style)?.backgroundColor === Colors.green).length).toBeGreaterThan(0);
    const nextCell = view.getByLabelText("2026-11-15, 1 events", { includeHiddenElements: true });
    expect(nextCell.findAll((node: { props: { style?: StyleProp<ViewStyle> } }) => StyleSheet.flatten(node.props.style)?.backgroundColor === Colors.pink).length).toBeGreaterThan(0);
    expect(offsetMonth("2027-01", -1)).toBe("2026-12"); expect(offsetMonth("2026-12", 1)).toBe("2027-01");
});
it("follows a held finger continuously before release without committing, and blocks arrows during pan", () => {
    const onMonth = jest.fn();
    const view = render(<MonthCalendar month="2026-10" selected="2026-10-05" occurrences={[]} onMonth={onMonth} onSelect={jest.fn()} />);
    measure(view); act(() => mockHandlers.start!());
    act(() => mockHandlers.update!({ translationX: 80, translationY: 1, velocityX: 0 }));
    expect(pagerAnimation.style().transform[0].translateX).toBe(-240);
    act(() => mockHandlers.update!({ translationX: 160, translationY: 2, velocityX: 0 }));
    expect(pagerAnimation.style().transform[0].translateX).toBe(-160);
    expect(onMonth).not.toHaveBeenCalled(); expect(pagerAnimation.completions).toHaveLength(0);
    fireEvent.press(view.getByLabelText("Next month")); expect(pagerAnimation.completions).toHaveLength(0);
    act(() => mockHandlers.finalize!()); act(() => pagerAnimation.finish());
    expect(onMonth).not.toHaveBeenCalled(); expect(pagerAnimation.style().transform[0].translateX).toBe(-320);
});
it.each([[-160, 0, 1], [160, 0, -1], [-25, -700, 1], [25, 700, -1]])("commits x=%s v=%s once after completion", (x, velocity, direction) => {
    const onMonth = jest.fn();
    const view = render(<MonthCalendar month="2026-10" selected="2026-10-05" occurrences={[]} onMonth={onMonth} onSelect={jest.fn()} />);
    measure(view); drag(x, 2, velocity); expect(onMonth).not.toHaveBeenCalled();
    const completion = pagerAnimation.completions[0];
    act(() => pagerAnimation.finish()); act(() => completion(true));
    expect(onMonth.mock.calls).toEqual([[direction]]);
    drag(x, 0, velocity); fireEvent.press(view.getByLabelText("Next month"));
    expect(pagerAnimation.completions).toHaveLength(0); expect(onMonth).toHaveBeenCalledTimes(1);
});
it.each([[50, 0, 0, true], [5, 0, 9999, true], [80, 100, 9999, true], [160, 0, 0, false]])("snap-back x=%s y=%s v=%s success=%s leaves selection unchanged", (x, y, v, success) => {
    const onMonth = jest.fn(), onSelect = jest.fn();
    const view = render(<MonthCalendar month="2026-10" selected="2026-10-05" occurrences={[]} onMonth={onMonth} onSelect={onSelect} />);
    measure(view); drag(x, y, v, success); act(() => pagerAnimation.finish());
    expect(onMonth).not.toHaveBeenCalled(); expect(onSelect).not.toHaveBeenCalled();
    expect(view.getByLabelText("2026-10-05, 0 events").props.accessibilityState.selected).toBe(true);
    expect(pagerAnimation.style().transform[0].translateX).toBe(-320);
    expect(mockPan.activeOffsetX).toHaveBeenCalledWith([-16, 16]); expect(mockPan.failOffsetY).toHaveBeenCalledWith([-16, 16]);
});
it("commits arrows/swipes coherently, rejects rapid input, and rebuilds centered neighbors", async () => {
    jest.useFakeTimers(); jest.setSystemTime(new Date("2026-10-05T01:00:00Z"));
    (getSpaceId as jest.Mock).mockResolvedValue("space"); mockState.events = [event];
    const view = render(<CalendarScreen />);
    await waitFor(() => expect(view.getByLabelText("Add event")).not.toBeDisabled()); measure(view);
    expect(view.getByLabelText("Open Plan")).toBeTruthy(); const loads = mockState.load.mock.calls.length;
    const previews = (fetchCalendar as jest.Mock).mock.calls.length;
    drag(-160); expect(view.getByLabelText("Open Plan")).toBeTruthy(); expect(mockState.load).toHaveBeenCalledTimes(loads);
    expect(fetchCalendar).toHaveBeenCalledTimes(previews);
    drag(-160); fireEvent.press(view.getByLabelText("Next month")); expect(pagerAnimation.completions).toHaveLength(1);
    act(() => pagerAnimation.finish());
    expect(view.getByText("November 2026")).toBeTruthy();
    expect(view.getByLabelText("2026-11-01, 0 events").props.accessibilityState.selected).toBe(true);
    expect(view.getByText("Sunday, 1 November")).toBeTruthy(); expect(view.queryByLabelText("Open Plan")).toBeNull();
    expect(pagerAnimation.style().transform[0].translateX).toBe(-320);
    expect(view.getByTestId("calendar-month-page-2026-12", { includeHiddenElements: true })).toBeTruthy();
    expect(view.queryByTestId("calendar-month-page-2026-09", { includeHiddenElements: true })).toBeNull();
    drag(-160); act(() => pagerAnimation.finish()); expect(view.getByText("December 2026")).toBeTruthy();
    drag(160); act(() => pagerAnimation.finish()); expect(view.getByText("November 2026")).toBeTruthy();
    fireEvent.press(view.getByLabelText("Previous month")); expect(view.getByText("November 2026")).toBeTruthy();
    act(() => pagerAnimation.finish()); expect(view.getByText("October 2026")).toBeTruthy();
    fireEvent.press(view.getByLabelText("Next month")); act(() => pagerAnimation.finish()); expect(view.getByText("November 2026")).toBeTruthy();
    fireEvent.press(view.getByLabelText("2026-11-05, 0 events")); expect(view.getByLabelText("2026-11-05, 0 events").props.accessibilityState.selected).toBe(true);
    drag(30); act(() => pagerAnimation.finish()); expect(view.getByLabelText("2026-11-05, 0 events").props.accessibilityState.selected).toBe(true);
});
it("ignores stale completion after external navigation, resize or unmount", () => {
    const onMonth = jest.fn(), onSelect = jest.fn();
    const view = render(<MonthCalendar month="2026-10" selected="2026-10-05" occurrences={[]} onMonth={onMonth} onSelect={onSelect} />);
    measure(view); drag(-160);
    view.rerender(<MonthCalendar month="2026-12" selected="2026-12-01" occurrences={[]} onMonth={onMonth} onSelect={onSelect} />);
    act(() => pagerAnimation.finish()); expect(onMonth).not.toHaveBeenCalled(); expect(pagerAnimation.style().transform[0].translateX).toBe(-320);
    drag(-160); measure(view, 400); act(() => pagerAnimation.finish()); expect(onMonth).not.toHaveBeenCalled();
    expect(pagerAnimation.style().transform[0].translateX).toBe(-400);
    drag(-200); view.unmount(); act(() => pagerAnimation.finish()); expect(onMonth).not.toHaveBeenCalled();
});
it.each([
    [-90, 0, 0, 320, 1], [90, 0, 0, 320, -1], [-20, 0, -640, 320, 1], [20, 0, 640, 320, -1],
    [19, 0, 9999, 320, 0], [89, 0, 639, 320, 0], [100, 100, 9999, 320, 0], [10, 0, 100, 0, 0],
    [-180, 0, 0, 640, 1], [-90, 0, 0, 640, 0], [40, 0, 1280, 640, -1],
])("width-relative decision x=%s y=%s v=%s width=%s returns %s", (x, y, velocity, width, expected) => {
    expect(monthSwipeDirection(x, y, velocity, width)).toBe(expected);
});
