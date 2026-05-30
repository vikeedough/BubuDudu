import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import ConfirmModal from "@/components/common/ConfirmModal";
import DeleteImagesModal from "@/components/gallery/DeleteImagesModal";
import EditGalleryDetailsModal from "@/components/gallery/EditGalleryDetailsModal";
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
    const [galleryDetails, setGalleryDetails] = useState({
        title: galleryTitle as string,
        date: galleryDate as string,
        location: galleryLocation as string,
    });

    const {
        isLoadingInitialImages,
        isLoadingMoreImages,
        hasMoreImages,
        loadMoreGalleryImages,
        isDownloading,
        isDeleting,
        images,
        isViewerOpen,
        viewerInitialImageId,
        isDeleteImagesModalOpen,
        isDeleteGalleryModalOpen,
        isEditGalleryModalOpen,
        isUpdatingGalleryDetails,
        editMode,
        selectedImageIds,
        selectedImageIdList,
        sortingByAscending,
        handleAddImages,
        handleBack,
        handleDownloadImages,
        handleDeleteGallery,
        handleUpdateGalleryDetails,
        handleImagePress,
        handleImageLongPress,
        handleSelectImage,
        handleClearSelection,
        handleToggleSort,
        setIsViewerOpen,
        setViewerInitialImageId,
        setIsDeleteImagesModalOpen,
        setIsDeleteGalleryModalOpen,
        setIsEditGalleryModalOpen,
    } = useGalleryContent({ galleryId: galleryId as string });

    useEffect(() => {
        setGalleryDetails({
            title: galleryTitle as string,
            date: galleryDate as string,
            location: galleryLocation as string,
        });
    }, [galleryDate, galleryLocation, galleryTitle]);

    const handleSaveGalleryDetails = async (input: {
        title: string;
        date: string;
        location: string;
    }) => {
        const updatedGallery = await handleUpdateGalleryDetails(input);
        if (updatedGallery) {
            setGalleryDetails({
                title: updatedGallery.title,
                date:
                    updatedGallery.date instanceof Date
                        ? updatedGallery.date.toISOString()
                        : updatedGallery.date,
                location: updatedGallery.location,
            });
        }

        return updatedGallery;
    };

    return (
        <SafeAreaView style={styles.container}>
            <GalleryImageViewerModal
                isOpen={isViewerOpen}
                initialImageId={viewerInitialImageId}
                images={images}
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
                    selectedImageIds={selectedImageIdList}
                    galleryId={galleryId as string}
                    onCleared={handleClearSelection}
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
            <EditGalleryDetailsModal
                isOpen={isEditGalleryModalOpen}
                onClose={() => setIsEditGalleryModalOpen(false)}
                galleryTitle={galleryDetails.title}
                galleryLocation={galleryDetails.location}
                galleryDate={galleryDetails.date}
                isSaving={isUpdatingGalleryDetails}
                onSave={handleSaveGalleryDetails}
            />

            <GalleryHeader onBack={handleBack} currentDate={date} />

            <View
                style={[
                    styles.galleryContainer,
                    { backgroundColor: `${galleryColor}40` },
                ]}
            >
                <GalleryControls
                    galleryTitle={galleryDetails.title}
                    galleryDate={convertDate(galleryDetails.date)}
                    isDeleting={isDeleting}
                    onDeleteGallery={() => setIsDeleteGalleryModalOpen(true)}
                    onEditGallery={() => setIsEditGalleryModalOpen(true)}
                    onAddImages={handleAddImages}
                />

                {editMode && (
                    <GalleryEditControls
                        isDownloading={isDownloading}
                        selectedCount={selectedImageIds.size}
                        onDownload={handleDownloadImages}
                        onDelete={() => setIsDeleteImagesModalOpen(true)}
                    />
                )}

                <GalleryLocationBar
                    location={galleryDetails.location}
                    showClearButton={selectedImageIds.size > 0}
                    sortingByAscending={sortingByAscending}
                    onToggleSort={handleToggleSort}
                    onClear={handleClearSelection}
                />

                <GalleryImageGrid
                    images={images}
                    isLoadingInitial={isLoadingInitialImages}
                    isLoadingMore={isLoadingMoreImages}
                    hasMore={hasMoreImages}
                    onEndReached={() =>
                        loadMoreGalleryImages(galleryId as string)
                    }
                    editMode={editMode}
                    selectedImageIds={selectedImageIds}
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
