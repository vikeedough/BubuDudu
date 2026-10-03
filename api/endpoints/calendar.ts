import { supabase } from "@/api/clients/supabaseClient";
import { validateDraft } from "@/utils/calendar";
import { getIsOnline } from "@/utils/offline/network";

import type { CalendarDraft, CalendarEvent, CalendarException, CalendarOccurrence } from "@/types/calendar";

function requireOnline() {
    if (!getIsOnline()) throw new Error("Connect to the internet to update Calendar.");
}
export async function fetchCalendar(spaceId: string, from: string, to: string) {
    const events: CalendarEvent[] = [];
    for (let offset = 0;; offset += 500) {
        const { data, error } = await supabase.rpc("calendar_events_in_range", { p_space_id: spaceId, p_from: from, p_to: to })
            .order("id").range(offset, offset + 499);
        if (error) throw error;
        events.push(...(data as CalendarEvent[]));
        if (data.length < 500) break;
    }
    const exceptions: CalendarException[] = [];
    for (let offset = 0;; offset += 500) {
        const { data, error } = await supabase.rpc("calendar_exceptions_in_range", { p_space_id: spaceId, p_from: from, p_to: to })
            .order("id").range(offset, offset + 499);
        if (error) throw error;
        exceptions.push(...(data as CalendarException[]));
        if (data.length < 500) break;
    }
    return { events, exceptions };
}
export async function saveCalendarEvent(spaceId: string, draft: CalendarDraft, id?: string) {
    requireOnline();
    validateDraft(draft);
    const fields = { ...draft, title: draft.title.trim() };
    const query = id ? supabase.from("calendar_events").update(fields).eq("id", id).eq("space_id", spaceId).is("deleted_at", null) :
        supabase.from("calendar_events").insert({ ...fields, space_id: spaceId });
    const { data, error } = await query.select("*").single();
    if (error) throw error;
    return data as CalendarEvent;
}
export async function saveCalendarException(spaceId: string, occurrence: CalendarOccurrence, draft: CalendarDraft | null) {
    requireOnline();
    if (draft) validateDraft(draft);
    const { recurrence_rule: _rule, ...fields } = draft ?? { recurrence_rule: null };
    const { error } = await supabase.from("calendar_event_exceptions").upsert({
        ...fields, event_id: occurrence.event_id, space_id: spaceId,
        original_date: occurrence.original_date, is_cancelled: draft === null,
    }, { onConflict: "event_id,original_date" });
    if (error) throw error;
}
export async function deleteCalendarEvent(spaceId: string, id: string) {
    requireOnline();
    const { error } = await supabase.from("calendar_events").update({ deleted_at: new Date().toISOString() })
        .eq("space_id", spaceId).eq("id", id).is("deleted_at", null).select("id").single();
    if (error) throw error;
}
