import { useEffect, useState } from "react";
import { AppState, StyleSheet, TouchableOpacity, View } from "react-native";

import CustomText from "@/components/CustomText";
import { Colors } from "@/constants/colors";
import { dateInSingapore, formatCalendarDate } from "@/utils/calendar";

export const formatCalendarHeaderDate = formatCalendarDate;
export default function CalendarHeader({ onToday }: { onToday: () => void }) {
    const [today, setToday] = useState(dateInSingapore());
    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;
        const update = () => {
            clearTimeout(timer);
            const current = dateInSingapore();
            setToday(current);
            const midnight = Date.parse(current + "T00:00:00+08:00") + 86400000;
            timer = setTimeout(update, midnight - Date.now());
        };
        update();
        const subscription = AppState.addEventListener("change", (state) => { if (state === "active") update(); });
        return () => { clearTimeout(timer); subscription.remove(); };
    }, []);
    return <View style={styles.header}>
        <View><CustomText weight="extrabold" style={styles.title}>Calendar</CustomText>
            <CustomText weight="medium" style={styles.date}>{formatCalendarHeaderDate(today)}</CustomText></View>
        <TouchableOpacity accessibilityLabel="Go to today" onPress={onToday} hitSlop={10}><CustomText weight="bold" style={styles.date}>Today</CustomText></TouchableOpacity>
    </View>;
}
const styles = StyleSheet.create({
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20, gap: 14 },
    title: { fontSize: 24, color: Colors.darkGreenText },
    date: { fontSize: 12, color: Colors.darkGreenText },
});
