import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, Alert, AppState } from "react-native";

import { useGalleryStore } from "@/stores/GalleryStore";
import { useSyncStore } from "@/stores/SyncStore";
import { toast } from "@/toast/api";
import {
    multipleDownloadAndSaveImage,
    pickMultipleImages,
} from "@/utils/gallery";
import { getIsOnline } from "@/utils/offline/network";

import type { GalleryImage } from "@/stores/GalleryStore";
import type { GalleryDownloadProgress } from "@/utils/gallery";

const EMPTY_IMAGES: GalleryImage[] = [];

export const useGalleryContent = ({ galleryId }: { galleryId: string }) => {
    const loadInitialGalleryImages = useGalleryStore(
        (s) => s.loadInitialGalleryImages,
    );
    const loadMoreGalleryImages = useGalleryStore(
        (s) => s.loadMoreGalleryImages,
    );
    const refreshGalleryImages = useGalleryStore((s) => s.refreshGalleryImages);
    const reconcileGalleryImages = useGalleryStore((s) => s.reconcileGalleryImages ?? s.refreshGalleryImages);
    const imageError = useGalleryStore((s) => s.imageErrorsByGalleryId?.[galleryId] ?? null);
    const isUploading = useGalleryStore((s) => s.isUploadingByGalleryId?.[galleryId] ?? false);

    const refreshImageUrls = useGalleryStore((s) => s.refreshImageUrls);
    const refreshGalleries = useGalleryStore((s) => s.refreshGalleries);
    const deleteGallery = useGalleryStore((s) => s.deleteGallery);
    const updateGalleryDetails = useGalleryStore((s) => s.updateGalleryDetails);
    const uploadGalleryImages = useGalleryStore((s) => s.uploadGalleryImages);
    const isOnline = useSyncStore((s) => s.isOnline);

    const imagesPage = useGalleryStore(
        (s) => s.imagesPageByGalleryId[galleryId],
    );
    const canonicalImages = useGalleryStore(
        (s) => s.imagesByGalleryId[galleryId] ?? EMPTY_IMAGES,
    );
    const hasMoreImages = imagesPage?.hasMore ?? false;
    const isLoadingInitialImages = imagesPage?.isLoadingInitial ?? false;
    const isLoadingMoreImages = imagesPage?.isLoadingMore ?? false;

    const downloadBusy = useRef(false);
    const downloadController = useRef<AbortController | null>(null);
    const focusRevision = useRef(0);
    const [downloadProgress, setDownloadProgress] = useState<GalleryDownloadProgress | null>(null);
    const addBusy = useRef(false);
    const deleteBusy = useRef(false);
    const focused = useRef(false);
    const focusedGallery = useRef<string | null>(null);
    const currentGallery = useRef(galleryId);
    currentGallery.current = galleryId;
    const [isPickingImages, setIsPickingImages] = useState(false);
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
    const [isEditGalleryModalOpen, setIsEditGalleryModalOpen] = useState(false);
    const [isUpdatingGalleryDetails, setIsUpdatingGalleryDetails] =
        useState(false);
    const [editMode, setEditMode] = useState(false);
    const [selectedIds, setSelectedImageIds] = useState<Set<string>>(
        () => new Set(),
    );
    const direction = useGalleryStore((s) => s.imageSortByGalleryId?.[galleryId] ?? "desc");
    const setImageSort = useGalleryStore((s) => s.setImageSort);
    const sortingByAscending = direction === "asc";

    const handleClearSelection = useCallback(() => {
        focusRevision.current++;
        downloadController.current?.abort();
        setSelectedImageIds(new Set());
        setEditMode(false);
        setIsDeleteImagesModalOpen(false);
    }, []);

    useEffect(handleClearSelection, [galleryId, handleClearSelection]);
    const handleRefresh = useCallback(() => reconcileGalleryImages(galleryId), [galleryId, reconcileGalleryImages]);
    useFocusEffect(useCallback(() => {
        focused.current = true;
        if (focusedGallery.current === galleryId && getIsOnline()) void handleRefresh().catch(() => undefined);
        focusedGallery.current = galleryId;
        let previous = AppState.currentState;
        const subscription = AppState.addEventListener("change", (next) => {
            if (next === "active" && previous !== "active" && getIsOnline()) void handleRefresh().catch(() => undefined);
            previous = next;
        });
        return () => { focused.current = false; subscription.remove(); handleClearSelection(); };
    }, [galleryId, handleClearSelection, handleRefresh]));

    useEffect(() => {
        void loadInitialGalleryImages(galleryId).catch(() => undefined);
    }, [galleryId, loadInitialGalleryImages]);

    const wasOnline = useRef(isOnline);
    useEffect(() => {
        if (isOnline && !wasOnline.current && focused.current) void handleRefresh().catch(() => undefined);
        wasOnline.current = isOnline;
    }, [handleRefresh, isOnline]);

    const sortedImages = useMemo(() => {
        return canonicalImages
            .slice()
            .sort((a, b) =>
                sortingByAscending
                    ? a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id)
                    : b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id),
            );
    }, [canonicalImages, sortingByAscending]);
    const visibleImages = useMemo(() => {
        if (isOnline) return sortedImages;
        return sortedImages.filter((img) => img.url_thumb || img.url_grid || img.url_orig);
    }, [isOnline, sortedImages]);
    const visibleCanonicalImages = useMemo(() => {
        if (isOnline) return canonicalImages;
        return canonicalImages.filter((img) => img.url_thumb || img.url_grid || img.url_orig);
    }, [canonicalImages, isOnline]);
    const imageById = useMemo(() => {
        const map = new Map<string, GalleryImage>();
        for (const image of canonicalImages) {
            map.set(image.id, image);
        }
        return map;
    }, [canonicalImages]);
    const selectedImageIds = useMemo(
        () => new Set(Array.from(selectedIds).filter((id) => imageById.has(id))),
        [imageById, selectedIds],
    );
    useEffect(() => {
        // A refresh temporarily clears rows before replacing them; keep selection until it settles.
        if (isLoadingInitialImages) return;
        if (selectedImageIds.size !== selectedIds.size) setSelectedImageIds(selectedImageIds);
        setEditMode(selectedImageIds.size > 0);
    }, [isLoadingInitialImages, selectedIds, selectedImageIds]);
    const lastAnnouncedCount = useRef(0);
    useEffect(() => {
        if (lastAnnouncedCount.current !== selectedImageIds.size) {
            lastAnnouncedCount.current = selectedImageIds.size;
            AccessibilityInfo.announceForAccessibility(`${selectedImageIds.size} photos selected`);
        }
    }, [selectedImageIds.size]);
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
        if (addBusy.current || isUploading) return;
        if (!isOnline) { Alert.alert("Offline", "Gallery uploads are unavailable offline."); return; }
        addBusy.current = true; setIsPickingImages(true);
        const revision = focusRevision.current;
        try {
            const newImages = await pickMultipleImages();
            if (!newImages?.length || !focused.current || revision !== focusRevision.current || currentGallery.current !== galleryId) return;
            const ok = await uploadGalleryImages(galleryId, newImages);
            if (!focused.current || revision !== focusRevision.current || currentGallery.current !== galleryId) return;
            if (ok) await refreshGalleries();
            else Alert.alert("Upload incomplete", "Completed photos were kept. Please retry the remaining photos.");
        } catch {
            if (!focused.current || revision !== focusRevision.current || currentGallery.current !== galleryId) return;
            Alert.alert("Photos unavailable", "The photo picker or upload could not finish. Please try again.");
        } finally { addBusy.current = false; setIsPickingImages(false); }
    }, [galleryId, isOnline, isUploading, refreshGalleries, uploadGalleryImages]);

    const handleDeleteGallery = useCallback(async () => {
        if (!isOnline) {
            Alert.alert("Offline", "Gallery changes are unavailable offline.");
            return;
        }

        if (deleteBusy.current) return;
        deleteBusy.current = true;
        const revision = focusRevision.current;
        setIsDeleting(true);
        try {
            const ok = await deleteGallery(galleryId);
            if (!focused.current || revision !== focusRevision.current || currentGallery.current !== galleryId) return;
            if (!ok) {
                Alert.alert("Error", "Failed to delete gallery.");
                return;
            }

            setIsDeleteGalleryModalOpen(false);
            router.back();
            await refreshGalleries().catch(() => undefined);
        } catch {
            if (focused.current && revision === focusRevision.current && currentGallery.current === galleryId) Alert.alert("Error", "Could not confirm the gallery deletion. Please retry.");
        } finally {
            deleteBusy.current = false;
            setIsDeleting(false);
        }
    }, [deleteGallery, galleryId, isOnline, refreshGalleries]);

    const handleUpdateGalleryDetails = useCallback(
        async (input: { title: string; date: string; location: string }) => {
            if (!isOnline) {
                Alert.alert("Offline", "Gallery changes are unavailable offline.");
                return null;
            }

            setIsUpdatingGalleryDetails(true);
            try {
                const updatedGallery = await updateGalleryDetails({
                    galleryId,
                    ...input,
                });

                if (!updatedGallery) {
                    Alert.alert("Error", "Failed to update gallery.");
                    return null;
                }

                setIsEditGalleryModalOpen(false);
                await refreshGalleries();
                return updatedGallery;
            } finally {
                setIsUpdatingGalleryDetails(false);
            }
        },
        [galleryId, isOnline, refreshGalleries, updateGalleryDetails],
    );

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
        if (isOnline) void refreshImageUrls(galleryId, [image.id]).catch(() =>
            Alert.alert("Photo unavailable", "Refresh the gallery and try again."));
        setViewerInitialImageId(image.id);
        setIsViewerOpen(true);
    }, [editMode, galleryId, isOnline, refreshImageUrls]);

    const handleSelectImage = useCallback((image: GalleryImage) => {
        if (!isOnline) return;

        setSelectedImageIds((prev) => {
            const next = new Set(prev);
            if (next.has(image.id)) {
                next.delete(image.id);
            } else {
                next.add(image.id);
            }
            return next;
        });
    }, [isOnline]);

    const handleImageLongPress = useCallback((image: GalleryImage) => {
        if (!isOnline) {
            Alert.alert("Offline", "Gallery changes are unavailable offline.");
            return;
        }

        if (!editMode) {
            setEditMode(true);
            setSelectedImageIds(new Set([image.id]));
        }
    }, [editMode, isOnline]);

    const handleDownloadImages = useCallback(async () => {
        if (!selectedImageIdList.length || downloadBusy.current) return;
        if (!isOnline) { Alert.alert("Offline", "Image downloads are unavailable offline."); return; }
        downloadBusy.current = true; setIsDownloading(true); setDownloadProgress(null);
        const controller = new AbortController(); downloadController.current = controller;
        const revision = focusRevision.current;
        try {
            const imagesToDownload = await refreshImageUrls(galleryId, selectedImageIdList);
            const result = await multipleDownloadAndSaveImage(imagesToDownload,
                (ids) => refreshImageUrls(galleryId, ids ?? selectedImageIdList, true),
                { signal: controller.signal, onProgress: setDownloadProgress });
            if (!focused.current || revision !== focusRevision.current || currentGallery.current !== galleryId) return;
            const unsuccessful = [...result.failedIds, ...result.skippedIds];
            setSelectedImageIds(new Set(unsuccessful));
            setEditMode(unsuccessful.length > 0);
            if (result.savedIds.length) toast.show({
                title: unsuccessful.length ? "Some photos saved" : "Download complete",
                message: `Saved ${result.savedIds.length} ${result.savedIds.length === 1 ? "photo" : "photos"} to BubuDudu.${unsuccessful.length ? ` ${unsuccessful.length} remain selected for retry.` : ""}`,
                durationMs: 3000,
            });
            if (unsuccessful.length && !result.permissionDenied && !result.cancelled) Alert.alert("Some photos were not saved", `${result.savedIds.length} saved. ${unsuccessful.length} remain selected; tap Download to retry only those photos.`);
        } catch (error) {
            if (focused.current && revision === focusRevision.current) Alert.alert("Download failed", error instanceof Error ? error.message : "Please refresh and try again.");
        } finally { downloadBusy.current = false; downloadController.current = null; setIsDownloading(false); }
    }, [galleryId, isOnline, refreshImageUrls, selectedImageIdList]);

    const applySelectedImageIds = useCallback((imageIds: string[]) => {
        setSelectedImageIds(new Set(imageIds));
    }, []);

    const handleToggleSort = useCallback(() => { void setImageSort(galleryId, sortingByAscending ? "desc" : "asc").catch(() => undefined); }, [galleryId, setImageSort, sortingByAscending]);
    const handleBack = useCallback(() => router.back(), []);

    return {
        loading: isLoadingInitialImages,
        isLoadingInitialImages,
        isLoadingMoreImages,
        hasMoreImages,
        loadMoreGalleryImages,
        refreshGalleryImages,

        canonicalImages: visibleCanonicalImages,
        isOnline,
        isViewerOpen,
        viewerInitialImageId,

        downloadProgress,
        imageError,
        handleRefresh,
        isUploading,
        isPickingImages,
        isDownloading,
        isDeleting,
        images: visibleImages,
        isDeleteImagesModalOpen,
        isDeleteGalleryModalOpen,
        isEditGalleryModalOpen,
        isUpdatingGalleryDetails,
        editMode,
        selectedImages,
        selectedImageIds,
        selectedImageIdList,
        sortingByAscending,

        handleAddImages,
        handleBack,
        handleDownloadImages,
        handleDeleteGallery,
        handleUpdateGalleryDetails,
        handleSelectImage,
        handleImagePress,
        handleImageLongPress,
        handleClearSelection,
        handleToggleSort,

        setIsViewerOpen,
        setViewerInitialImageId,
        setIsDeleteImagesModalOpen,
        setIsDeleteGalleryModalOpen,
        setIsEditGalleryModalOpen,
        applySelectedImageIds,
    };
};
