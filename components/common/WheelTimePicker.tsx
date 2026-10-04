import { StyleSheet, View } from "react-native";

import PickerWheel from "@/components/common/PickerWheel";
import CustomText from "@/components/CustomText";
import { Colors } from "@/constants/colors";

const HOURS = Array.from({ length: 24 }, (_, index) => index);
const MINUTES = Array.from({ length: 60 }, (_, index) => index);
const pad = (value: number) => String(value).padStart(2, "0");

export default function WheelTimePicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
    const [hour, minute] = value.split(":").map(Number);
    const common = { width: 92, renderText: pad, textColor: Colors.darkGreenText, dimTextColor: "rgba(76,90,69,0.28)" };
    return <View style={styles.card}>
        <View style={styles.labels}><CustomText style={styles.label}>Hour</CustomText><CustomText style={styles.label}>Minute</CustomText></View>
        <View style={styles.wheels}>
            <View pointerEvents="none" style={styles.shadow} />
            <View pointerEvents="none" style={styles.highlight} />
            <PickerWheel {...common} accessibilityLabel="Hour" data={HOURS} value={hour} onPick={(next) => onChange(`${pad(next)}:${pad(minute)}`)} />
            <PickerWheel {...common} accessibilityLabel="Minute" data={MINUTES} value={minute} onPick={(next) => onChange(`${pad(hour)}:${pad(next)}`)} />
        </View>
    </View>;
}
const styles = StyleSheet.create({
    card: { borderWidth: 1, borderColor: "#EBEAEC", borderRadius: 10, padding: 10, backgroundColor: Colors.white },
    labels: { flexDirection: "row", justifyContent: "center", gap: 10, marginBottom: 6 },
    label: { width: 92, textAlign: "center", fontSize: 12, color: Colors.darkGreenText },
    wheels: { flexDirection: "row", justifyContent: "center", gap: 10 },
    highlight: { position: "absolute", left: 0, right: 0, top: 30, height: 30, borderRadius: 10, backgroundColor: "#EEF0EB" },
    shadow: { position: "absolute", left: 2, right: 2, top: 32, height: 30, borderRadius: 10, backgroundColor: "rgba(0,0,0,0.12)" },
});
