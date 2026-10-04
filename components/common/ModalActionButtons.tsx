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
    formLayout?: boolean;
}

const ModalActionButtons: React.FC<ModalActionButtonsProps> = ({
    onConfirm,
    onCancel,
    confirmLabel = "Yes",
    cancelLabel = "No",
    isConfirming = false,
    containerStyle,
    formLayout = false,
}) => {
    return (
        <View style={[styles.modalButtons, formLayout && styles.formButtons, containerStyle]}>
            <TouchableOpacity
                style={[styles.yesButton, formLayout && styles.formButton]}
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
                style={[styles.noButton, formLayout && styles.formButton]}
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
    formButtons: { flexDirection: "row-reverse", justifyContent: "flex-start", gap: 10, marginTop: 8 },
    formButton: { borderRadius: 10, minWidth: 88, width: undefined, height: 40, paddingHorizontal: 14 },
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
