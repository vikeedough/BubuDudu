import { supabase } from "@/api/clients/supabaseClient";
import { changeCalendarFuture, deleteCalendarEvent, fetchCalendar, saveCalendarEvent, saveCalendarException } from "@/api/endpoints/calendar";
import { setIsOnline } from "@/utils/offline/network";

import type { CalendarDraft, CalendarEvent, CalendarOccurrence } from "@/types/calendar";

const draft: CalendarDraft = { title: " Plan ", description: null, colour: "green", is_all_day: true, starts_at: null, ends_at: null, start_date: "2026-10-03", end_date: "2026-10-03", timezone: "Asia/Singapore", recurrence_rule: "FREQ=WEEKLY", recurrence_end_date: null, reminder_days_before: null };
beforeEach(() => setIsOnline(true));
it("queries a bounded space window and paginates both result sets", async () => {
    const range = jest.fn().mockResolvedValueOnce({ data: Array.from({ length: 500 }, (_, id) => ({ id })), error: null })
        .mockResolvedValueOnce({ data: [{ id: "last" }], error: null })
        .mockResolvedValueOnce({ data: [{ id: "exception" }], error: null });
    const client = supabase as unknown as { rpc: jest.Mock };
    client.rpc = jest.fn(() => ({ order: () => ({ range }) }));
    const data = await fetchCalendar("space", "2026-09-27", "2026-11-07");
    expect(data.events).toHaveLength(501);
    expect(data.exceptions).toHaveLength(1);
    expect(client.rpc).toHaveBeenNthCalledWith(1, "calendar_events_in_range", { p_space_id: "space", p_from: "2026-09-27", p_to: "2026-11-07" });
    expect(client.rpc).toHaveBeenLastCalledWith("calendar_exceptions_in_range", { p_space_id: "space", p_from: "2026-09-27", p_to: "2026-11-07" });
    expect(range.mock.calls).toEqual([[0, 499], [500, 999], [0, 499]]);
});
it("uses explicit exception fields including null reminder and cancellation, and soft-deletes masters", async () => {
    const builder: Record<string, jest.Mock> = {};
    for (const name of ["insert", "update", "upsert", "eq", "is", "select"]) builder[name] = jest.fn(() => builder);
    builder.single = jest.fn().mockResolvedValue({ data: { id: "event" }, error: null });
    (supabase.from as jest.Mock).mockReturnValue(builder);
    const occurrence: CalendarOccurrence = { ...draft, event_id: "event", key: "event:2026-10-03", original_date: "2026-10-03", is_exception: false };
    await saveCalendarEvent("space", draft);
    expect(builder.insert).toHaveBeenCalledWith({ ...draft, title: "Plan", space_id: "space" });
    await saveCalendarException("space", occurrence, draft);
    expect(builder.upsert).toHaveBeenCalledWith(expect.objectContaining({ event_id: "event", original_date: "2026-10-03", reminder_days_before: null, is_cancelled: false }), { onConflict: "event_id,original_date" });
    expect(builder.upsert.mock.calls[0][0]).not.toHaveProperty("recurrence_rule");
    expect(builder.upsert.mock.calls[0][0]).not.toHaveProperty("recurrence_end_date");
    await saveCalendarException("space", occurrence, null);
    expect(builder.upsert).toHaveBeenLastCalledWith(expect.objectContaining({ is_cancelled: true }), { onConflict: "event_id,original_date" });
    await deleteCalendarEvent("space", "event");
    expect(builder.update).toHaveBeenCalledWith({ deleted_at: expect.any(String) });
    expect(builder.eq).toHaveBeenCalledWith("space_id", "space");
    expect(builder.is).toHaveBeenCalledWith("deleted_at", null);
});
it("uses one optimistic RPC for future scope and propagates failures", async () => {
    const master: CalendarEvent = { ...draft, id: "event", space_id: "space", created_by: "member", created_at: "", updated_at: "version", deleted_at: null };
    const occurrence: CalendarOccurrence = { ...draft, event_id: "event", key: "event:2026-10-03", original_date: "2026-10-03", is_exception: false };
    const client = supabase as unknown as { rpc: jest.Mock };
    client.rpc = jest.fn().mockResolvedValue({ data: "new-id", error: null });
    expect(await changeCalendarFuture("space", master, occurrence, draft)).toBe("new-id");
    expect(client.rpc).toHaveBeenCalledWith("change_calendar_future", { p_space_id: "space", p_event_id: "event", p_original_date: "2026-10-03", p_expected_updated_at: "version", p_draft: draft });
    await changeCalendarFuture("space", master, occurrence, null);
    expect(client.rpc.mock.calls[1][1].p_draft).toBeNull();
    client.rpc.mockResolvedValueOnce({ data: null, error: new Error("Refresh Calendar") });
    await expect(changeCalendarFuture("space", master, occurrence, draft)).rejects.toThrow("Refresh Calendar");
    setIsOnline(false);
    await expect(changeCalendarFuture("space", master, occurrence, draft)).rejects.toThrow("internet");
    expect(client.rpc).toHaveBeenCalledTimes(3);
});
it("does not send offline mutations", async () => {
    setIsOnline(false);
    await expect(saveCalendarEvent("space", draft)).rejects.toThrow("internet");
    await expect(deleteCalendarEvent("space", "event")).rejects.toThrow("internet");
    expect(supabase.from).not.toHaveBeenCalled();
});
