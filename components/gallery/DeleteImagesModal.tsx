import React, { useRef, useState } from "react";
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
    const busy = useRef(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const deleteMultipleGalleryImages = useGalleryStore(
        (s) => s.deleteMultipleGalleryImages,
    );
    const isOnline = useSyncStore((s) => s.isOnline);

    const handleDeleteImage = async () => {
        if (busy.current) return;
        if (!isOnline) {
            Alert.alert("Offline", "Gallery changes are unavailable offline.");
            onClose();
            return;
        }

        if (!selectedImageIds.length) {
            onClose();
            return;
        }

        busy.current = true;
        setIsDeleting(true);

        try {
            const ok = await deleteMultipleGalleryImages(
                galleryId,
                selectedImageIds,
            );

            if (ok) {
                onCleared();
                onClose();
            } else {
                Alert.alert("Error", "Could not confirm the deletion. Please refresh and try again.");
            }
        } catch {
            Alert.alert("Error", "Could not confirm the deletion. Please refresh and try again.");
        } finally {
            busy.current = false;
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
