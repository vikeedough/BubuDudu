import { useLocalSearchParams } from "expo-router";
import React from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import ConfirmModal from "@/components/common/ConfirmModal";
import DeleteImagesModal from "@/components/gallery/DeleteImagesModal";
import GalleryControls from "@/components/gallery/GalleryControls";
import GalleryEditControls from "@/components/gallery/GalleryEditControls";
import GalleryHeader from "@/components/gallery/GalleryHeader";
import GalleryImageGrid from "@/components/gallery/GalleryImageGrid";
import GalleryImageViewerModal from "@/components/gallery/GalleryImageViewerModal";
import GalleryLocationBar from "@/components/gallery/GalleryLocationBar";
import { Colors } from "@/constants/colors";
import { useGalleryContent } from "@/hooks/useGalleryContent";
import { convertDate } from "@/utils/gallery";
import { getDate } from "@/utils/home";

const GalleryContent = () => {
    const {
        galleryId,
        galleryTitle,
        galleryDate,
        galleryLocation,
        galleryColor,
    } = useLocalSearchParams();

    const date = getDate();

    const {
        isLoadingInitialImages,
        isLoadingMoreImages,
        hasMoreImages,
        loadMoreGalleryImages,
        isDownloading,
        isDeleting,
        images,
        canonicalImages,
        isViewerOpen,
        viewerInitialImageId,
        isDeleteImagesModalOpen,
        isDeleteGalleryModalOpen,
        editMode,
        selectedImages,
        sortingByAscending,
        handleAddImages,
        handleBack,
        handleDownloadImages,
        handleDeleteGallery,
        handleImagePress,
        handleImageLongPress,
        handleSelectImage,
        handleClearSelection,
        handleToggleSort,
        setIsViewerOpen,
        setViewerInitialImageId,
        setIsDeleteImagesModalOpen,
        setIsDeleteGalleryModalOpen,
        setSelectedImages,
        setEditMode,
    } = useGalleryContent({ galleryId: galleryId as string });

    return (
        <SafeAreaView style={styles.container}>
            <GalleryImageViewerModal
                isOpen={isViewerOpen}
                initialImageId={viewerInitialImageId}
                images={canonicalImages}
                hasMore={hasMoreImages}
                isLoadingMore={isLoadingMoreImages}
                onLoadMore={() => loadMoreGalleryImages(galleryId as string)}
                onClose={() => {
                    setIsViewerOpen(false);
                    setViewerInitialImageId(null);
                }}
            />
            {isDeleteImagesModalOpen && (
                <DeleteImagesModal
                    isOpen={isDeleteImagesModalOpen}
                    onClose={() => setIsDeleteImagesModalOpen(false)}
                    selectedImages={selectedImages}
                    galleryId={galleryId as string}
                    setSelectedImages={setSelectedImages}
                    setEditMode={setEditMode}
                />
            )}
            {isDeleteGalleryModalOpen && (
                <ConfirmModal
                    isOpen={isDeleteGalleryModalOpen}
                    onClose={() => setIsDeleteGalleryModalOpen(false)}
                    onConfirm={handleDeleteGallery}
                    title="Are you sure?"
                    message="Are you sure you want to delete this gallery?"
                />
            )}

            <GalleryHeader onBack={handleBack} currentDate={date} />

            <View
                style={[
                    styles.galleryContainer,
                    { backgroundColor: `${galleryColor}40` },
                ]}
            >
                <GalleryControls
                    galleryTitle={galleryTitle as string}
                    galleryDate={convertDate(galleryDate as string)}
                    sortingByAscending={sortingByAscending}
                    isDeleting={isDeleting}
                    onDeleteGallery={() => setIsDeleteGalleryModalOpen(true)}
                    onToggleSort={handleToggleSort}
                    onAddImages={handleAddImages}
                />

                {editMode && (
                    <GalleryEditControls
                        isDownloading={isDownloading}
                        onDownload={handleDownloadImages}
                        onDelete={() => setIsDeleteImagesModalOpen(true)}
                    />
                )}

                <GalleryLocationBar
                    location={galleryLocation as string}
                    showClearButton={selectedImages.length > 0}
                    onClear={handleClearSelection}
                />

                <GalleryImageGrid
                    images={images}
                    isLoadingInitial={isLoadingInitialImages}
                    isLoadingMore={isLoadingMoreImages}
                    onEndReached={() =>
                        loadMoreGalleryImages(galleryId as string)
                    }
                    editMode={editMode}
                    selectedImages={selectedImages}
                    onImagePress={handleImagePress}
                    onImageLongPress={handleImageLongPress}
                    onImageSelect={handleSelectImage}
                />
            </View>
        </SafeAreaView>
    );
};

export default GalleryContent;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.backgroundPink,
        paddingVertical: 25,
        paddingHorizontal: 25,
    },
    galleryContainer: {
        flex: 1,
        paddingVertical: 25,
        marginBottom: 50,
        paddingHorizontal: 25,
        borderRadius: 15,
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 0,
    },
});
