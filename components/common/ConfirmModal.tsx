import React from "react";
import { StyleSheet } from "react-native";

import CenteredModal from "@/components/common/CenteredModal";
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
        <CenteredModal
            isOpen={isOpen}
            onClose={onClose}
            containerStyle={styles.modalContainer}
        >
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
        </CenteredModal>
    );
};

export default ConfirmModal;

const styles = StyleSheet.create({
    modalContainer: {
        padding: 30,
        margin: 20,
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
