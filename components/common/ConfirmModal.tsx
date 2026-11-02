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
    allowFontScaling?: boolean;
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
    allowFontScaling = false,
}) => {
    const closeWhenIdle = () => { if (!isConfirming) onClose(); };
    return (
        <CenteredModal
            isOpen={isOpen}
            onClose={closeWhenIdle}
            containerStyle={styles.modalContainer}
        >
            <CustomText allowFontScaling={allowFontScaling} maxFontSizeMultiplier={1.5} weight="bold" style={styles.modalTitle}>
                {title}
            </CustomText>
            <CustomText allowFontScaling={allowFontScaling} maxFontSizeMultiplier={1.5} weight="regular" style={styles.modalText}>
                {message}
            </CustomText>
            <ModalActionButtons
                onConfirm={onConfirm}
                onCancel={closeWhenIdle}
                confirmLabel={confirmLabel}
                cancelLabel={cancelLabel}
                isConfirming={isConfirming}
                allowFontScaling={allowFontScaling}
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
