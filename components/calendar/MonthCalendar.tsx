import { StyleSheet, TouchableOpacity, View } from "react-native";

import CustomText from "@/components/CustomText";
import { Colors } from "@/constants/colors";
import { addDays, dateInSingapore, occurrenceEnd, occurrenceStart } from "@/utils/calendar";

import type { CalendarOccurrence } from "@/types/calendar";

export function monthWindow(month: string) {
    const first = month + "-01";
    const from = addDays(first, -new Date(first + "T00:00:00Z").getUTCDay());
    return { from, to: addDays(from, 41) };
}
export default function MonthCalendar({ month, selected, occurrences, onSelect, onMonth }: {
    month: string; selected: string; occurrences: CalendarOccurrence[];
    onSelect: (date: string) => void; onMonth: (offset: number) => void;
}) {
    const { from } = monthWindow(month);
    const title = new Date(month + "-01T00:00:00Z").toLocaleDateString("en-SG", { month: "long", year: "numeric", timeZone: "UTC" });
    return <View style={styles.container}>
        <View style={styles.heading}>
            <TouchableOpacity accessibilityLabel="Previous month" onPress={() => onMonth(-1)} style={styles.arrow}><CustomText weight="bold">‹</CustomText></TouchableOpacity>
            <CustomText weight="bold" style={styles.title}>{title}</CustomText>
            <TouchableOpacity accessibilityLabel="Next month" onPress={() => onMonth(1)} style={styles.arrow}><CustomText weight="bold">›</CustomText></TouchableOpacity>
        </View>
        <View style={styles.grid}>{["S", "M", "T", "W", "T", "F", "S"].map((day, i) => <View key={i} style={styles.weekday}><CustomText style={styles.muted}>{day}</CustomText></View>)}</View>
        <View style={styles.grid}>{Array.from({ length: 42 }, (_, index) => {
            const date = addDays(from, index);
            const events = occurrences.filter((e) => occurrenceStart(e) <= date && occurrenceEnd(e) >= date);
            const active = date === selected;
            return <TouchableOpacity key={date} accessibilityRole="button" accessibilityLabel={`${date}, ${events.length} events`} accessibilityState={{ selected: active }}
                onPress={() => onSelect(date)} style={[styles.day, active && styles.selected, date === dateInSingapore() && styles.today]}>
                <CustomText weight={active ? "bold" : "medium"} style={[styles.dayText, !date.startsWith(month) && styles.muted]}>{Number(date.slice(8))}</CustomText>
                <View style={styles.dots}>{events.slice(0, 3).map((event) => <View key={event.key} style={[styles.dot, { backgroundColor: Colors[event.colour] }]} />)}{events.length > 3 && <CustomText style={styles.more}>+</CustomText>}</View>
            </TouchableOpacity>;
        })}</View>
    </View>;
}
const styles = StyleSheet.create({
    container: { backgroundColor: Colors.white, borderRadius: 15, padding: 8 },
    heading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
    arrow: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
    title: { fontSize: 17, color: Colors.darkGreenText },
    grid: { flexDirection: "row", flexWrap: "wrap" },
    weekday: { width: "14.2857%", alignItems: "center", paddingVertical: 6 },
    day: { width: "14.2857%", height: 48, alignItems: "center", justifyContent: "center", borderRadius: 10, borderWidth: 1, borderColor: "transparent" },
    dayText: { color: Colors.darkGreenText, fontSize: 14 },
    selected: { backgroundColor: Colors.yellow },
    today: { borderColor: Colors.green },
    muted: { color: Colors.gray, fontSize: 12 },
    dots: { height: 10, flexDirection: "row", gap: 3, alignItems: "center" },
    dot: { width: 5, height: 5, borderRadius: 3 },
    more: { fontSize: 9, color: Colors.darkGreenText },
});
