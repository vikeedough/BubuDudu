import { Gallery, useGalleryStore } from "@/stores/GalleryStore";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";

export const useGalleryList = () => {
    const galleries = useGalleryStore((s) => s.galleries);
    const fetchGalleries = useGalleryStore((s) => s.fetchGalleries);
    const isLoadingGalleries = useGalleryStore((s) => s.isLoadingGalleries);

    const [sortingByDescending, setSortingByDescending] = useState(true);
    const [searchText, setSearchText] = useState("");
    const [isNewGalleryModalOpen, setIsNewGalleryModalOpen] = useState(false);

    useEffect(() => {
        fetchGalleries();
    }, [fetchGalleries]);

    const filteredGalleries = useMemo(
        () =>
            galleries
                .filter((gallery) =>
                    gallery.title
                        .toLowerCase()
                        .includes(searchText.toLowerCase())
                )
                .sort((a, b) => {
                    const da =
                        a.date instanceof Date
                            ? a.date.getTime()
                            : Date.parse(a.date as string);
                    const db =
                        b.date instanceof Date
                            ? b.date.getTime()
                            : Date.parse(b.date as string);
                    return sortingByDescending ? db - da : da - db;
                }),
        [galleries, searchText, sortingByDescending]
    );

    const handleAddNewGallery = () => setIsNewGalleryModalOpen(true);
    const handleToggleSort = () => setSortingByDescending((v) => !v);
    const handleSearchChange = (text: string) => setSearchText(text);
    const handleCloseModal = () => setIsNewGalleryModalOpen(false);

    const navigateToGalleryContent = (gallery: Gallery) => {
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
    };

    const refresh = async () => {
        await fetchGalleries();
    };

    return {
        filteredGalleries,
        sortingByDescending,
        searchText,
        isNewGalleryModalOpen,
        isLoadingGalleries,

        handleAddNewGallery,
        handleToggleSort,
        handleSearchChange,
        navigateToGalleryContent,
        handleCloseModal,
        refresh,
    };
};
