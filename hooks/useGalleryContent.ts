import {
    deleteGallery,
    fetchGalleries,
    fetchGalleryImages,
    uploadGalleryImages,
} from "@/api/endpoints/supabase";
import { DateImage } from "@/api/endpoints/types";
import { useAppStore } from "@/stores/AppStore";
import {
    multipleDownloadAndSaveImage,
    pickMultipleImages,
} from "@/utils/gallery";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";

interface UseGalleryContentProps {
    galleryId: string;
}

export const useGalleryContent = ({ galleryId }: UseGalleryContentProps) => {
    const [loading, setLoading] = useState(true);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [images, setImages] = useState<DateImage[]>([]);
    const [selectedImage, setSelectedImage] = useState<DateImage | null>(null);
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const [isDeleteImagesModalOpen, setIsDeleteImagesModalOpen] =
        useState(false);
    const [isDeleteGalleryModalOpen, setIsDeleteGalleryModalOpen] =
        useState(false);
    const [editMode, setEditMode] = useState(false);
    const [selectedImages, setSelectedImages] = useState<DateImage[]>([]);
    const [sortingByAscending, setSortingByAscending] = useState(true);

    useEffect(() => {
        const fetchImages = async () => {
            const images = await fetchGalleryImages(galleryId);
            setImages(images);
            setLoading(false);
        };

        fetchImages();
    }, [galleryId]);

    const sortedImages = useMemo(
        () =>
            images.sort((a, b) => {
                return sortingByAscending
                    ? a.created_at.localeCompare(b.created_at)
                    : b.created_at.localeCompare(a.created_at);
            }),
        [images, sortingByAscending]
    );

    const handleAddImages = async () => {
        const newImages = await pickMultipleImages();
        if (newImages) {
            const uploadedImages = await uploadGalleryImages(
                galleryId,
                newImages
            );
            if (uploadedImages) {
                const updatedGalleries = await fetchGalleries();
                useAppStore.setState({ galleries: updatedGalleries });
                const refreshedImages = await fetchGalleryImages(galleryId);
                setImages(refreshedImages);
            }
        }
    };

    const handleBack = () => {
        router.back();
    };

    const handleEditGallery = (image: DateImage) => {
        if (editMode) {
            setSelectedImages([]);
            setEditMode(false);
            return;
        }
        setEditMode(true);
        setSelectedImages([image]);
    };

    const handleSelectImage = (image: DateImage) => {
        if (selectedImages.includes(image)) {
            const filteredImages = selectedImages.filter(
                (i) => i.id !== image.id
            );
            setSelectedImages(filteredImages);
            if (filteredImages.length === 0) {
                setEditMode(false);
            }
        } else {
            setSelectedImages([...selectedImages, image]);
        }
    };

    const handleDownloadImages = async () => {
        setIsDownloading(true);
        await multipleDownloadAndSaveImage(selectedImages);
        setSelectedImages([]);
        setEditMode(false);
        setIsDownloading(false);
    };

    const handleDeleteGallery = async () => {
        setIsDeleting(true);
        const deletedGallery = await deleteGallery(galleryId);
        if (deletedGallery) {
            setIsDeleteGalleryModalOpen(false);
            router.back();
            const updatedGalleries = await fetchGalleries();
            useAppStore.setState({ galleries: updatedGalleries });
        }
        setIsDeleting(false);
    };

    const handleImagePress = (image: DateImage) => {
        if (editMode) {
            handleSelectImage(image);
            return;
        }
        setSelectedImage(image);
        setIsImageModalOpen(true);
    };

    const handleImageLongPress = (image: DateImage) => {
        if (!editMode) {
            handleEditGallery(image);
        }
    };

    const handleClearSelection = () => {
        setSelectedImages([]);
        setEditMode(false);
    };

    const handleToggleSort = () => {
        setSortingByAscending(!sortingByAscending);
    };

    return {
        // State
        loading,
        isDownloading,
        isDeleting,
        images: sortedImages,
        selectedImage,
        isImageModalOpen,
        isDeleteImagesModalOpen,
        isDeleteGalleryModalOpen,
        editMode,
        selectedImages,
        sortingByAscending,

        // Actions
        handleAddImages,
        handleBack,
        handleDownloadImages,
        handleDeleteGallery,
        handleImagePress,
        handleImageLongPress,
        handleSelectImage,
        handleClearSelection,
        handleToggleSort,

        // Setters
        setIsImageModalOpen,
        setIsDeleteImagesModalOpen,
        setIsDeleteGalleryModalOpen,
        setImages,
        setSelectedImages,
        setEditMode,
    };
};
