import type { GalleryImage } from "@/stores/GalleryStore";
import { useGalleryStore } from "@/stores/GalleryStore";
import {
    multipleDownloadAndSaveImage,
    pickMultipleImages,
} from "@/utils/gallery";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";

const EMPTY_IMAGES: GalleryImage[] = [];

export const useGalleryContent = ({ galleryId }: { galleryId: string }) => {
    const fetchGalleryImages = useGalleryStore((s) => s.fetchGalleryImages);
    const fetchGalleries = useGalleryStore((s) => s.fetchGalleries);
    const deleteGallery = useGalleryStore((s) => s.deleteGallery);
    const uploadGalleryImages = useGalleryStore((s) => s.uploadGalleryImages);

    const imagesFromStore = useGalleryStore(
        (s) => s.imagesByGalleryId[galleryId] ?? EMPTY_IMAGES
    );
    const isLoadingImages = useGalleryStore(
        (s) => s.isLoadingImagesByGalleryId[galleryId] ?? false
    );

    const [isDownloading, setIsDownloading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(
        null
    );
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const [isDeleteImagesModalOpen, setIsDeleteImagesModalOpen] =
        useState(false);
    const [isDeleteGalleryModalOpen, setIsDeleteGalleryModalOpen] =
        useState(false);
    const [editMode, setEditMode] = useState(false);
    const [selectedImages, setSelectedImages] = useState<GalleryImage[]>([]);
    const [sortingByAscending, setSortingByAscending] = useState(true);

    useEffect(() => {
        fetchGalleryImages(galleryId);
    }, [galleryId, fetchGalleryImages]);

    const sortedImages = useMemo(() => {
        return imagesFromStore
            .slice()
            .sort((a, b) =>
                sortingByAscending
                    ? a.created_at.localeCompare(b.created_at)
                    : b.created_at.localeCompare(a.created_at)
            );
    }, [imagesFromStore, sortingByAscending]);

    const handleAddImages = async () => {
        const newImages = await pickMultipleImages();
        if (!newImages?.length) return;

        const ok = await uploadGalleryImages(galleryId, newImages);
        if (ok) {
            await fetchGalleries();
        }
    };

    const handleDeleteGallery = async () => {
        setIsDeleting(true);
        const ok = await deleteGallery(galleryId);
        setIsDeleting(false);

        if (ok) {
            setIsDeleteGalleryModalOpen(false);
            router.back();
            await fetchGalleries();
        }
    };

    const handleImagePress = (image: GalleryImage) => {
        if (editMode) {
            setSelectedImages((prev) => {
                const exists = prev.some((i) => i.id === image.id);
                return exists
                    ? prev.filter((i) => i.id !== image.id)
                    : [...prev, image];
            });
            return;
        }
        setSelectedImage(image);
        setIsImageModalOpen(true);
    };

    const handleSelectImage = (image: GalleryImage) => {
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

    const handleImageLongPress = (image: GalleryImage) => {
        if (!editMode) {
            setEditMode(true);
            setSelectedImages([image]);
        }
    };

    const handleDownloadImages = async () => {
        setIsDownloading(true);
        await multipleDownloadAndSaveImage(selectedImages);
        setSelectedImages([]);
        setEditMode(false);
        setIsDownloading(false);
    };

    const handleClearSelection = () => {
        setSelectedImages([]);
        setEditMode(false);
    };

    const handleToggleSort = () => setSortingByAscending((v) => !v);

    return {
        loading: isLoadingImages,
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

        handleAddImages,
        handleBack: () => router.back(),
        handleDownloadImages,
        handleDeleteGallery,
        handleSelectImage,
        handleImagePress,
        handleImageLongPress,
        handleClearSelection,
        handleToggleSort,

        setIsImageModalOpen,
        setIsDeleteImagesModalOpen,
        setIsDeleteGalleryModalOpen,
        setSelectedImages,
        setEditMode,
    };
};
