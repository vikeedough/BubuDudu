import { ActivityIndicator, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";

import CenteredModal from "@/components/common/CenteredModal";
import CustomText from "@/components/CustomText";
import { Colors } from "@/constants/colors";
import { formatCalendarDate, occurrenceEnd, occurrenceStart, repeatDisplayLabel, timeInSingapore } from "@/utils/calendar";

import type { CalendarOccurrence, CalendarScope } from "@/types/calendar";

export default function CalendarEventDetails({ occurrence, action, busy, error, onAction, onScope, onClose }: {
    occurrence: CalendarOccurrence; action: "edit" | "delete" | null; busy: boolean; error: string | null;
    onAction: (action: "edit" | "delete" | null) => void; onScope: (scope: CalendarScope) => void; onClose: () => void;
}) {
    const start = occurrenceStart(occurrence);
    const end = occurrenceEnd(occurrence);
    const recurring = !!occurrence.recurrence_rule;
    return <CenteredModal isOpen dismissOnBackdrop onClose={onClose} containerStyle={styles.modal}>
        <ScrollView contentContainerStyle={styles.content}>
            <CustomText weight="extrabold" style={styles.title}>{occurrence.title}</CustomText>
            <View style={styles.group}>
                <CustomText weight="bold" style={styles.date}>{formatCalendarDate(start)}</CustomText>
                {end !== start && <CustomText weight="bold" style={styles.date}>to {formatCalendarDate(end)}</CustomText>}
                <CustomText style={styles.value}>{occurrence.is_all_day ? "All day" : `${timeInSingapore(occurrence.starts_at!)} – ${timeInSingapore(occurrence.ends_at!)}`}</CustomText>
            </View>
            {recurring && <View style={styles.metadata}>
                <CustomText weight="bold" style={styles.label}>Repeat</CustomText>
                <CustomText style={styles.value}>{repeatDisplayLabel(occurrence.recurrence_rule!)} · {occurrence.recurrence_end_date ? `until ${formatCalendarDate(occurrence.recurrence_end_date, false)}` : "Never ends"}</CustomText>
            </View>}
            {!!occurrence.reminder_days_before && <View style={styles.metadata}>
                <CustomText weight="bold" style={styles.label}>Reminder</CustomText>
                <CustomText style={styles.value}>{occurrence.reminder_days_before} {occurrence.reminder_days_before === 1 ? "day" : "days"} before</CustomText>
            </View>}
            {action ? <View style={styles.group}>
                <CustomText weight="bold" style={styles.label}>{action === "edit" ? "Edit" : "Delete"} {recurring ? "recurring event?" : "this event?"}</CustomText>
                {(recurring ? [["this", "This event"], ["future", "This event and future events"], ["all", "All events"]] as const : [["all", "Delete event"]] as const).map(([scope, label]) =>
                    <TouchableOpacity key={scope} disabled={busy} onPress={() => onScope(scope)} style={styles.button}>
                        <CustomText weight="bold" style={action === "delete" ? styles.destructive : styles.value}>{label}</CustomText>
                    </TouchableOpacity>)}
                <TouchableOpacity disabled={busy} onPress={() => onAction(null)} style={styles.cancel}><CustomText style={styles.value}>Cancel</CustomText></TouchableOpacity>
            </View> : <View style={styles.actions}>
                <TouchableOpacity onPress={() => onAction("edit")} style={[styles.button, styles.edit]}><CustomText weight="bold" style={styles.value}>Edit</CustomText></TouchableOpacity>
                <TouchableOpacity onPress={() => onAction("delete")} style={[styles.button, styles.delete]}><CustomText weight="bold" style={styles.destructive}>Delete</CustomText></TouchableOpacity>
            </View>}
            {busy && <ActivityIndicator color={Colors.darkGreenText} />}
            {error && <CustomText accessibilityRole="alert" style={styles.destructive}>{error}</CustomText>}
        </ScrollView>
    </CenteredModal>;
}
const styles = StyleSheet.create({
    modal: { width: 400, backgroundColor: Colors.white },
    content: { padding: 22, gap: 18 },
    title: { fontSize: 24, color: Colors.darkGreenText },
    date: { fontSize: 16, color: Colors.darkGreenText },
    group: { gap: 8 },
    metadata: { borderTopWidth: 1, borderTopColor: Colors.gray, paddingTop: 14, gap: 6 },
    label: { fontSize: 14, color: Colors.darkGreenText },
    value: { fontSize: 14, color: Colors.brownText },
    destructive: { fontSize: 14, color: Colors.red },
    actions: { flexDirection: "row", gap: 12 },
    button: { minHeight: 40, padding: 10, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: Colors.yellow },
    edit: { flex: 1 },
    delete: { flex: 1, backgroundColor: Colors.backgroundPink },
    cancel: { padding: 10, alignItems: "center" },
});
