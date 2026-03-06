import React from "react";
import { StyleProp, StyleSheet, TouchableOpacity, ViewStyle } from "react-native";

import { Colors } from "@/constants/colors";

interface GalleryControlButtonProps {
    onPress: () => void;
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
}

const GalleryControlButton: React.FC<GalleryControlButtonProps> = ({
    onPress,
    children,
    style,
}) => {
    return (
        <TouchableOpacity style={[styles.controlButton, style]} onPress={onPress}>
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
        height: 30,
        width: 30,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#EBEAEC",
    },
});
