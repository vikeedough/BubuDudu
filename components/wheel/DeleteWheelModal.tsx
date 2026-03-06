import React from "react";

import ConfirmModal from "@/components/common/ConfirmModal";

interface DeleteWheelModalProps {
    isOpen: boolean;
    onClose: () => void;
    handleDeleteWheel: () => void;
}

const DeleteWheelModal: React.FC<DeleteWheelModalProps> = ({
    isOpen,
    onClose,
    handleDeleteWheel,
}) => {
    return (
        <ConfirmModal
            isOpen={isOpen}
            onClose={onClose}
            onConfirm={handleDeleteWheel}
            title="Are you sure?"
            message="Are you sure you want to delete this wheel?"
        />
    );
};

export default DeleteWheelModal;
