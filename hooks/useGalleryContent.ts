import { supabase } from "@/api/clients/supabaseClient";
import type { GalleryImage } from "@/stores/GalleryStore";
import { useGalleryStore } from "@/stores/GalleryStore";
import {
    multipleDownloadAndSaveImage,
    pickMultipleImages,
} from "@/utils/gallery";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";

const EMPTY_IMAGES: GalleryImage[] = [];

export const useGalleryContent = ({ galleryId }: { galleryId: string }) => {
    const loadInitialGalleryImages = useGalleryStore(
        (s) => s.loadInitialGalleryImages,
    );
    const loadMoreGalleryImages = useGalleryStore(
        (s) => s.loadMoreGalleryImages,
    );
    const refreshGalleryImages = useGalleryStore((s) => s.refreshGalleryImages);

    const refreshGalleries = useGalleryStore((s) => s.refreshGalleries);
    const deleteGallery = useGalleryStore((s) => s.deleteGallery);
    const uploadGalleryImages = useGalleryStore((s) => s.uploadGalleryImages);

    const canonicalImages = useGalleryStore(
        (s) => s.imagesByGalleryId[galleryId] ?? EMPTY_IMAGES,
    );
    const hasMoreImages = useGalleryStore(
        (s) => s.imagesPageByGalleryId[galleryId]?.hasMore ?? false,
    );
    const isLoadingInitialImages = useGalleryStore(
        (s) => s.imagesPageByGalleryId[galleryId]?.isLoadingInitial ?? false,
    );
    const isLoadingMoreImages = useGalleryStore(
        (s) => s.imagesPageByGalleryId[galleryId]?.isLoadingMore ?? false,
    );

    const [isDownloading, setIsDownloading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [viewerInitialImageId, setViewerInitialImageId] = useState<
        string | null
    >(null);
    const [isViewerOpen, setIsViewerOpen] = useState(false);
    const [isDeleteImagesModalOpen, setIsDeleteImagesModalOpen] =
        useState(false);
    const [isDeleteGalleryModalOpen, setIsDeleteGalleryModalOpen] =
        useState(false);
    const [editMode, setEditMode] = useState(false);
    const [selectedImages, setSelectedImages] = useState<GalleryImage[]>([]);
    const [sortingByAscending, setSortingByAscending] = useState(false);

    useEffect(() => {
        loadInitialGalleryImages(galleryId);
    }, [galleryId, loadInitialGalleryImages]);

    const sortedImages = useMemo(() => {
        return canonicalImages
            .slice()
            .sort((a, b) =>
                sortingByAscending
                    ? a.created_at.localeCompare(b.created_at)
                    : b.created_at.localeCompare(a.created_at),
            );
    }, [canonicalImages, sortingByAscending]);

    const handleAddImages = useCallback(async () => {
        const newImages = await pickMultipleImages();
        if (!newImages?.length) return;

        const ok = await uploadGalleryImages(galleryId, newImages);
        if (ok) {
            await refreshGalleries();
        }
    }, [galleryId, refreshGalleries, uploadGalleryImages]);

    const handleDeleteGallery = useCallback(async () => {
        setIsDeleting(true);
        await deleteGallery(galleryId);
        setIsDeleting(false);

        setIsDeleteGalleryModalOpen(false);
        router.back();
        await refreshGalleries();
    }, [deleteGallery, galleryId, refreshGalleries]);

    const handleImagePress = useCallback((image: GalleryImage) => {
        if (editMode) {
            setSelectedImages((prev) => {
                const exists = prev.some((i) => i.id === image.id);
                return exists
                    ? prev.filter((i) => i.id !== image.id)
                    : [...prev, image];
            });
            return;
        }
        setViewerInitialImageId(image.id);
        setIsViewerOpen(true);
    }, [editMode]);

    const handleSelectImage = useCallback((image: GalleryImage) => {
        const exists = selectedImages.some((i) => i.id === image.id);
        if (exists) {
            const filteredImages = selectedImages.filter(
                (i) => i.id !== image.id,
            );
            setSelectedImages(filteredImages);
            if (filteredImages.length === 0) {
                setEditMode(false);
            }
            return;
        }

        setSelectedImages([...selectedImages, image]);
    }, [selectedImages]);

    const handleImageLongPress = useCallback((image: GalleryImage) => {
        if (!editMode) {
            setEditMode(true);
            setSelectedImages([image]);
        }
    }, [editMode]);

    const handleDownloadImages = useCallback(async () => {
        setIsDownloading(true);
        try {
            const selectedSnapshot = selectedImages;
            const needs = selectedSnapshot
                .filter((i) => !i.url_orig)
                .map((i) => i.id);

            let imagesToDownload = selectedSnapshot;
            if (needs.length) {
                const { data: signedMap, error } =
                    await supabase.functions.invoke("sign-gallery-urls", {
                        body: { galleryId, imageIds: needs },
                    });

                if (!error) {
                    imagesToDownload = selectedSnapshot.map((img) => ({
                        ...img,
                        url_orig:
                            img.url_orig ??
                            signedMap?.[String(img.id)]?.url_orig,
                    }));
                }
            }

            await multipleDownloadAndSaveImage(imagesToDownload);
        } finally {
            setSelectedImages([]);
            setEditMode(false);
            setIsDownloading(false);
        }
    }, [galleryId, selectedImages]);

    const handleClearSelection = useCallback(() => {
        setSelectedImages([]);
        setEditMode(false);
    }, []);

    const handleToggleSort = useCallback(() => setSortingByAscending((v) => !v), []);
    const handleBack = useCallback(() => router.back(), []);

    return {
        loading: isLoadingInitialImages,
        isLoadingInitialImages,
        isLoadingMoreImages,
        hasMoreImages,
        loadMoreGalleryImages,
        refreshGalleryImages,

        canonicalImages,
        isViewerOpen,
        viewerInitialImageId,

        isDownloading,
        isDeleting,
        images: sortedImages,
        isDeleteImagesModalOpen,
        isDeleteGalleryModalOpen,
        editMode,
        selectedImages,
        sortingByAscending,

        handleAddImages,
        handleBack,
        handleDownloadImages,
        handleDeleteGallery,
        handleSelectImage,
        handleImagePress,
        handleImageLongPress,
        handleClearSelection,
        handleToggleSort,

        setIsViewerOpen,
        setViewerInitialImageId,
        setIsDeleteImagesModalOpen,
        setIsDeleteGalleryModalOpen,
        setSelectedImages,
        setEditMode,
    };
};
