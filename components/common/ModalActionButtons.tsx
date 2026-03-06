import React from "react";
import {
    ActivityIndicator,
    StyleProp,
    StyleSheet,
    TouchableOpacity,
    View,
    ViewStyle,
} from "react-native";

import CustomText from "@/components/CustomText";
import { Colors } from "@/constants/colors";

interface ModalActionButtonsProps {
    onConfirm: () => void;
    onCancel: () => void;
    confirmLabel?: string;
    cancelLabel?: string;
    isConfirming?: boolean;
    containerStyle?: StyleProp<ViewStyle>;
}

const ModalActionButtons: React.FC<ModalActionButtonsProps> = ({
    onConfirm,
    onCancel,
    confirmLabel = "Yes",
    cancelLabel = "No",
    isConfirming = false,
    containerStyle,
}) => {
    return (
        <View style={[styles.modalButtons, containerStyle]}>
            <TouchableOpacity
                style={styles.yesButton}
                onPress={onConfirm}
                disabled={isConfirming}
            >
                {isConfirming ? (
                    <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                    <CustomText weight="semibold" style={styles.modalButtonText}>
                        {confirmLabel}
                    </CustomText>
                )}
            </TouchableOpacity>
            <TouchableOpacity
                style={styles.noButton}
                onPress={onCancel}
                disabled={isConfirming}
            >
                <CustomText weight="semibold" style={styles.modalButtonText}>
                    {cancelLabel}
                </CustomText>
            </TouchableOpacity>
        </View>
    );
};

export default ModalActionButtons;

const styles = StyleSheet.create({
    modalButtons: {
        flexDirection: "row",
        gap: 25,
        justifyContent: "center",
    },
    yesButton: {
        backgroundColor: "#FFCC7D",
        borderRadius: 15,
        padding: 10,
        width: 83,
        justifyContent: "center",
        alignItems: "center",
    },
    noButton: {
        backgroundColor: "#AFAFAF",
        borderRadius: 15,
        padding: 10,
        width: 83,
        justifyContent: "center",
        alignItems: "center",
    },
    modalButtonText: {
        color: Colors.brownText,
        fontSize: 14,
    },
});
