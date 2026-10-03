import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import CalendarEventModal from "@/components/calendar/CalendarEventModal";
import MonthCalendar, { monthWindow } from "@/components/calendar/MonthCalendar";
import CenteredModal from "@/components/common/CenteredModal";
import CustomText from "@/components/CustomText";
import { Colors } from "@/constants/colors";
import { shadowStyle } from "@/constants/shadows";
import { useAuthContext } from "@/hooks/useAuthContext";
import { useCalendarRealtime } from "@/hooks/useCalendarRealtime";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useCalendarStore } from "@/stores/CalendarStore";
import { dateInSingapore, expandOccurrences, occurrenceEnd, occurrenceStart, recurrenceLabel, timeInSingapore } from "@/utils/calendar";
import { getSpaceId } from "@/utils/secure-store";

import type { CalendarEvent, CalendarOccurrence } from "@/types/calendar";

export default function CalendarScreen() {
    const { session } = useAuthContext();
    const userId = session?.user.id;
    const [spaceId, setSpaceId] = useState<string | null>(null);
    const [selected, setSelected] = useState(dateInSingapore());
    const [month, setMonth] = useState(selected.slice(0, 7));
    const [detail, setDetail] = useState<CalendarOccurrence | null>(null);
    const [action, setAction] = useState<"edit" | "delete" | null>(null);
    const [editor, setEditor] = useState<{ event?: CalendarEvent; occurrence?: CalendarOccurrence } | null>(null);
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
    const agenda = occurrences.filter((e) => occurrenceStart(e) <= selected && occurrenceEnd(e) >= selected);
    const changeMonth = useCallback((offset: number) => {
        const date = new Date(month + "-01T00:00:00Z");
        date.setUTCMonth(date.getUTCMonth() + offset);
        const next = date.toISOString().slice(0, 7);
        setMonth(next); setSelected(next + "-01");
    }, [month]);
    const act = async (single: boolean) => {
        if (!detail) return;
        const event = events.find((e) => e.id === detail.event_id);
        if (!event) { setActionError("This event has changed. Close and refresh Calendar."); return; }
        if (action === "edit") {
            setEditor({ event, ...(single ? { occurrence: detail } : {}) }); setDetail(null); setAction(null); return;
        }
        setBusy(true); setActionError(null);
        try { await remove(event, single ? detail : undefined); setDetail(null); setAction(null); }
        catch (e) { setActionError(e instanceof Error ? e.message : "Could not delete the event."); }
        finally { setBusy(false); }
    };
    return <SafeAreaView style={styles.root}>
        <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
            <View style={styles.header}><CustomText weight="extrabold" style={styles.title}>Calendar</CustomText><TouchableOpacity accessibilityLabel="Add event" disabled={!spaceId} onPress={() => setEditor({})} style={styles.add}><CustomText weight="bold" style={styles.buttonText}>+ Event</CustomText></TouchableOpacity></View>
            <View style={styles.header}><CustomText style={styles.subtitle}>Our plans, together</CustomText><TouchableOpacity onPress={() => { const today = dateInSingapore(); setMonth(today.slice(0, 7)); setSelected(today); }}><CustomText weight="bold" style={styles.subtitle}>Today</CustomText></TouchableOpacity></View>
            {error && <CustomText accessibilityRole="alert" style={styles.error}>{error}</CustomText>}
            <MonthCalendar month={month} selected={selected} occurrences={occurrences} onMonth={changeMonth} onSelect={setSelected} />
            <CustomText weight="bold" style={styles.agendaTitle}>{new Date(selected + "T00:00:00Z").toLocaleDateString("en-SG", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })}</CustomText>
            {loading && <ActivityIndicator color={Colors.darkGreenText} />}
            {!loading && !error && agenda.length === 0 && <CustomText style={styles.subtitle}>Nothing planned. Make a little time together.</CustomText>}
            {agenda.map((event) => <TouchableOpacity key={event.key} accessibilityLabel={`Open ${event.title}`} onPress={() => { setDetail(event); setAction(null); setActionError(null); }} style={[styles.event, { borderLeftColor: Colors[event.colour] }]}>
                <CustomText weight="bold" style={styles.eventTitle}>{event.title}</CustomText>
                <CustomText style={styles.subtitle}>{event.is_all_day ? "All day" : `${timeInSingapore(event.starts_at!)} – ${timeInSingapore(event.ends_at!)}`}{event.recurrence_rule ? " · Repeats" : ""}</CustomText>
                {occurrenceStart(event) !== occurrenceEnd(event) && <CustomText style={styles.subtitle}>{occurrenceStart(event)} – {occurrenceEnd(event)}</CustomText>}
            </TouchableOpacity>)}
        </ScrollView>
        {editor && <CalendarEventModal initial={editor.occurrence ?? editor.event} date={selected} single={!!editor.occurrence} onClose={() => setEditor(null)} onSave={(draft) => save(draft, editor.event, editor.occurrence)} />}
        {detail && <CenteredModal isOpen onClose={() => { if (!busy) setDetail(null); }} containerStyle={styles.details}>
            <ScrollView contentContainerStyle={styles.detailContent}>
                <CustomText weight="extrabold" style={styles.title}>{detail.title}</CustomText>
                <CustomText style={styles.subtitle}>{occurrenceStart(detail)}{occurrenceEnd(detail) !== occurrenceStart(detail) ? ` – ${occurrenceEnd(detail)}` : ""}</CustomText>
                <CustomText style={styles.subtitle}>{detail.is_all_day ? "All day" : `${timeInSingapore(detail.starts_at!)} – ${timeInSingapore(detail.ends_at!)} · Singapore time`}</CustomText>
                {detail.description && <CustomText style={styles.description}>{detail.description}</CustomText>}
                <CustomText style={styles.subtitle}>{detail.reminder_days_before === null ? "No advance reminder" : `Reminder: ${detail.reminder_days_before} day(s) before`}</CustomText>
                {detail.recurrence_rule && <CustomText style={styles.subtitle}>{recurrenceLabel(detail.recurrence_rule)}</CustomText>}
                {action ? <>
                    <CustomText weight="bold" style={styles.eventTitle}>{action === "delete" ? "Delete" : "Edit"}{detail.recurrence_rule ? " recurring event?" : " this event?"}</CustomText>
                    {detail.recurrence_rule && <TouchableOpacity disabled={busy} onPress={() => { void act(true); }} style={styles.add}><CustomText style={styles.buttonText}>This event</CustomText></TouchableOpacity>}
                    <TouchableOpacity disabled={busy} onPress={() => { void act(false); }} style={styles.add}><CustomText style={styles.buttonText}>{detail.recurrence_rule ? "All events" : action === "delete" ? "Delete event" : "Edit event"}</CustomText></TouchableOpacity>
                    <TouchableOpacity disabled={busy} onPress={() => setAction(null)}><CustomText style={styles.subtitle}>Cancel</CustomText></TouchableOpacity>
                </> : <View style={styles.header}><TouchableOpacity onPress={() => setAction("edit")} style={styles.add}><CustomText style={styles.buttonText}>Edit</CustomText></TouchableOpacity><TouchableOpacity onPress={() => setAction("delete")}><CustomText style={styles.error}>Delete</CustomText></TouchableOpacity><TouchableOpacity onPress={() => setDetail(null)}><CustomText style={styles.subtitle}>Close</CustomText></TouchableOpacity></View>}
                {busy && <ActivityIndicator />}{actionError && <CustomText style={styles.error}>{actionError}</CustomText>}
            </ScrollView>
        </CenteredModal>}
    </SafeAreaView>;
}
const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: Colors.backgroundPink },
    content: { padding: 20, paddingBottom: 100, gap: 16 },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
    title: { fontSize: 24, color: Colors.darkGreenText },
    subtitle: { fontSize: 13, color: Colors.brownText },
    add: { backgroundColor: Colors.yellow, padding: 12, borderRadius: 12, alignItems: "center" },
    buttonText: { color: Colors.brownText, fontSize: 14 },
    agendaTitle: { fontSize: 17, color: Colors.darkGreenText, marginTop: 4 },
    event: { ...shadowStyle, backgroundColor: Colors.white, borderRadius: 12, borderLeftWidth: 6, padding: 16, gap: 8 },
    eventTitle: { fontSize: 16, color: Colors.darkGreenText },
    error: { color: Colors.red, fontSize: 13 },
    details: { width: 400, backgroundColor: Colors.backgroundPink },
    detailContent: { padding: 22, gap: 18 },
    description: { color: Colors.darkGreenText, fontSize: 14 },
});
