import React from "react";
import { StyleProp, StyleSheet, TouchableOpacity, ViewStyle } from "react-native";

import { Colors } from "@/constants/colors";

interface GalleryControlButtonProps {
    onPress: () => void;
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    disabled?: boolean;
    accessibilityLabel?: string;
}

const GalleryControlButton: React.FC<GalleryControlButtonProps> = ({
    onPress,
    children,
    style,
    disabled = false,
    accessibilityLabel,
}) => {
    return (
        <TouchableOpacity
            accessibilityLabel={accessibilityLabel}
            accessibilityRole="button"
            disabled={disabled}
            style={[
                styles.controlButton,
                disabled && styles.controlButtonDisabled,
                style,
            ]}
            onPress={onPress}
        >
            {children}
        </TouchableOpacity>
    );
};

export default GalleryControlButton;

const styles = StyleSheet.create({
    controlButton: {
        backgroundColor: Colors.white,
        borderRadius: 999,
        padding: 10,
        height: 40,
        width: 40,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#EBEAEC",
    },
    controlButtonDisabled: {
        opacity: 0.45,
    },
});
