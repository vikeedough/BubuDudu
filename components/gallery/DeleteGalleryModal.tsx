import React from "react";
import ConfirmModal from "@/components/common/ConfirmModal";

interface DeleteGalleryModalProps {
    isOpen: boolean;
    onClose: () => void;
    handleDeleteGallery: () => void;
}

const DeleteGalleryModal: React.FC<DeleteGalleryModalProps> = ({
    isOpen,
    onClose,
    handleDeleteGallery,
}) => {
    return (
        <ConfirmModal
            isOpen={isOpen}
            onClose={onClose}
            onConfirm={handleDeleteGallery}
            title="Are you sure?"
            message="Are you sure you want to delete this gallery?"
        />
    );
};

export default DeleteGalleryModal;
