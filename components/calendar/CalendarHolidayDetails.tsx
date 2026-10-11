import { StyleSheet, View } from "react-native";

import CenteredModal from "@/components/common/CenteredModal";
import CustomText from "@/components/CustomText";
import { Colors } from "@/constants/colors";
import { formatCalendarDate } from "@/utils/calendar";

import type { SingaporePublicHoliday } from "@/data/singaporePublicHolidays";

export default function CalendarHolidayDetails({ holiday, onClose }: { holiday: SingaporePublicHoliday; onClose: () => void }) {
    return <CenteredModal isOpen dismissOnBackdrop onClose={onClose} containerStyle={styles.modal}>
        <View style={styles.content}>
            <CustomText weight="extrabold" style={styles.title}>{holiday.name}</CustomText>
            <CustomText weight="bold" style={styles.date}>{formatCalendarDate(holiday.date)}</CustomText>
            <CustomText style={styles.value}>Singapore Public Holiday</CustomText>
        </View>
    </CenteredModal>;
}
const styles = StyleSheet.create({
    modal: { width: 400, backgroundColor: Colors.white },
    content: { padding: 22, gap: 18 },
    title: { fontSize: 24, color: Colors.darkGreenText },
    date: { fontSize: 16, color: Colors.darkGreenText },
    value: { fontSize: 14, color: Colors.brownText },
});
