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

    const imagesPage = useGalleryStore(
        (s) => s.imagesPageByGalleryId[galleryId],
    );
    const canonicalImages = useGalleryStore(
        (s) => s.imagesByGalleryId[galleryId] ?? EMPTY_IMAGES,
    );
    const hasMoreImages = imagesPage?.hasMore ?? false;
    const isLoadingInitialImages = imagesPage?.isLoadingInitial ?? false;
    const isLoadingMoreImages = imagesPage?.isLoadingMore ?? false;

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
    const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(
        () => new Set(),
    );
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
    const imageById = useMemo(() => {
        const map = new Map<string, GalleryImage>();
        for (const image of canonicalImages) {
            map.set(image.id, image);
        }
        return map;
    }, [canonicalImages]);
    const selectedImageIdList = useMemo(
        () => Array.from(selectedImageIds),
        [selectedImageIds],
    );
    const selectedImages = useMemo(
        () =>
            selectedImageIdList
                .map((id) => imageById.get(id))
                .filter((img): img is GalleryImage => Boolean(img)),
        [imageById, selectedImageIdList],
    );

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
            setSelectedImageIds((prev) => {
                const next = new Set(prev);
                if (next.has(image.id)) {
                    next.delete(image.id);
                } else {
                    next.add(image.id);
                }
                return next;
            });
            return;
        }
        setViewerInitialImageId(image.id);
        setIsViewerOpen(true);
    }, [editMode]);

    const handleSelectImage = useCallback((image: GalleryImage) => {
        setSelectedImageIds((prev) => {
            const next = new Set(prev);
            if (next.has(image.id)) {
                next.delete(image.id);
            } else {
                next.add(image.id);
            }
            if (next.size === 0) {
                setEditMode(false);
            }
            return next;
        });
    }, []);

    const handleImageLongPress = useCallback((image: GalleryImage) => {
        if (!editMode) {
            setEditMode(true);
            setSelectedImageIds(new Set([image.id]));
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
            setSelectedImageIds(new Set());
            setEditMode(false);
            setIsDownloading(false);
        }
    }, [galleryId, selectedImages]);

    const handleClearSelection = useCallback(() => {
        setSelectedImageIds(new Set());
        setEditMode(false);
    }, []);
    const setSelectedImages = useCallback((images: GalleryImage[]) => {
        setSelectedImageIds(new Set(images.map((image) => image.id)));
    }, []);
    const setSelectedImageIdsFromList = useCallback((imageIds: string[]) => {
        setSelectedImageIds(new Set(imageIds));
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
        selectedImageIds,
        selectedImageIdList,
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
        setSelectedImageIds: setSelectedImageIdsFromList,
        setEditMode,
    };
};
