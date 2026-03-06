import React from "react";
import {
    ActivityIndicator,
    Modal,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";

import CustomText from "@/components/CustomText";
import { Colors } from "@/constants/colors";

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    isConfirming?: boolean;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmLabel = "Yes",
    cancelLabel = "No",
    isConfirming = false,
}) => {
    return (
        <Modal
            visible={isOpen}
            onRequestClose={onClose}
            transparent={true}
            animationType="fade"
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                    <CustomText weight="bold" style={styles.modalTitle}>
                        {title}
                    </CustomText>
                    <CustomText weight="regular" style={styles.modalText}>
                        {message}
                    </CustomText>
                    <View style={styles.modalButtons}>
                        <TouchableOpacity
                            style={styles.yesButton}
                            onPress={onConfirm}
                            disabled={isConfirming}
                        >
                            {isConfirming ? (
                                <ActivityIndicator
                                    size="small"
                                    color={Colors.white}
                                />
                            ) : (
                                <CustomText
                                    weight="semibold"
                                    style={styles.modalButtonText}
                                >
                                    {confirmLabel}
                                </CustomText>
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.noButton}
                            onPress={onClose}
                            disabled={isConfirming}
                        >
                            <CustomText
                                weight="semibold"
                                style={styles.modalButtonText}
                            >
                                {cancelLabel}
                            </CustomText>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

export default ConfirmModal;

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center",
        alignItems: "center",
    },
    modalContainer: {
        backgroundColor: "white",
        borderRadius: 15,
        padding: 30,
        margin: 20,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        maxWidth: "90%",
        maxHeight: "80%",
    },
    modalTitle: {
        fontSize: 16,
        textAlign: "center",
        marginBottom: 10,
    },
    modalText: {
        fontSize: 13,
        textAlign: "center",
        marginBottom: 20,
    },
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
