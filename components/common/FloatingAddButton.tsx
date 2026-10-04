import React from "react";
import { StyleSheet, TouchableOpacity } from "react-native";

import Plus from "@/assets/svgs/plus.svg";
import { Colors } from "@/constants/colors";

export default function FloatingAddButton({ onPress, accessibilityLabel, disabled, floating = true, activeOpacity, children }: {
    onPress: () => void; accessibilityLabel: string; disabled?: boolean;
    floating?: boolean; activeOpacity?: number; children?: React.ReactNode;
}) {
    return <TouchableOpacity accessibilityRole="button" accessibilityLabel={accessibilityLabel}
        onPress={onPress} disabled={disabled} activeOpacity={activeOpacity}
        style={[styles.button, floating && styles.position]}>
        {children ?? <Plus />}
    </TouchableOpacity>;
}
const styles = StyleSheet.create({
    position: { position: "absolute", right: 22, bottom: 120, zIndex: 10 },
    button: {
        width: 54, height: 54, borderRadius: 999, backgroundColor: "#FFCC7D",
        alignItems: "center", justifyContent: "center", shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.22, shadowRadius: 5, elevation: 6,
    },
});
