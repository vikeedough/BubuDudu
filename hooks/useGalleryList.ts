import { Gallery, useGalleryStore } from "@/stores/GalleryStore";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";

export const useGalleryList = () => {
    const galleries = useGalleryStore((s) => s.galleries);
    const galleriesQuery = useGalleryStore((s) => s.galleriesQuery);
    const galleriesPage = useGalleryStore((s) => s.galleriesPage);

    const loadInitialGalleries = useGalleryStore((s) => s.loadInitialGalleries);
    const loadMoreGalleries = useGalleryStore((s) => s.loadMoreGalleries);
    const refreshGalleries = useGalleryStore((s) => s.refreshGalleries);
    const setGalleriesQuery = useGalleryStore((s) => s.setGalleriesQuery);

    const [searchText, setSearchText] = useState(galleriesQuery.searchText);
    const [isNewGalleryModalOpen, setIsNewGalleryModalOpen] = useState(false);

    useEffect(() => {
        loadInitialGalleries();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (searchText === galleriesQuery.searchText) return;

        const handle = setTimeout(() => {
            setGalleriesQuery({ searchText });
        }, 300);
        return () => clearTimeout(handle);
    }, [searchText, galleriesQuery.searchText, setGalleriesQuery]);

    const filteredGalleries = useMemo(() => galleries, [galleries]);

    const handleAddNewGallery = useCallback(
        () => setIsNewGalleryModalOpen(true),
        [],
    );
    const sortingByDescending = galleriesQuery.sortDir === "desc";
    const handleToggleSort = useCallback(
        () =>
            setGalleriesQuery({ sortDir: sortingByDescending ? "asc" : "desc" }),
        [setGalleriesQuery, sortingByDescending],
    );
    const handleSearchChange = useCallback((text: string) => {
        setSearchText(text);
    }, []);
    const handleCloseModal = useCallback(() => setIsNewGalleryModalOpen(false), []);

    const navigateToGalleryContent = useCallback((gallery: Gallery) => {
        router.push({
            pathname: "/(tabs)/(gallery)/galleryContent",
            params: {
                galleryId: gallery.id,
                galleryTitle: gallery.title,
                galleryDate:
                    gallery.date instanceof Date
                        ? gallery.date.toISOString()
                        : (gallery.date as string),
                galleryLocation: gallery.location,
                galleryColor: gallery.color,
            },
        });
    }, []);

    const refresh = async () => {
        await refreshGalleries();
    };

    return {
        filteredGalleries,
        sortingByDescending,
        searchText,
        isNewGalleryModalOpen,
        isLoadingGalleries: galleriesPage.isLoadingInitial,

        isLoadingInitialGalleries: galleriesPage.isLoadingInitial,
        isLoadingMoreGalleries: galleriesPage.isLoadingMore,
        hasMoreGalleries: galleriesPage.hasMore,
        loadMoreGalleries,
        refreshGalleries,

        handleAddNewGallery,
        handleToggleSort,
        handleSearchChange,
        navigateToGalleryContent,
        handleCloseModal,
        refresh,
    };
};
