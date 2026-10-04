import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import CalendarEventDetails from "@/components/calendar/CalendarEventDetails";
import CalendarEventModal from "@/components/calendar/CalendarEventModal";
import CalendarHeader from "@/components/calendar/CalendarHeader";
import MonthCalendar, { monthWindow } from "@/components/calendar/MonthCalendar";
import FloatingAddButton from "@/components/common/FloatingAddButton";
import CustomText from "@/components/CustomText";
import { Colors } from "@/constants/colors";
import { shadowStyle } from "@/constants/shadows";
import { useAuthContext } from "@/hooks/useAuthContext";
import { useCalendarMonthPages } from "@/hooks/useCalendarMonthPages";
import { useCalendarRealtime } from "@/hooks/useCalendarRealtime";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useCalendarStore } from "@/stores/CalendarStore";
import { dateInSingapore, expandOccurrences, occurrenceEnd, occurrenceStart, timeInSingapore } from "@/utils/calendar";
import { getSpaceId } from "@/utils/secure-store";

import type { CalendarEvent, CalendarOccurrence, CalendarScope } from "@/types/calendar";

export default function CalendarScreen() {
    const { session } = useAuthContext();
    const userId = session?.user.id;
    const [spaceId, setSpaceId] = useState<string | null>(null);
    const [selected, setSelected] = useState(dateInSingapore());
    const [month, setMonth] = useState(selected.slice(0, 7));
    const [detail, setDetail] = useState<CalendarOccurrence | null>(null);
    const [action, setAction] = useState<"edit" | "delete" | null>(null);
    const [editor, setEditor] = useState<{ event?: CalendarEvent; occurrence?: CalendarOccurrence; scope?: CalendarScope } | null>(null);
    const [busy, setBusy] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);
    const { events, exceptions, loading, error, load, refresh, save, remove, clear } = useCalendarStore();
    const { from, to } = monthWindow(month);
    useEffect(() => {
        let active = true;
        clear(); setSpaceId(null); setDetail(null); setEditor(null);
        if (userId) void getSpaceId().then((id) => { if (active) setSpaceId(id); });
        return () => { active = false; clear(); };
    }, [userId, clear]);
    useEffect(() => { if (spaceId) void load(spaceId, from, to); }, [spaceId, from, to, load]);
    useCalendarRealtime(spaceId);
    const { refreshing, onRefresh } = usePullToRefresh(refresh);
    const occurrences = useMemo(() => expandOccurrences(events, exceptions, from, to), [events, exceptions, from, to]);
    const adjacentOccurrences = useCalendarMonthPages(spaceId, month, events, exceptions);
    const agenda = occurrences.filter((e) => occurrenceStart(e) <= selected && occurrenceEnd(e) >= selected);
    const changeMonth = useCallback((offset: number) => {
        const date = new Date(month + "-01T00:00:00Z");
        date.setUTCMonth(date.getUTCMonth() + offset);
        const next = date.toISOString().slice(0, 7);
        setMonth(next); setSelected(next + "-01");
    }, [month]);
    const act = async (scope: CalendarScope, editing = action === "edit") => {
        if (!detail) return;
        const event = events.find((e) => e.id === detail.event_id);
        if (!event) { setActionError("This event has changed. Close and refresh Calendar."); return; }
        if (editing) {
            setEditor({ event, scope, ...(scope !== "all" ? { occurrence: detail } : {}) }); setDetail(null); setAction(null); return;
        }
        setBusy(true); setActionError(null);
        try {
            if (scope === "future") await remove(event, detail, scope);
            else await remove(event, scope === "this" ? detail : undefined);
            setDetail(null); setAction(null);
        }
        catch (e) { setActionError(e instanceof Error ? e.message : "Could not delete the event."); }
        finally { setBusy(false); }
    };
    return <SafeAreaView style={styles.root}>
        <CalendarHeader onToday={() => { const today = dateInSingapore(); setMonth(today.slice(0, 7)); setSelected(today); }} />
        <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
            {error && <CustomText accessibilityRole="alert" style={styles.error}>{error}</CustomText>}
            <MonthCalendar month={month} selected={selected} occurrences={occurrences} adjacentOccurrences={adjacentOccurrences} onMonth={changeMonth} onSelect={(date) => { setMonth(date.slice(0, 7)); setSelected(date); }} />
            <CustomText weight="bold" style={styles.agendaTitle}>{new Date(selected + "T00:00:00Z").toLocaleDateString("en-SG", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })}</CustomText>
            {loading && <ActivityIndicator color={Colors.darkGreenText} />}
            {!loading && !error && agenda.length === 0 && <CustomText style={styles.subtitle}>No events planned!</CustomText>}
            {agenda.map((event) => <TouchableOpacity key={event.key} accessibilityLabel={`Open ${event.title}`} onPress={() => { setDetail(event); setAction(null); setActionError(null); }} style={[styles.event, { borderLeftColor: Colors[event.colour] }]}>
                <CustomText weight="bold" style={styles.eventTitle}>{event.title}</CustomText>
                <CustomText style={styles.subtitle}>{event.is_all_day ? "All day" : `${timeInSingapore(event.starts_at!)} – ${timeInSingapore(event.ends_at!)}`}{event.recurrence_rule ? " · Repeats" : ""}</CustomText>
                {occurrenceStart(event) !== occurrenceEnd(event) && <CustomText style={styles.subtitle}>{occurrenceStart(event)} – {occurrenceEnd(event)}</CustomText>}
            </TouchableOpacity>)}
        </ScrollView>
        <FloatingAddButton accessibilityLabel="Add event" disabled={!spaceId} onPress={() => setEditor({})} />
        {editor && <CalendarEventModal initial={editor.occurrence ?? editor.event} date={selected} single={editor.scope === "this"} onClose={() => setEditor(null)} onSave={(draft) => editor.scope === "future" ? save(draft, editor.event, editor.occurrence, "future") : save(draft, editor.event, editor.occurrence)} />}
        {detail && <CalendarEventDetails occurrence={detail} action={action} busy={busy} error={actionError}
            onAction={(next) => { if (next === "edit" && !detail.recurrence_rule) void act("all", true); else setAction(next); }}
            onScope={(scope) => { void act(scope); }} onClose={() => { if (!busy) { setDetail(null); setAction(null); } }} />}
    </SafeAreaView>;
}
const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: Colors.backgroundPink, paddingTop: 20, paddingHorizontal: 25 },
    content: { paddingBottom: 100, gap: 16 },
    subtitle: { fontSize: 13, color: Colors.brownText },
    agendaTitle: { fontSize: 17, color: Colors.darkGreenText, marginTop: 4 },
    event: { ...shadowStyle, backgroundColor: Colors.white, borderRadius: 12, borderLeftWidth: 6, padding: 16, gap: 8 },
    eventTitle: { fontSize: 16, color: Colors.darkGreenText },
    error: { color: Colors.red, fontSize: 13 },
});
