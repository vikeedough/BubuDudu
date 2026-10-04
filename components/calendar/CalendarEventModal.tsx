import { useState } from "react";
import { ScrollView, StyleSheet, Switch, TextInput, TouchableOpacity, View } from "react-native";

import CalendarSelect, { CalendarSelectModal } from "@/components/calendar/CalendarSelect";
import ModalActionButtons from "@/components/common/ModalActionButtons";
import WheelTimePicker from "@/components/common/WheelTimePicker";
import CustomText from "@/components/CustomText";
import ExpenseDatePicker from "@/components/expenses/ExpenseDatePicker";
import { Colors } from "@/constants/colors";
import { CALENDAR_COLOURS, CALENDAR_TIMEZONE, dateInSingapore, oneCalendarYearAfter, parseRule, timeInSingapore, validateDraft } from "@/utils/calendar";

import type { CalendarDraft, Frequency } from "@/types/calendar";

const REPEATS = [
    ["Never", ""], ["Daily", "FREQ=DAILY"], ["Weekly", "FREQ=WEEKLY"],
    ["Every 2 weeks", "FREQ=WEEKLY;INTERVAL=2"], ["Monthly", "FREQ=MONTHLY"], ["Yearly", "FREQ=YEARLY"], ["Custom", "custom"],
] as const;
const REMINDERS = [["None", ""], ["1 day before", "1"], ["2 days before", "2"], ["1 week before", "7"], ["Custom", "custom"]] as const;
const FREQUENCIES = [["Days", "DAILY"], ["Weeks", "WEEKLY"], ["Months", "MONTHLY"], ["Years", "YEARLY"]] as const;
type Picker = "startDate" | "endDate" | "startTime" | "endTime" | "repeat" | "reminder" | "recurrenceEnd";
const PICKER_TITLES: Record<Picker, string> = {
    startDate: "Start date", endDate: "End date", startTime: "Start time", endTime: "End time",
    repeat: "Custom repeat", reminder: "Custom reminder",
    recurrenceEnd: "Repeat ends",
};
// ExpenseDatePicker consumes local date-only values. Transfer calendar components,
// not UTC instants, so picking a date never changes it on a device outside Singapore.
function pickerDate(value: string) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
}
function dateKey(value: Date) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}
function dateLabel(value: string) {
    return new Date(value + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}
function validateReminder(value: string) {
    if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) < 1 || Number(value) > 2147483647) {
        throw new Error("Enter reminder days from 1 to 2147483647.");
    }
}
export default function CalendarEventModal({ initial, date, single, onClose, onSave }: {
    initial?: CalendarDraft; date: string; single: boolean;
    onClose: () => void; onSave: (draft: CalendarDraft) => Promise<void>;
}) {
    const [title, setTitle] = useState(initial?.title ?? "");
    const [allDay, setAllDay] = useState(initial?.is_all_day ?? false);
    const [startDate, setStartDate] = useState(initial ? initial.is_all_day ? initial.start_date! : dateInSingapore(initial.starts_at!) : date);
    const [endDate, setEndDate] = useState(initial ? initial.is_all_day ? initial.end_date! : dateInSingapore(initial.ends_at!) : date);
    const [startTime, setStartTime] = useState(initial?.starts_at ? timeInSingapore(initial.starts_at) : "09:00");
    const [endTime, setEndTime] = useState(initial?.ends_at ? timeInSingapore(initial.ends_at) : "10:00");
    const [colour, setColour] = useState(initial?.colour ?? "pink");
    const rule = initial?.recurrence_rule ?? "";
    const parsed = parseRule(rule);
    const [repeat, setRepeat] = useState(REPEATS.some(([, value]) => value === rule) ? rule : "custom");
    const [recurrenceEnd, setRecurrenceEnd] = useState(initial?.recurrence_end_date ?? null);
    const [pendingNeverEnds, setPendingNeverEnds] = useState(false);
    const changeRepeat = (value: string) => {
        if (value === "") setRecurrenceEnd(null);
        else if (!initial && repeat === "") setRecurrenceEnd(oneCalendarYearAfter(startDate));
        setRepeat(value);
    };
    const [frequency, setFrequency] = useState<Frequency>(parsed?.frequency ?? "WEEKLY");
    const [interval, setInterval] = useState(String(parsed?.interval ?? 1));
    const reminderValue = initial?.reminder_days_before == null || initial.reminder_days_before === 0 ? "" : String(initial.reminder_days_before);
    const [reminder, setReminder] = useState(REMINDERS.some(([, value]) => value === reminderValue) ? reminderValue : "custom");
    const [customReminder, setCustomReminder] = useState(reminderValue || "3");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [picker, setPicker] = useState<Picker | null>(null);
    const [pendingDate, setPendingDate] = useState(pickerDate(date));
    const [pendingTime, setPendingTime] = useState("09:00");
    const [pendingFrequency, setPendingFrequency] = useState<Frequency>(frequency);
    const [pendingInterval, setPendingInterval] = useState(interval);
    const [pendingReminder, setPendingReminder] = useState(customReminder);
    const [pickerError, setPickerError] = useState<string | null>(null);
    const openPicker = (next: Picker) => {
        setPickerError(null);
        if (next === "startDate" || next === "endDate") setPendingDate(pickerDate(next === "startDate" ? startDate : endDate));
        if (next === "startTime" || next === "endTime") setPendingTime(next === "startTime" ? startTime : endTime);
        if (next === "recurrenceEnd") {
            setPendingDate(pickerDate(recurrenceEnd ?? oneCalendarYearAfter(startDate)));
            setPendingNeverEnds(recurrenceEnd === null);
        }
        setPendingFrequency(frequency); setPendingInterval(interval); setPendingReminder(customReminder);
        setPicker(next);
    };
    const confirmPicker = () => {
        try {
            if (picker === "startDate") setStartDate(dateKey(pendingDate));
            if (picker === "endDate") setEndDate(dateKey(pendingDate));
            if (picker === "startTime") setStartTime(pendingTime);
            if (picker === "endTime") setEndTime(pendingTime);
            if (picker === "repeat") {
                parseRule(`FREQ=${pendingFrequency};INTERVAL=${pendingInterval}`);
                setFrequency(pendingFrequency); setInterval(pendingInterval); changeRepeat("custom");
            }
            if (picker === "reminder") {
                validateReminder(pendingReminder);
                setCustomReminder(pendingReminder); setReminder("custom");
            }
            if (picker === "recurrenceEnd") {
                const end = pendingNeverEnds ? null : dateKey(pendingDate);
                if (end && end < startDate) throw new Error("Recurrence end must be on or after the event start date.");
                setRecurrenceEnd(end);
            }
            setPicker(null);
        } catch (e) { setPickerError(e instanceof Error ? e.message : "Check your selection."); }
    };
    const save = async () => {
        setError(null);
        try {
            const reminderText = reminder === "custom" ? customReminder : reminder;
            if (reminderText !== "") validateReminder(reminderText);
            const draft: CalendarDraft = {
                title: title.trim(), description: null, colour, is_all_day: allDay,
                start_date: allDay ? startDate : null, end_date: allDay ? endDate : null,
                starts_at: allDay ? null : new Date(`${startDate}T${startTime}:00+08:00`).toISOString(),
                ends_at: allDay ? null : new Date(`${endDate}T${endTime}:00+08:00`).toISOString(),
                timezone: CALENDAR_TIMEZONE,
                recurrence_rule: single ? initial?.recurrence_rule ?? null : repeat === "custom" ? `FREQ=${frequency};INTERVAL=${interval}` : repeat || null,
                recurrence_end_date: single ? initial?.recurrence_end_date ?? null : repeat ? recurrenceEnd : null,
                reminder_days_before: reminderText === "" ? null : Number(reminderText),
            };
            validateDraft(single ? { ...draft, recurrence_end_date: null } : draft);
            setBusy(true);
            await onSave(draft);
            onClose();
        } catch (e) { setError(e instanceof Error ? e.message : "Could not save the event. Please retry."); }
        finally { setBusy(false); }
    };
    // Replace the editor surface while picking; avoid stacked native modals on iOS.
    if (picker) return <CalendarSelectModal isOpen onClose={() => setPicker(null)} useKeyboardAvoidingView containerStyle={styles.modal}>
        <View testID="calendar-picker-modal" style={styles.pickerForm}>
            <CustomText weight="extrabold" style={styles.heading}>{PICKER_TITLES[picker]}</CustomText>
            {(picker === "startDate" || picker === "endDate") && <ExpenseDatePicker compact today={pickerDate(dateInSingapore())} value={pendingDate} onChange={setPendingDate} maxYear={Math.max(2100, pendingDate.getFullYear())} />}
            {(picker === "startTime" || picker === "endTime") && <WheelTimePicker value={pendingTime} onChange={setPendingTime} />}
            {picker === "recurrenceEnd" && <>
                <View style={styles.toggle}><CustomText style={styles.label}>Never ends</CustomText><Switch accessibilityLabel="Never ends" value={pendingNeverEnds} onValueChange={setPendingNeverEnds} trackColor={{ true: Colors.green }} /></View>
                {!pendingNeverEnds && <ExpenseDatePicker compact today={pickerDate(dateInSingapore())} value={pendingDate} onChange={setPendingDate} maxYear={Math.max(2100, pendingDate.getFullYear())} />}
            </>}
            {picker === "repeat" && <>
                <CustomText style={styles.label}>Repeat every</CustomText>
                <TextInput accessibilityLabel="Repeat interval" style={styles.input} keyboardType="number-pad" value={pendingInterval} onChangeText={setPendingInterval} maxLength={4} />
                <CalendarSelect label="Repeat unit" options={FREQUENCIES} value={pendingFrequency} onChange={(value) => setPendingFrequency(value as Frequency)} />
            </>}
            {picker === "reminder" && <>
                <CustomText style={styles.label}>Days before</CustomText>
                <TextInput accessibilityLabel="Reminder days before" style={styles.input} keyboardType="number-pad" value={pendingReminder} onChangeText={setPendingReminder} maxLength={10} />
            </>}
            {pickerError && <CustomText accessibilityRole="alert" style={styles.error}>{pickerError}</CustomText>}
            <ModalActionButtons formLayout onConfirm={confirmPicker} onCancel={() => setPicker(null)} confirmLabel="Confirm" cancelLabel="Cancel" />
        </View>
    </CalendarSelectModal>;
    return <CalendarSelectModal isOpen onClose={() => { if (!busy) onClose(); }} useKeyboardAvoidingView containerStyle={styles.modal}>
        <ScrollView testID="calendar-event-form" keyboardShouldPersistTaps="handled" contentContainerStyle={styles.form}>
            <CustomText weight="extrabold" style={styles.heading}>{initial ? "Edit event" : "New event"}</CustomText>
            {single && <CustomText style={styles.hint}>This occurrence only</CustomText>}
            <View style={styles.field}>
                <CustomText weight="semibold" style={styles.label}>Title</CustomText>
                <TextInput accessibilityLabel="Event title" value={title} onChangeText={setTitle} maxLength={200} placeholder="Something to look forward to" style={styles.input} />
            </View>
            <View style={styles.toggle}><CustomText weight="semibold" style={styles.label}>All day</CustomText><Switch accessibilityLabel="All day" value={allDay} onValueChange={setAllDay} trackColor={{ true: Colors.green }} /></View>
            {(["Start", "End"] as const).map((label) => <View key={label} style={styles.row}>
                <CustomText weight="semibold" style={styles.rowLabel}>{label}</CustomText>
                <TouchableOpacity accessibilityLabel={`${label} date`} accessibilityRole="button" style={[styles.input, styles.dateControl]} onPress={() => openPicker(label === "Start" ? "startDate" : "endDate")}>
                    <CustomText style={styles.value}>{dateLabel(label === "Start" ? startDate : endDate)}</CustomText>
                </TouchableOpacity>
                {!allDay && <TouchableOpacity accessibilityLabel={`${label} time`} accessibilityRole="button" style={[styles.input, styles.timeControl]} onPress={() => openPicker(label === "Start" ? "startTime" : "endTime")}>
                    <CustomText style={styles.value}>{label === "Start" ? startTime : endTime}</CustomText>
                </TouchableOpacity>}
            </View>)}
            <View style={styles.field}>
                <CustomText weight="semibold" style={styles.label}>Colour</CustomText>
                <View style={styles.colours}>{CALENDAR_COLOURS.map((key) => <TouchableOpacity key={key} accessibilityLabel={`${key} colour`} accessibilityRole="button" accessibilityState={{ selected: key === colour }} onPress={() => setColour(key)} style={styles.swatchTarget}>
                    <View style={[styles.swatch, { backgroundColor: Colors[key], borderColor: colour === key ? Colors.brownText : "transparent", opacity: colour === key ? 1 : 0.65 }]} />
                </TouchableOpacity>)}</View>
            </View>
            {!single && <CalendarSelect label="Repeat" options={REPEATS} value={repeat} onChange={(value) => { if (value === "custom") openPicker("repeat"); else changeRepeat(value); }} />}
            {!single && repeat !== "" && <View style={styles.row}>
                <CustomText weight="semibold" style={styles.label}>Ends</CustomText>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel="Recurrence ends" style={[styles.input, styles.dateControl]} onPress={() => openPicker("recurrenceEnd")}>
                    <CustomText style={styles.value}>{recurrenceEnd ? dateLabel(recurrenceEnd) : "Never ends"}</CustomText>
                </TouchableOpacity>
            </View>}
            <CalendarSelect label="Telegram reminder" options={REMINDERS} value={reminder} onChange={(value) => { if (value === "custom") openPicker("reminder"); else setReminder(value); }} />
            {error && <CustomText accessibilityRole="alert" style={styles.error}>{error}</CustomText>}
            <ModalActionButtons formLayout onConfirm={() => { void save(); }} onCancel={onClose} confirmLabel="Save" cancelLabel="Cancel" isConfirming={busy} />
        </ScrollView>
    </CalendarSelectModal>;
}
const styles = StyleSheet.create({
    modal: { width: 430, maxWidth: "90%", maxHeight: "92%", backgroundColor: Colors.white },
    form: { padding: 22, gap: 10 },
    pickerForm: { padding: 22, gap: 14 },
    heading: { fontSize: 22, color: Colors.darkGreenText, marginBottom: 4 },
    label: { fontSize: 12, color: Colors.darkGreenText },
    rowLabel: { width: 36, fontSize: 12, color: Colors.darkGreenText },
    field: { gap: 6 },
    input: { minHeight: 42, borderWidth: 1, borderColor: "#EBEAEC", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: Colors.white, fontSize: 14, fontFamily: "Raleway-Regular", color: Colors.darkGreenText, justifyContent: "center" },
    value: { fontSize: 14, color: Colors.darkGreenText },
    hint: { fontSize: 12, color: Colors.brownText },
    toggle: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    row: { flexDirection: "row", gap: 8, alignItems: "center" },
    dateControl: { flex: 1, alignItems: "center" },
    timeControl: { width: 74, alignItems: "center" },
    colours: { flexDirection: "row", flexWrap: "wrap" },
    swatchTarget: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
    swatch: { height: 24, width: 24, borderRadius: 12, borderWidth: 2 },
    error: { color: Colors.red, fontSize: 13 },
});
