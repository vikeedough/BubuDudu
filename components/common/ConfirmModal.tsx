import React from "react";
import { Modal, StyleSheet, View } from "react-native";

import ModalActionButtons from "@/components/common/ModalActionButtons";
import CustomText from "@/components/CustomText";

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
                    <ModalActionButtons
                        onConfirm={onConfirm}
                        onCancel={onClose}
                        confirmLabel={confirmLabel}
                        cancelLabel={cancelLabel}
                        isConfirming={isConfirming}
                    />
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
});
