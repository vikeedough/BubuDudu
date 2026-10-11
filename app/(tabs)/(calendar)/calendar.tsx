import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import CalendarEventDetails from "@/components/calendar/CalendarEventDetails";
import CalendarEventModal from "@/components/calendar/CalendarEventModal";
import CalendarHeader from "@/components/calendar/CalendarHeader";
import CalendarHolidayDetails from "@/components/calendar/CalendarHolidayDetails";
import MonthCalendar, { monthWindow, offsetMonth } from "@/components/calendar/MonthCalendar";
import FloatingAddButton from "@/components/common/FloatingAddButton";
import CustomText from "@/components/CustomText";
import { Colors } from "@/constants/colors";
import { shadowStyle } from "@/constants/shadows";
import { isCalendarDate } from "@/data/singaporePublicHolidays";
import { useAuthContext } from "@/hooks/useAuthContext";
import { useCalendarMonthPages } from "@/hooks/useCalendarMonthPages";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { calendarWindowKey, useCalendarStore } from "@/stores/CalendarStore";
import { dateInSingapore, expandOccurrences, occurrenceEnd, occurrenceStart, timeInSingapore } from "@/utils/calendar";
import { calendarDisplayItems, displayItemsOnDate } from "@/utils/calendar-display";
import { getSpaceId } from "@/utils/secure-store";

import type { SingaporePublicHoliday } from "@/data/singaporePublicHolidays";
import type { CalendarEvent, CalendarOccurrence, CalendarScope } from "@/types/calendar";

export default function CalendarScreen() {
    const { session } = useAuthContext();
    const userId = session?.user.id;
    const { date: linkedDate } = useLocalSearchParams<{ date?: string }>();
    const [spaceId, setSpaceId] = useState<string | null>(null);
    const [{ selected, month }, setCalendarDate] = useState(() => {
        const selected = dateInSingapore();
        return { selected, month: selected.slice(0, 7) };
    });
    const [detail, setDetail] = useState<CalendarOccurrence | null>(null);
    const [holidayDetail, setHolidayDetail] = useState<SingaporePublicHoliday | null>(null);
    const [action, setAction] = useState<"edit" | "delete" | null>(null);
    const [editor, setEditor] = useState<{ event?: CalendarEvent; occurrence?: CalendarOccurrence; scope?: CalendarScope } | null>(null);
    const [busy, setBusy] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);
    useEffect(() => {
        if (typeof linkedDate === "string" && isCalendarDate(linkedDate)) setCalendarDate({ selected: linkedDate, month: linkedDate.slice(0, 7) });
    }, [linkedDate]);
    const { events, exceptions, cache, loading, error, load, refresh, save, remove, clear } = useCalendarStore();
    const { from, to } = monthWindow(month);
    const cached = spaceId ? cache?.[calendarWindowKey(spaceId, from, to)] : undefined;
    useEffect(() => {
        let active = true;
        clear(); setSpaceId(null); setDetail(null); setHolidayDetail(null); setEditor(null);
        if (userId) void getSpaceId().then((id) => { if (active) setSpaceId(id); });
        return () => { active = false; clear(); };
    }, [userId, clear]);
    useEffect(() => { if (spaceId) void load(spaceId, from, to); }, [spaceId, from, to, load]);
    const { refreshing, onRefresh } = usePullToRefresh(refresh);
    const occurrences = useMemo(() => cached?.occurrences ?? expandOccurrences(events, exceptions, from, to), [cached, events, exceptions, from, to]);
    const adjacentOccurrences = useCalendarMonthPages(spaceId, month);
    const agenda = displayItemsOnDate(calendarDisplayItems(occurrences, from, to), selected);
    const changeMonth = useCallback((offset: number) => {
        setCalendarDate((current) => {
            const month = offsetMonth(current.month, offset);
            return { month, selected: month + "-01" };
        });
    }, []);
    const act = async (scope: CalendarScope, editing = action === "edit") => {
        if (!detail) return;
        const event = (cached?.events ?? events).find((e) => e.id === detail.event_id);
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
        <CalendarHeader onToday={() => { const selected = dateInSingapore(); setCalendarDate({ month: selected.slice(0, 7), selected }); }} />
        <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
            {error && <CustomText accessibilityRole="alert" style={styles.error}>{error}</CustomText>}
            <MonthCalendar month={month} selected={selected} occurrences={occurrences} adjacentOccurrences={adjacentOccurrences} onMonth={changeMonth} onSelect={(selected) => { setCalendarDate({ month: selected.slice(0, 7), selected }); }} />
            <CustomText weight="bold" style={styles.agendaTitle}>{new Date(selected + "T00:00:00Z").toLocaleDateString("en-SG", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })}</CustomText>
            {loading && !cached && <ActivityIndicator color={Colors.darkGreenText} />}
            {(!loading || !!cached) && !error && agenda.length === 0 && <CustomText style={styles.subtitle}>No events planned!</CustomText>}
            {agenda.map((item) => {
                const event = item.kind === "event" ? item.occurrence : null;
                return <TouchableOpacity key={item.key} accessibilityLabel={`Open ${item.title}`} onPress={() => { if (item.kind === "holiday") setHolidayDetail(item.holiday); else setDetail(item.occurrence); setAction(null); setActionError(null); }} style={[styles.event, { borderLeftColor: Colors[item.colour] }]}>
                    <CustomText weight="bold" style={styles.eventTitle}>{item.title}</CustomText>
                    <CustomText style={styles.subtitle}>{event ? (event.is_all_day ? "All day" : `${timeInSingapore(event.starts_at!)} – ${timeInSingapore(event.ends_at!)}`) + (event.recurrence_rule ? " · Repeats" : "") : "Public holiday · All day"}</CustomText>
                    {event && occurrenceStart(event) !== occurrenceEnd(event) && <CustomText style={styles.subtitle}>{occurrenceStart(event)} – {occurrenceEnd(event)}</CustomText>}
                </TouchableOpacity>;
            })}
        </ScrollView>
        <FloatingAddButton accessibilityLabel="Add event" disabled={!spaceId} onPress={() => setEditor({})} />
        {holidayDetail && <CalendarHolidayDetails holiday={holidayDetail} onClose={() => setHolidayDetail(null)} />}
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
