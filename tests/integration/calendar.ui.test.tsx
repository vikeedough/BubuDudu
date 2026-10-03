import { fireEvent, render, waitFor } from "@testing-library/react-native";
import React from "react";

import CalendarEventModal from "@/components/calendar/CalendarEventModal";
import MonthCalendar, { monthWindow } from "@/components/calendar/MonthCalendar";

describe("Calendar UI", () => {
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
    it("creates a timed event with mandatory start/end, recurrence and reminder", async () => {
        const onSave = jest.fn().mockResolvedValue(undefined), onClose = jest.fn();
        const view = render(<CalendarEventModal date="2026-10-03" single={false} onSave={onSave} onClose={onClose} />);
        fireEvent.changeText(view.getByLabelText("Event title"), "Dinner together");
        fireEvent.press(view.getByText("Every 2 weeks"));
        fireEvent.press(view.getByText("2 days"));
        fireEvent.press(view.getByText("Save"));
        await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
            title: "Dinner together", is_all_day: false, starts_at: "2026-10-03T01:00:00.000Z", ends_at: "2026-10-03T02:00:00.000Z",
            start_date: null, end_date: null, recurrence_rule: "FREQ=WEEKLY;INTERVAL=2", reminder_days_before: 2,
        })));
        expect(onClose).toHaveBeenCalled();
    });
    it("creates all-day events with date-only fields and custom intervals/reminders", async () => {
        const onSave = jest.fn().mockResolvedValue(undefined);
        const view = render(<CalendarEventModal date="2026-10-03" single={false} onSave={onSave} onClose={jest.fn()} />);
        fireEvent.changeText(view.getByLabelText("Event title"), "Day out");
        fireEvent(view.getByLabelText("All day"), "valueChange", true);
        fireEvent.press(view.getAllByText("Custom")[0]);
        fireEvent.changeText(view.getByLabelText("Repeat interval"), "3");
        fireEvent.press(view.getByText("Months"));
        fireEvent.press(view.getAllByText("Custom")[1]);
        fireEvent.changeText(view.getByLabelText("Reminder days before"), "4");
        fireEvent.press(view.getByText("Save"));
        await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ is_all_day: true, start_date: "2026-10-03", end_date: "2026-10-03", starts_at: null, ends_at: null, recurrence_rule: "FREQ=MONTHLY;INTERVAL=3", reminder_days_before: 4 })));
    });
    it("keeps invalid forms open and presents save failures", async () => {
        const onSave = jest.fn().mockRejectedValue(new Error("Connection lost")), onClose = jest.fn();
        const view = render(<CalendarEventModal date="2026-10-03" single={false} onSave={onSave} onClose={onClose} />);
        fireEvent.press(view.getByText("Save"));
        expect(view.getByText("Enter an event title.")).toBeTruthy();
        expect(onSave).not.toHaveBeenCalled();
        fireEvent.changeText(view.getByLabelText("Event title"), "Plan");
        fireEvent.press(view.getByText("Save"));
        await waitFor(() => expect(view.getByText("Connection lost")).toBeTruthy());
        expect(onClose).not.toHaveBeenCalled();
    });
});
