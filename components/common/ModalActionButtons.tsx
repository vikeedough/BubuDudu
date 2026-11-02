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
    allowFontScaling?: boolean;
}

const ModalActionButtons: React.FC<ModalActionButtonsProps> = ({
    onConfirm,
    onCancel,
    confirmLabel = "Yes",
    cancelLabel = "No",
    isConfirming = false,
    containerStyle,
    formLayout = false,
    allowFontScaling = false,
}) => {
    return (
        <View style={[styles.modalButtons, formLayout && styles.formButtons, containerStyle]}>
            <TouchableOpacity
                style={[styles.yesButton, formLayout && styles.formButton, allowFontScaling && styles.galleryButton]}
                accessibilityRole="button"
                accessibilityLabel={confirmLabel}
                accessibilityState={{ busy: isConfirming, disabled: isConfirming }}
                onPress={onConfirm}
                disabled={isConfirming}
            >
                {isConfirming ? (
                    <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                    <CustomText allowFontScaling={allowFontScaling} maxFontSizeMultiplier={1.5} weight="semibold" style={[styles.modalButtonText, allowFontScaling && { color: Colors.darkGreenText }]}>
                        {confirmLabel}
                    </CustomText>
                )}
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.noButton, formLayout && styles.formButton, allowFontScaling && styles.galleryButton]}
                accessibilityRole="button"
                accessibilityLabel={cancelLabel}
                accessibilityState={{ disabled: isConfirming }}
                onPress={onCancel}
                disabled={isConfirming}
            >
                <CustomText allowFontScaling={allowFontScaling} maxFontSizeMultiplier={1.5} weight="semibold" style={[styles.modalButtonText, allowFontScaling && { color: Colors.darkGreenText }]}>
                    {cancelLabel}
                </CustomText>
            </TouchableOpacity>
        </View>
    );
};

export default ModalActionButtons;

const styles = StyleSheet.create({
    galleryButton: { minHeight: 44, minWidth: 83, width: undefined, flexShrink: 1 },
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
