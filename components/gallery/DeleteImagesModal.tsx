import React, { useState } from "react";
import ConfirmModal from "@/components/common/ConfirmModal";
import { GalleryImage, useGalleryStore } from "@/stores/GalleryStore";

interface DeleteImagesModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedImages: GalleryImage[];
    galleryId: string;
    setSelectedImages: (images: GalleryImage[]) => void;
    setEditMode: (editMode: boolean) => void;
}

const DeleteImagesModal: React.FC<DeleteImagesModalProps> = ({
    isOpen,
    onClose,
    selectedImages,
    galleryId,
    setSelectedImages,
    setEditMode,
}) => {
    const [isDeleting, setIsDeleting] = useState(false);

    const refreshGalleryImages = useGalleryStore((s) => s.refreshGalleryImages);
    const deleteMultipleGalleryImages = useGalleryStore(
        (s) => s.deleteMultipleGalleryImages,
    );

    const handleDeleteImage = async () => {
        if (!selectedImages.length) {
            onClose();
            return;
        }

        setIsDeleting(true);

        const ok = await deleteMultipleGalleryImages(
            galleryId,
            selectedImages.map((img) => img.id.toString()),
        );

        if (ok) {
            await refreshGalleryImages(galleryId);
            setSelectedImages([]);
            setEditMode(false);
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
