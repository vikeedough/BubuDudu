import React, { useState } from "react";

import ConfirmModal from "@/components/common/ConfirmModal";
import { useGalleryStore } from "@/stores/GalleryStore";

interface DeleteImagesModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedImageIds: string[];
    galleryId: string;
    onCleared: () => void;
}

const DeleteImagesModal: React.FC<DeleteImagesModalProps> = ({
    isOpen,
    onClose,
    selectedImageIds,
    galleryId,
    onCleared,
}) => {
    const [isDeleting, setIsDeleting] = useState(false);

    const refreshGalleryImages = useGalleryStore((s) => s.refreshGalleryImages);
    const deleteMultipleGalleryImages = useGalleryStore(
        (s) => s.deleteMultipleGalleryImages,
    );

    const handleDeleteImage = async () => {
        if (!selectedImageIds.length) {
            onClose();
            return;
        }

        setIsDeleting(true);

        const ok = await deleteMultipleGalleryImages(
            galleryId,
            selectedImageIds,
        );

        if (ok) {
            await refreshGalleryImages(galleryId);
            onCleared();
            onClose();
        } else {
            // keep modal open if you want, but current UX closes anyway
            onClose();
        }

        setIsDeleting(false);
    };

    return (
        <ConfirmModal
            isOpen={isOpen}
            onClose={onClose}
            onConfirm={handleDeleteImage}
            isConfirming={isDeleting}
            title="Are you sure?"
            message="Are you sure you want to delete these images?"
        />
    );
};

export default DeleteImagesModal;
