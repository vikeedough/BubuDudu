import { StyleSheet } from "react-native";

import { Colors } from "@/constants/colors";
import { shadowStyle } from "@/constants/shadows";

export const settingsScreenStyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.backgroundPink,
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingTop: 22,
        paddingBottom: 42,
        gap: 16,
    },
    header: {
        gap: 5,
        marginBottom: 2,
    },
    title: {
        fontSize: 24,
        color: Colors.darkGreenText,
    },
    subtitle: {
        fontSize: 13,
        lineHeight: 18,
        color: Colors.darkGreenText,
        opacity: 0.72,
    },
    card: {
        backgroundColor: Colors.white,
        borderRadius: 15,
        padding: 16,
        ...shadowStyle,
    },
    formCard: {
        gap: 14,
    },
    sectionTitle: {
        color: Colors.darkGreenText,
        fontSize: 16,
    },
    sectionCaption: {
        color: Colors.darkGreenText,
        fontSize: 12,
        lineHeight: 17,
        opacity: 0.68,
    },
    actionsRow: {
        flexDirection: "row",
        justifyContent: "flex-end",
        alignItems: "center",
        gap: 10,
        marginTop: 2,
    },
    primaryButton: {
        minHeight: 42,
        minWidth: 118,
        borderRadius: 12,
        backgroundColor: "#FFCC7D",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 18,
        ...shadowStyle,
    },
    primaryButtonText: {
        color: Colors.brownText,
        fontSize: 14,
    },
    disabled: {
        opacity: 0.55,
    },
});
