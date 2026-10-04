import { fireEvent, render } from "@testing-library/react-native";
import React from "react";
import { Modal, StyleSheet } from "react-native";

import CalendarEventDetails from "@/components/calendar/CalendarEventDetails";
import CenteredModal from "@/components/common/CenteredModal";
import { formatCalendarDate } from "@/utils/calendar";

import type { CalendarOccurrence } from "@/types/calendar";

const occurrence: CalendarOccurrence = {
    event_id: "event", key: "event:2026-10-05", original_date: "2026-10-05", is_exception: false,
    title: "Urology Appt", description: "Hidden", colour: "pink", is_all_day: false, start_date: null, end_date: null,
    starts_at: "2026-10-05T06:30:00Z", ends_at: "2026-10-05T08:00:00Z", timezone: "Asia/Singapore",
    recurrence_rule: "FREQ=WEEKLY", recurrence_end_date: "2027-10-05", reminder_days_before: 2,
};
function setup(patch: Partial<CalendarOccurrence> = {}) {
    const onClose = jest.fn(); const onAction = jest.fn(); const onScope = jest.fn();
    const view = render(<CalendarEventDetails occurrence={{ ...occurrence, ...patch }} busy={false} action={null} error={null} onClose={onClose} onAction={onAction} onScope={onScope} />);
    return { view, onClose, onAction };
}
it("renders structured white details, dates, times, repeat/end and reminders with Edit/Delete only", () => {
    const { view, onAction } = setup();
    expect(view.getByText("Monday, 5th October 2026")).toBeTruthy();
    expect(view.getByText("14:30 – 16:00")).toBeTruthy();
    expect(view.getByText("Weekly · until 5th October 2027")).toBeTruthy();
    expect(view.getByText("2 days before")).toBeTruthy();
    for (const text of ["Colour", "Description", "Hidden", "Close", "2026-10-05"]) expect(view.queryByText(text)).toBeNull();
    expect(StyleSheet.flatten(view.UNSAFE_getByType(CenteredModal).props.containerStyle).backgroundColor).toBe("#fff");
    fireEvent.press(view.getByText("Edit")); expect(onAction).toHaveBeenCalledWith("edit");
    fireEvent.press(view.getByText("Delete")); expect(onAction).toHaveBeenCalledWith("delete");
});
it("shows all day, human multi-day range, Never ends and hides absent reminder/nonrecurring metadata", () => {
    const { view } = setup({ is_all_day: true, starts_at: null, ends_at: null, start_date: "2026-10-05", end_date: "2026-10-06", recurrence_end_date: null, reminder_days_before: null });
    expect(view.getByText("All day")).toBeTruthy(); expect(view.getByText("to Tuesday, 6th October 2026")).toBeTruthy();
    expect(view.getByText("Weekly · Never ends")).toBeTruthy(); expect(view.queryByText("Reminder")).toBeNull();
    view.unmount(); const nonrecurring = setup({ recurrence_rule: null, recurrence_end_date: null });
    expect(nonrecurring.view.queryByText("Repeat")).toBeNull();
});
it("dismisses via backdrop and Android Back without dismissing inside presses", () => {
    const { view, onClose } = setup();
    fireEvent.press(view.getByText("Urology Appt")); expect(onClose).not.toHaveBeenCalled();
    fireEvent.press(view.getByLabelText("Dismiss event details")); expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent(view.UNSAFE_getByType(Modal), "requestClose"); expect(onClose).toHaveBeenCalledTimes(2);
});
it.each([[1, "1st"], [2, "2nd"], [3, "3rd"], [4, "4th"], [11, "11th"], [12, "12th"], [13, "13th"], [21, "21st"], [22, "22nd"], [23, "23rd"], [31, "31st"]])("detail dates support ordinal %s", (day, suffix) => {
    expect(formatCalendarDate(`2027-01-${String(day).padStart(2, "0")}`)).toContain(`${suffix} January 2027`);
});
