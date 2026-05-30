import React, { useState } from "react";
import { Alert } from "react-native";

import ConfirmModal from "@/components/common/ConfirmModal";
import { useGalleryStore } from "@/stores/GalleryStore";
import { useSyncStore } from "@/stores/SyncStore";

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
    const isOnline = useSyncStore((s) => s.isOnline);

    const handleDeleteImage = async () => {
        if (!isOnline) {
            Alert.alert("Offline", "Gallery changes are unavailable offline.");
            onClose();
            return;
        }

        if (!selectedImageIds.length) {
            onClose();
            return;
        }

        setIsDeleting(true);

        try {
            const ok = await deleteMultipleGalleryImages(
                galleryId,
                selectedImageIds,
            );

            if (ok) {
                await refreshGalleryImages(galleryId);
                onCleared();
                onClose();
            } else {
                Alert.alert("Error", "Failed to delete the selected images.");
            }
        } finally {
            setIsDeleting(false);
        }
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
