import type { CalendarEvent } from "@/types/calendar";

export const calendarTestEvent = (patch: Partial<CalendarEvent> = {}): CalendarEvent => ({
    id: "event", space_id: "space", created_by: "creator", title: "Together", description: "Private description",
    colour: "pink", is_all_day: true, start_date: "2026-08-09", end_date: "2026-08-09", starts_at: null, ends_at: null,
    timezone: "Asia/Singapore", recurrence_rule: null, recurrence_end_date: null, reminder_days_before: null,
    created_at: "", updated_at: "", deleted_at: null, ...patch,
});
