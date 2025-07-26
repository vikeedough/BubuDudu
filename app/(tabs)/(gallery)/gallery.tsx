import NewGalleryModal from "@/components/gallery/AddNewGalleryModal";
import GalleryListControls from "@/components/gallery/GalleryListControls";
import GalleryListGrid from "@/components/gallery/GalleryListGrid";
import GalleryListHeader from "@/components/gallery/GalleryListHeader";
import { Colors } from "@/constants/colors";
import { useGalleryList } from "@/hooks/useGalleryList";
import { getDate } from "@/utils/home";
import React from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const Gallery = () => {
    const date = getDate();

    const {
        filteredGalleries,
        sortingByAscending,
        searchText,
        isNewGalleryModalOpen,
        handleAddNewGallery,
        handleToggleSort,
        handleSearchChange,
        navigateToGalleryContent,
        handleCloseModal,
    } = useGalleryList();

    return (
        <SafeAreaView style={styles.container}>
            <NewGalleryModal
                isOpen={isNewGalleryModalOpen}
                onClose={handleCloseModal}
            />

            <GalleryListHeader currentDate={date} />

            <View style={styles.galleryContainer}>
                <GalleryListControls
                    searchText={searchText}
                    sortingByAscending={sortingByAscending}
                    onSearchChange={handleSearchChange}
                    onToggleSort={handleToggleSort}
                    onAddNew={handleAddNewGallery}
                />

                <GalleryListGrid
                    galleries={filteredGalleries}
                    onGalleryPress={navigateToGalleryContent}
                />
            </View>
        </SafeAreaView>
    );
};

export default Gallery;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.backgroundPink,
        paddingVertical: 25,
        paddingHorizontal: 25,
    },
    galleryContainer: {
        flex: 1,
        backgroundColor: Colors.white,
        paddingVertical: 25,
        marginBottom: 50,
        paddingHorizontal: 25,
        borderRadius: 15,
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
});
