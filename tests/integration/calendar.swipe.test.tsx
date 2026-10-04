import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import React from "react";

import CalendarScreen from "@/app/(tabs)/(calendar)/calendar";
import { monthSwipeDirection } from "@/components/calendar/MonthCalendar";
import { getSpaceId } from "@/utils/secure-store";

let mockSwipe: (event: { translationX: number; translationY: number; velocityX: number }) => void;
jest.mock("react-native-gesture-handler", () => ({
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    ScrollView: require("react-native").ScrollView,
    GestureDetector: ({ children }: { children: React.ReactNode }) => children,
    Gesture: { Native: () => ({ simultaneousWithExternalGesture: jest.fn() }), Pan: () => {
        const gesture: Record<string, jest.Mock> = {};
        for (const name of ["activeOffsetX", "failOffsetY", "runOnJS"]) gesture[name] = jest.fn(() => gesture);
        gesture.onEnd = jest.fn((handler) => { mockSwipe = handler; return gesture; }); return gesture;
    } },
}));
// eslint-disable-next-line @typescript-eslint/no-require-imports
jest.mock("react-native-safe-area-context", () => ({ SafeAreaView: require("react-native").View }));
jest.mock("@/assets/svgs/plus.svg", () => "SvgMock");
jest.mock("@/hooks/useAuthContext", () => ({ useAuthContext: () => ({ session: { user: { id: "member" } } }) }));
jest.mock("@/hooks/useCalendarRealtime", () => ({ useCalendarRealtime: jest.fn() }));
jest.mock("@/hooks/usePullToRefresh", () => ({ usePullToRefresh: () => ({ refreshing: false, onRefresh: jest.fn() }) }));
const mockState = { events: [], exceptions: [], loading: false, error: null, load: jest.fn(), refresh: jest.fn(), save: jest.fn(), remove: jest.fn(), clear: jest.fn() };
jest.mock("@/stores/CalendarStore", () => ({ useCalendarStore: () => mockState }));

it("swipes through the same month/selection flow as arrows and keeps date-cell taps working", async () => {
    jest.useFakeTimers(); jest.setSystemTime(new Date("2026-10-05T01:00:00Z"));
    (getSpaceId as jest.Mock).mockResolvedValue("space");
    const view = render(<CalendarScreen />);
    await waitFor(() => expect(view.getByLabelText("Add event")).not.toBeDisabled());
    act(() => mockSwipe({ translationX: -80, translationY: 4, velocityX: -200 }));
    expect(view.getByText("November 2026")).toBeTruthy();
    expect(view.getByLabelText("2026-11-01, 0 events").props.accessibilityState.selected).toBe(true);
    expect(view.getByText("Sunday, 1 November")).toBeTruthy();
    act(() => mockSwipe({ translationX: 30, translationY: 3, velocityX: 700 }));
    expect(view.getByText("October 2026")).toBeTruthy();
    expect(view.getByLabelText("2026-10-01, 0 events").props.accessibilityState.selected).toBe(true);
    act(() => mockSwipe({ translationX: -12, translationY: 1, velocityX: -1000 }));
    act(() => mockSwipe({ translationX: -80, translationY: 90, velocityX: -700 }));
    expect(view.getByText("October 2026")).toBeTruthy();
    fireEvent.press(view.getByLabelText("2026-10-05, 0 events"));
    expect(view.getByLabelText("2026-10-05, 0 events").props.accessibilityState.selected).toBe(true);
    fireEvent.press(view.getByLabelText("Next month")); expect(view.getByText("November 2026")).toBeTruthy();
    fireEvent.press(view.getByLabelText("Previous month")); expect(view.getByText("October 2026")).toBeTruthy();
    // Tapping the adjacent-month day updates both displayed month and selected agenda.
    fireEvent.press(view.getByLabelText("2026-11-01, 0 events")); expect(view.getByText("November 2026")).toBeTruthy();
    expect(view.getByLabelText("2026-11-01, 0 events").props.accessibilityState.selected).toBe(true);
});
it.each([
    [-48, 0, 0, 1], [48, 0, 0, -1], [-24, 0, -500, 1], [24, 0, 500, -1],
    [23, 0, 9999, 0], [47, 0, 499, 0], [100, 17, 999, 0], [10, 10, 999, 0],
])("threshold x=%s y=%s v=%s returns %s", (x, y, velocity, expected) => {
    expect(monthSwipeDirection(x, y, velocity)).toBe(expected);
});
