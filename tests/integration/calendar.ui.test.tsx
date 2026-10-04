import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import React from "react";
import { ScrollView, StyleSheet } from "react-native";

import CalendarEventModal from "@/components/calendar/CalendarEventModal";
import MonthCalendar, { monthWindow } from "@/components/calendar/MonthCalendar";
import CenteredModal from "@/components/common/CenteredModal";
import PickerWheel from "@/components/common/PickerWheel";
import ExpenseDatePicker from "@/components/expenses/ExpenseDatePicker";

import type { CalendarDraft } from "@/types/calendar";

jest.mock("react-native-gesture-handler", () => ({
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    ScrollView: require("react-native").ScrollView,
    GestureDetector: ({ children }: { children: React.ReactNode }) => children,
    Gesture: { Native: () => ({ simultaneousWithExternalGesture: jest.fn() }), Pan: () => {
        const gesture: Record<string, jest.Mock> = {}; for (const name of ["activeOffsetX", "failOffsetY", "runOnJS", "onEnd"]) gesture[name] = jest.fn(() => gesture); return gesture;
    } },
}));
const initial: CalendarDraft = {
    title: "Existing plan", description: "Old private description", colour: "pink", is_all_day: false,
    starts_at: "2026-10-03T01:00:00.000Z", ends_at: "2026-10-03T02:00:00.000Z",
    start_date: null, end_date: null, timezone: "Asia/Singapore", recurrence_rule: null, recurrence_end_date: null, reminder_days_before: null,
};
function setup(value?: CalendarDraft, single = false) {
    const onSave = jest.fn().mockResolvedValue(undefined), onClose = jest.fn();
    const view = render(<CalendarEventModal initial={value} date="2026-10-03" single={single} onSave={onSave} onClose={onClose} />);
    return { view, onSave, onClose };
}
function select(view: ReturnType<typeof render>, label: string, option: string) {
    fireEvent.press(view.getByLabelText(label));
    fireEvent.press(view.getByLabelText(`${label}: ${option}`));
}
function pickWheel(view: ReturnType<typeof render>, index: number, offsetIndex: number) {
    const wheel = view.UNSAFE_getAllByType(PickerWheel)[index];
    fireEvent(wheel.findByType(ScrollView), "momentumScrollEnd", { nativeEvent: { contentOffset: { y: offsetIndex * 30 } } });
}
function expectWhite(view: ReturnType<typeof render>) {
    expect(StyleSheet.flatten(view.UNSAFE_getByType(CenteredModal).props.containerStyle).backgroundColor).toBe("#fff");
}
describe("Calendar editor", () => {
    it("saving a legacy recurring series retains null end, and Ends Cancel does not change it", async () => {
        const { view, onSave } = setup({ ...initial, recurrence_rule: "FREQ=WEEKLY" });
        fireEvent.press(view.getByLabelText("Recurrence ends"));
        fireEvent(view.getByLabelText("Never ends"), "valueChange", false);
        fireEvent.press(view.getByText("Cancel"));
        expect(view.getByText("Never ends")).toBeTruthy();
        fireEvent.press(view.getByText("Save"));
        await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ recurrence_rule: "FREQ=WEEKLY", recurrence_end_date: null })));
    });
    it.each(["Daily", "Weekly", "Every 2 weeks", "Monthly", "Yearly"])("defaults newly enabled %s to a one-year end", async (option) => {
        const { view, onSave } = setup();
        fireEvent.changeText(view.getByLabelText("Event title"), "Finite plan");
        select(view, "Repeat", option);
        expect(view.getByText("3 Oct 2027")).toBeTruthy();
        fireEvent.press(view.getByText("Save"));
        await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ recurrence_end_date: "2027-10-03" })));
    });
    it("defaults custom recurrence, permits explicit Never ends, and clears the end when Repeat becomes Never", async () => {
        const { view, onSave } = setup();
        fireEvent.changeText(view.getByLabelText("Event title"), "Plan");
        select(view, "Repeat", "Custom"); fireEvent.press(view.getByText("Confirm"));
        expect(view.getByText("3 Oct 2027")).toBeTruthy();
        fireEvent.press(view.getByLabelText("Recurrence ends")); expectWhite(view);
        fireEvent(view.getByLabelText("Never ends"), "valueChange", true);
        expect(view.queryByLabelText("Day")).toBeNull();
        fireEvent.press(view.getByText("Confirm")); fireEvent.press(view.getByText("Save"));
        await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ recurrence_end_date: null, recurrence_rule: "FREQ=WEEKLY;INTERVAL=1" })));
    });
    it("preserves legacy Never ends, validates chosen finite end, and hides/clears end when disabled", async () => {
        const { view, onSave } = setup({ ...initial, recurrence_rule: "FREQ=WEEKLY" });
        expect(view.getByText("Never ends")).toBeTruthy();
        fireEvent.press(view.getByLabelText("Recurrence ends"));
        fireEvent(view.getByLabelText("Never ends"), "valueChange", false);
        act(() => view.UNSAFE_getByType(ExpenseDatePicker).props.onChange(new Date(2026, 9, 2)));
        fireEvent.press(view.getByText("Confirm"));
        expect(view.getByText("Recurrence end must be on or after the event start date.")).toBeTruthy();
        act(() => view.UNSAFE_getByType(ExpenseDatePicker).props.onChange(new Date(2026, 9, 3)));
        fireEvent.press(view.getByText("Confirm"));
        expect(view.getAllByText("3 Oct 2026")).toHaveLength(3);
        select(view, "Repeat", "Never");
        expect(view.queryByLabelText("Recurrence ends")).toBeNull();
        fireEvent.press(view.getByText("Save"));
        await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ recurrence_rule: null, recurrence_end_date: null })));
    });
    it("does not impose the master's end on a moved single-occurrence date", async () => {
        const { view, onSave } = setup({ ...initial, recurrence_rule: "FREQ=WEEKLY", recurrence_end_date: "2026-10-02" }, true);
        fireEvent.press(view.getByText("Save"));
        await waitFor(() => expect(onSave).toHaveBeenCalled());
        expect(view.queryByLabelText("Recurrence ends")).toBeNull();
    });
    it("selects days and navigates months through accessible controls", () => {
        const onSelect = jest.fn(), onMonth = jest.fn();
        const view = render(<MonthCalendar month="2026-10" selected="2026-10-03" occurrences={[]} onSelect={onSelect} onMonth={onMonth} />);
        fireEvent.press(view.getByLabelText("Next month"));
        fireEvent.press(view.getByLabelText("Previous month"));
        fireEvent.press(view.getByLabelText("2026-10-05, 0 events"));
        expect(onMonth.mock.calls).toEqual([[1], [-1]]);
        expect(onSelect).toHaveBeenCalledWith("2026-10-05");
        expect(monthWindow("2026-10")).toEqual({ from: "2026-09-27", to: "2026-11-07" });
    });
    it("uses a compact white form without timezone, description or reminder explanation", () => {
        const { view } = setup(initial);
        expectWhite(view);
        expect(view.queryByText(/Singapore time|05:00|Description|Old private description/)).toBeNull();
        expect(view.queryByLabelText("Description")).toBeNull();
        expect(view.getByLabelText("Repeat").props.accessibilityState.expanded).toBe(false);
        expect(view.getByLabelText("Telegram reminder").props.accessibilityState.expanded).toBe(false);
        expect(view.queryByText("Daily")).toBeNull();
        const form = StyleSheet.flatten(view.getByTestId("calendar-event-form").props.contentContainerStyle);
        expect(form.gap).toBe(10);
        expect(form.height).toBeUndefined();
        const swatch = view.getByLabelText("pink colour").children[0];
        expect(typeof swatch).not.toBe("string");
        if (typeof swatch !== "string") expect(StyleSheet.flatten(swatch.props.style)).toEqual(expect.objectContaining({ width: 24, height: 24 }));
    });
    it("creates timed events with recurrence, reminders, selected colour and null description", async () => {
        const { view, onSave, onClose } = setup();
        fireEvent.changeText(view.getByLabelText("Event title"), "Dinner together");
        select(view, "Repeat", "Every 2 weeks");
        select(view, "Telegram reminder", "2 days before");
        fireEvent.press(view.getByLabelText("green colour"));
        expect(view.getByLabelText("green colour").props.accessibilityState.selected).toBe(true);
        fireEvent.press(view.getByText("Save"));
        await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
            title: "Dinner together", description: null, colour: "green", is_all_day: false,
            starts_at: "2026-10-03T01:00:00.000Z", ends_at: "2026-10-03T02:00:00.000Z",
            start_date: null, end_date: null, recurrence_rule: "FREQ=WEEKLY;INTERVAL=2", reminder_days_before: 2,
        })));
        expect(onClose).toHaveBeenCalled();
    });
    it("renders dropdown options outside the scrollable form and closes without changing the value", () => {
        const { view } = setup();
        fireEvent.press(view.getByLabelText("Repeat"));
        expect(view.UNSAFE_getByType(CenteredModal).props.overlay).toBeTruthy();
        let parent = view.getByLabelText("Repeat: Daily").parent;
        while (parent) {
            expect(parent.props.testID).not.toBe("calendar-event-form");
            parent = parent.parent;
        }
        fireEvent.press(view.getByLabelText("Close selection"));
        expect(view.queryByLabelText("Repeat: Daily")).toBeNull();
        expect(view.getByText("Never")).toBeTruthy();
    });
    it("hides times for all-day events and submits custom recurrence/reminders", async () => {
        const { view, onSave } = setup();
        fireEvent.changeText(view.getByLabelText("Event title"), "Day out");
        fireEvent(view.getByLabelText("All day"), "valueChange", true);
        expect(view.queryByLabelText("Start time")).toBeNull();
        expect(view.queryByLabelText("End time")).toBeNull();
        expect(view.getByLabelText("Start date")).toBeTruthy();
        expect(view.getByLabelText("End date")).toBeTruthy();
        select(view, "Repeat", "Custom"); expectWhite(view);
        fireEvent.changeText(view.getByLabelText("Repeat interval"), "3");
        select(view, "Repeat unit", "Months");
        fireEvent.press(view.getByText("Confirm"));
        select(view, "Telegram reminder", "Custom"); expectWhite(view);
        fireEvent.changeText(view.getByLabelText("Reminder days before"), "4");
        fireEvent.press(view.getByText("Confirm"));
        fireEvent.press(view.getByText("Save"));
        await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ is_all_day: true,
            start_date: "2026-10-03", end_date: "2026-10-03", starts_at: null, ends_at: null,
            recurrence_rule: "FREQ=MONTHLY;INTERVAL=3", reminder_days_before: 4 })));
    });
    it("restores times when all-day is turned off", () => {
        const { view } = setup(initial);
        fireEvent(view.getByLabelText("All day"), "valueChange", true);
        fireEvent(view.getByLabelText("All day"), "valueChange", false);
        expect(view.getByLabelText("Start time")).toBeTruthy();
        expect(view.getByLabelText("End time")).toBeTruthy();
        expect(view.getByText("09:00")).toBeTruthy();
    });
    it("clears old descriptions and legacy zero reminders on save, without offering On the day", async () => {
        const { view, onSave } = setup({ ...initial, reminder_days_before: 0 });
        expect(view.getByText("None")).toBeTruthy();
        fireEvent.press(view.getByLabelText("Telegram reminder"));
        expect(view.queryByText("On the day")).toBeNull();
        fireEvent.press(view.getByLabelText("Telegram reminder: None"));
        fireEvent.press(view.getByText("Save"));
        await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ description: null, reminder_days_before: null })));
    });
    it.each(["0", "-1", "1.5", "2147483648"])("rejects invalid custom reminder %s", (value) => {
        const { view, onSave } = setup(initial);
        select(view, "Telegram reminder", "Custom");
        fireEvent.changeText(view.getByLabelText("Reminder days before"), value);
        fireEvent.press(view.getByText("Confirm"));
        expect(view.getByText("Enter reminder days from 1 to 2147483647.")).toBeTruthy();
        expect(onSave).not.toHaveBeenCalled();
    });
    it.each([1, 7, 20])("accepts positive custom reminder %s", async (value) => {
        const { view, onSave } = setup(initial);
        select(view, "Telegram reminder", "Custom");
        fireEvent.changeText(view.getByLabelText("Reminder days before"), String(value));
        fireEvent.press(view.getByText("Confirm"));
        fireEvent.press(view.getByText("Save"));
        await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ reminder_days_before: value })));
    });
    it("custom settings cancel without changing recurrence or reminder", async () => {
        const { view, onSave } = setup({ ...initial, recurrence_rule: "FREQ=WEEKLY", recurrence_end_date: null, reminder_days_before: 2 });
        select(view, "Repeat", "Custom");
        fireEvent.changeText(view.getByLabelText("Repeat interval"), "8");
        fireEvent.press(view.getByText("Cancel"));
        select(view, "Telegram reminder", "Custom");
        fireEvent.changeText(view.getByLabelText("Reminder days before"), "50");
        fireEvent.press(view.getByText("Cancel"));
        fireEvent.press(view.getByText("Save"));
        await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ recurrence_rule: "FREQ=WEEKLY", reminder_days_before: 2 })));
    });
    it("single-occurrence editing preserves the master rule and clears description", async () => {
        const { view, onSave } = setup({ ...initial, recurrence_rule: "FREQ=DAILY" }, true);
        expect(view.queryByLabelText("Repeat")).toBeNull();
        fireEvent.press(view.getByText("Save"));
        await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ recurrence_rule: "FREQ=DAILY", description: null })));
    });
    it.each(["Start date", "End date"])("%s reuses Expenses wheel, commits only on Confirm, and keeps Cancel unchanged", async (label) => {
        const { view, onSave } = setup(initial);
        fireEvent.press(view.getByLabelText(label)); expectWhite(view);
        expect(view.UNSAFE_getByType(ExpenseDatePicker)).toBeTruthy();
        pickWheel(view, 1, 3); // fourth day of October
        expect(onSave).not.toHaveBeenCalled();
        fireEvent.press(view.getByText("Cancel"));
        expect(view.getAllByText("3 Oct 2026")).toHaveLength(2);
        fireEvent.press(view.getByLabelText(label));
        pickWheel(view, 1, 3);
        fireEvent.press(view.getByText("Confirm"));
        expect(view.getByText("4 Oct 2026")).toBeTruthy();
        // Move the other date too, ensuring the saved range remains valid.
        fireEvent.press(view.getByLabelText(label === "Start date" ? "End date" : "Start date"));
        pickWheel(view, 1, 3); fireEvent.press(view.getByText("Confirm"));
        fireEvent.press(view.getByText("Save"));
        await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ starts_at: "2026-10-04T01:00:00.000Z", ends_at: "2026-10-04T02:00:00.000Z" })));
    });
    it.each(["Start time", "End time"])("%s uses a 24-hour wheel and only commits on Confirm", (label) => {
        const { view, onSave } = setup(initial);
        fireEvent.press(view.getByLabelText(label)); expectWhite(view);
        expect(view.getByLabelText("Hour").props.accessibilityValue).toEqual(expect.objectContaining({ min: 0, max: 23 }));
        expect(view.getByLabelText("Minute").props.accessibilityValue).toEqual(expect.objectContaining({ min: 0, max: 59 }));
        expect(view.queryByText(/AM|PM/)).toBeNull();
        fireEvent(view.getByLabelText("Hour"), "momentumScrollEnd", { nativeEvent: { contentOffset: { y: 23 * 30 } } });
        fireEvent(view.getByLabelText("Minute"), "momentumScrollEnd", { nativeEvent: { contentOffset: { y: 59 * 30 } } });
        fireEvent.press(view.getByText("Cancel"));
        expect(view.getByText(label === "Start time" ? "09:00" : "10:00")).toBeTruthy();
        fireEvent.press(view.getByLabelText(label));
        fireEvent(view.getByLabelText("Hour"), "momentumScrollEnd", { nativeEvent: { contentOffset: { y: 23 * 30 } } });
        fireEvent(view.getByLabelText("Minute"), "momentumScrollEnd", { nativeEvent: { contentOffset: { y: 59 * 30 } } });
        fireEvent.press(view.getByText("Confirm"));
        expect(view.getByText("23:59")).toBeTruthy();
        expect(onSave).not.toHaveBeenCalled();
    });
    it("still rejects timed ends before the start and all-day inverted dates", () => {
        const { view, onSave } = setup(initial);
        fireEvent.press(view.getByLabelText("End time"));
        fireEvent(view.getByLabelText("Hour"), "momentumScrollEnd", { nativeEvent: { contentOffset: { y: 8 * 30 } } });
        fireEvent.press(view.getByText("Confirm"));
        fireEvent.press(view.getByText("Save"));
        expect(view.getByText("Choose an end time after the start time.")).toBeTruthy();
        fireEvent(view.getByLabelText("All day"), "valueChange", true);
        fireEvent.press(view.getByLabelText("Start date"));
        pickWheel(view, 1, 4); fireEvent.press(view.getByText("Confirm"));
        fireEvent.press(view.getByText("Save"));
        expect(view.getByText("End date must be on or after start date.")).toBeTruthy();
        expect(onSave).not.toHaveBeenCalled();
    });
    it("keeps invalid forms open and presents save failures", async () => {
        const { view, onSave, onClose } = setup();
        onSave.mockRejectedValue(new Error("Connection lost"));
        fireEvent.press(view.getByText("Save"));
        expect(view.getByText("Enter an event title.")).toBeTruthy();
        expect(onSave).not.toHaveBeenCalled();
        fireEvent.changeText(view.getByLabelText("Event title"), "Plan");
        fireEvent.press(view.getByText("Save"));
        await waitFor(() => expect(view.getByText("Connection lost")).toBeTruthy());
        expect(onClose).not.toHaveBeenCalled();
    });
});
