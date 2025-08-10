import { Gallery as GalleryType } from "@/api/endpoints/types";
import { useAppStore } from "@/stores/AppStore";
import { router } from "expo-router";
import { useMemo, useState } from "react";

export const useGalleryList = () => {
    const galleries = useAppStore((state) => state.galleries);
    const [sortingByDescending, setSortingByDescending] = useState(true);
    const [searchText, setSearchText] = useState("");
    const [isNewGalleryModalOpen, setIsNewGalleryModalOpen] = useState(false);

    const filteredGalleries = useMemo(
        () =>
            galleries
                .filter((gallery) =>
                    gallery.title
                        .toLowerCase()
                        .includes(searchText.toLowerCase())
                )
                .sort((a, b) => {
                    const da = Date.parse(a.date);
                    const db = Date.parse(b.date);
                    return sortingByDescending ? db - da : da - db;
                }),
        [galleries, searchText, sortingByDescending]
    );

    const handleAddNewGallery = () => {
        setIsNewGalleryModalOpen(true);
    };

    const handleToggleSort = () => {
        setSortingByDescending(!sortingByDescending);
    };

    const handleSearchChange = (text: string) => {
        setSearchText(text);
    };

    const navigateToGalleryContent = (gallery: GalleryType) => {
        router.push({
            pathname: "/(tabs)/(gallery)/galleryContent",
            params: {
                galleryId: gallery.id,
                galleryTitle: gallery.title,
                galleryDate: gallery.date,
                galleryLocation: gallery.location,
                galleryColor: gallery.color,
            },
        });
    };

    const handleCloseModal = () => {
        setIsNewGalleryModalOpen(false);
    };

    return {
        // State
        filteredGalleries,
        sortingByDescending,
        searchText,
        isNewGalleryModalOpen,

        // Actions
        handleAddNewGallery,
        handleToggleSort,
        handleSearchChange,
        navigateToGalleryContent,
        handleCloseModal,
    };
};
