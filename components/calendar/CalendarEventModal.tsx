import DateTimePicker from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Platform, ScrollView, StyleSheet, Switch, TextInput, TouchableOpacity, View } from "react-native";

import CenteredModal from "@/components/common/CenteredModal";
import ModalActionButtons from "@/components/common/ModalActionButtons";
import CustomText from "@/components/CustomText";
import { Colors } from "@/constants/colors";
import { CALENDAR_COLOURS, CALENDAR_TIMEZONE, dateInSingapore, parseRule, timeInSingapore, validateDraft } from "@/utils/calendar";

import type { CalendarDraft, CalendarFields, Frequency } from "@/types/calendar";

const REPEATS = [
    ["Never", ""], ["Daily", "FREQ=DAILY"], ["Weekly", "FREQ=WEEKLY"],
    ["Every 2 weeks", "FREQ=WEEKLY;INTERVAL=2"], ["Monthly", "FREQ=MONTHLY"], ["Yearly", "FREQ=YEARLY"], ["Custom", "custom"],
] as const;
const REMINDERS = [["None", ""], ["On the day", "0"], ["1 day", "1"], ["2 days", "2"], ["1 week", "7"], ["Custom", "custom"]] as const;

function Choice({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
    return <TouchableOpacity accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={[styles.choice, selected && styles.chosen]}><CustomText style={styles.choiceText}>{label}</CustomText></TouchableOpacity>;
}
function DateField({ label, value, mode, onChange }: { label: string; value: string; mode: "date" | "time"; onChange: (value: string) => void }) {
    const [open, setOpen] = useState(false);
    const date = mode === "date" ? new Date(value + "T12:00:00+08:00") : new Date(`2000-01-01T${value}:00+08:00`);
    return <View style={styles.dateField}>
        <CustomText weight="semibold" style={styles.label}>{label}</CustomText>
        {Platform.OS === "web" ? <TextInput accessibilityLabel={label} style={styles.input} value={value} onChangeText={onChange} placeholder={mode === "date" ? "YYYY-MM-DD" : "HH:mm"} /> :
            <TouchableOpacity accessibilityLabel={label} onPress={() => setOpen(true)} style={styles.input}><CustomText style={styles.value}>{value}</CustomText></TouchableOpacity>}
        {open && <DateTimePicker value={Number.isFinite(date.getTime()) ? date : new Date()} mode={mode} timeZoneName={CALENDAR_TIMEZONE} is24Hour display="default" onChange={(_event, selected) => {
            setOpen(false);
            if (selected) onChange(mode === "date" ? dateInSingapore(selected) : timeInSingapore(selected.toISOString()));
        }} />}
    </View>;
}
export default function CalendarEventModal({ initial, date, single, onClose, onSave }: {
    initial?: CalendarFields & { recurrence_rule: string | null }; date: string; single: boolean;
    onClose: () => void; onSave: (draft: CalendarDraft) => Promise<void>;
}) {
    const [title, setTitle] = useState(initial?.title ?? "");
    const [description, setDescription] = useState(initial?.description ?? "");
    const [allDay, setAllDay] = useState(initial?.is_all_day ?? false);
    const [startDate, setStartDate] = useState(initial ? initial.is_all_day ? initial.start_date! : dateInSingapore(initial.starts_at!) : date);
    const [endDate, setEndDate] = useState(initial ? initial.is_all_day ? initial.end_date! : dateInSingapore(initial.ends_at!) : date);
    const [startTime, setStartTime] = useState(initial?.starts_at ? timeInSingapore(initial.starts_at) : "09:00");
    const [endTime, setEndTime] = useState(initial?.ends_at ? timeInSingapore(initial.ends_at) : "10:00");
    const [colour, setColour] = useState(initial?.colour ?? "pink");
    const rule = initial?.recurrence_rule ?? "";
    const parsed = parseRule(rule);
    const [repeat, setRepeat] = useState(REPEATS.some(([, value]) => value === rule) ? rule : "custom");
    const [frequency, setFrequency] = useState<Frequency>(parsed?.frequency ?? "WEEKLY");
    const [interval, setInterval] = useState(String(parsed?.interval ?? 1));
    const reminderValue = initial?.reminder_days_before == null ? "" : String(initial.reminder_days_before);
    const [reminder, setReminder] = useState(REMINDERS.some(([, value]) => value === reminderValue) ? reminderValue : "custom");
    const [customReminder, setCustomReminder] = useState(reminderValue || "3");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const save = async () => {
        setError(null);
        try {
            const reminderText = reminder === "custom" ? customReminder : reminder;
            if (reminderText !== "" && !/^\d+$/.test(reminderText)) throw new Error("Enter a non-negative whole number of reminder days.");
            if (reminder === "custom" && !customReminder) throw new Error("Enter reminder days.");
            if (!allDay && (!/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(endTime))) throw new Error("Enter both times as HH:mm.");
            const draft: CalendarDraft = {
                title: title.trim(), description: description.trim() || null, colour, is_all_day: allDay,
                start_date: allDay ? startDate : null, end_date: allDay ? endDate : null,
                starts_at: allDay ? null : new Date(`${startDate}T${startTime}:00+08:00`).toISOString(),
                ends_at: allDay ? null : new Date(`${endDate}T${endTime}:00+08:00`).toISOString(),
                timezone: CALENDAR_TIMEZONE,
                recurrence_rule: single ? initial?.recurrence_rule ?? null : repeat === "custom" ? `FREQ=${frequency};INTERVAL=${interval}` : repeat || null,
                reminder_days_before: reminderText === "" ? null : Number(reminderText),
            };
            validateDraft(draft);
            setBusy(true);
            await onSave(draft);
            onClose();
        } catch (e) { setError(e instanceof Error ? e.message : "Could not save the event. Please retry."); }
        finally { setBusy(false); }
    };
    return <CenteredModal isOpen onClose={() => { if (!busy) onClose(); }} useKeyboardAvoidingView containerStyle={styles.modal}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.form}>
            <CustomText weight="extrabold" style={styles.heading}>{initial ? "Edit event" : "New event"}</CustomText>
            {single && <CustomText style={styles.hint}>This occurrence only</CustomText>}
            <CustomText weight="semibold" style={styles.label}>Title</CustomText>
            <TextInput accessibilityLabel="Event title" value={title} onChangeText={setTitle} maxLength={200} placeholder="Something to look forward to" style={styles.input} />
            <View style={styles.toggle}><CustomText weight="semibold" style={styles.label}>All day</CustomText><Switch accessibilityLabel="All day" value={allDay} onValueChange={setAllDay} trackColor={{ true: Colors.green }} /></View>
            <View style={styles.row}><DateField label="Start date" mode="date" value={startDate} onChange={setStartDate} /><DateField label="End date" mode="date" value={endDate} onChange={setEndDate} /></View>
            {!allDay && <View style={styles.row}><DateField label="Start time" mode="time" value={startTime} onChange={setStartTime} /><DateField label="End time" mode="time" value={endTime} onChange={setEndTime} /></View>}
            <CustomText style={styles.hint}>Singapore time · GMT+8</CustomText>
            <CustomText weight="semibold" style={styles.label}>Colour</CustomText>
            <View style={styles.choices}>{CALENDAR_COLOURS.map((key) => <TouchableOpacity key={key} accessibilityLabel={`${key} colour`} accessibilityRole="button" accessibilityState={{ selected: key === colour }} onPress={() => setColour(key)} style={[styles.swatch, { backgroundColor: Colors[key], borderColor: colour === key ? Colors.darkGreenText : "transparent" }]} />)}</View>
            {!single && <>
                <CustomText weight="semibold" style={styles.label}>Repeat</CustomText>
                <View style={styles.choices}>{REPEATS.map(([label, value]) => <Choice key={value} label={label} selected={repeat === value} onPress={() => setRepeat(value)} />)}</View>
                {repeat === "custom" && <>
                    <CustomText style={styles.hint}>Repeat every</CustomText>
                    <TextInput accessibilityLabel="Repeat interval" style={styles.input} keyboardType="number-pad" value={interval} onChangeText={setInterval} maxLength={4} />
                    <View style={styles.choices}>{(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"] as const).map((freq, i) => <Choice key={freq} label={["Days", "Weeks", "Months", "Years"][i]} selected={frequency === freq} onPress={() => setFrequency(freq)} />)}</View>
                </>}
            </>}
            <CustomText weight="semibold" style={styles.label}>Telegram reminder</CustomText>
            <View style={styles.choices}>{REMINDERS.map(([label, value]) => <Choice key={value} label={label} selected={reminder === value} onPress={() => setReminder(value)} />)}</View>
            {reminder === "custom" && <><CustomText style={styles.hint}>Days before</CustomText><TextInput accessibilityLabel="Reminder days before" style={styles.input} keyboardType="number-pad" value={customReminder} onChangeText={setCustomReminder} maxLength={10} /></>}
            <CustomText style={styles.hint}>Today’s events always appear in the 05:00 group digest.</CustomText>
            <CustomText weight="semibold" style={styles.label}>Description</CustomText>
            <TextInput accessibilityLabel="Description" value={description} onChangeText={setDescription} multiline style={[styles.input, styles.description]} />
            {error && <CustomText accessibilityRole="alert" style={styles.error}>{error}</CustomText>}
            <ModalActionButtons onConfirm={() => { void save(); }} onCancel={onClose} confirmLabel="Save" cancelLabel="Cancel" isConfirming={busy} />
        </ScrollView>
    </CenteredModal>;
}
const styles = StyleSheet.create({
    modal: { width: 430, backgroundColor: Colors.backgroundPink },
    form: { padding: 20, gap: 14 },
    heading: { fontSize: 22, color: Colors.darkGreenText },
    label: { fontSize: 13, color: Colors.darkGreenText },
    input: { minHeight: 44, borderWidth: 1, borderColor: "#EBEAEC", borderRadius: 10, padding: 12, backgroundColor: Colors.white, fontFamily: "Raleway-Medium", color: Colors.darkGreenText },
    value: { fontSize: 14, color: Colors.darkGreenText },
    hint: { fontSize: 12, color: Colors.brownText },
    toggle: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    row: { flexDirection: "row", gap: 12 },
    dateField: { flex: 1, gap: 8 },
    choices: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    choice: { minHeight: 40, paddingHorizontal: 12, paddingVertical: 11, borderRadius: 10, backgroundColor: Colors.white },
    chosen: { backgroundColor: Colors.yellow },
    choiceText: { fontSize: 12, color: Colors.darkGreenText },
    swatch: { height: 36, width: 36, borderRadius: 18, borderWidth: 3 },
    description: { minHeight: 90, textAlignVertical: "top" },
    error: { color: Colors.red, fontSize: 13 },
});
