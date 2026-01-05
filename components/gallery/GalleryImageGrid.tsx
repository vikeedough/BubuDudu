import { FlashList } from "@shopify/flash-list";
import React from "react";
import { ActivityIndicator, Dimensions, StyleSheet, View } from "react-native";

import { Colors } from "@/constants/colors";
import { GalleryImage } from "@/stores/GalleryStore";

import GalleryImageItem from "./GalleryImageItem";

interface GalleryImageGridProps {
    images: GalleryImage[];
    loading: boolean;
    editMode: boolean;
    selectedImages: GalleryImage[];
    onImagePress: (image: GalleryImage) => void;
    onImageLongPress: (image: GalleryImage) => void;
    onImageSelect: (image: GalleryImage) => void;
}

// Helper function to group pictures into pairs (rows of 2)
const groupIntoRows = (images: GalleryImage[]): (GalleryImage | null)[][] => {
    const rows: (GalleryImage | null)[][] = [];
    for (let i = 0; i < images.length; i += 2) {
        const row = [images[i], images[i + 1] || null];
        rows.push(row);
    }
    return rows;
};

const GalleryImageGrid: React.FC<GalleryImageGridProps> = ({
    images,
    loading,
    editMode,
    selectedImages,
    onImagePress,
    onImageLongPress,
    onImageSelect,
}) => {
    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.lightBlue} />
            </View>
        );
    }

    const rows = groupIntoRows(images);
    const screenWidth = Dimensions.get("window").width;
    const estimatedItemSize = (screenWidth - 110) / 2;

    return (
        <View style={styles.flatListContainer}>
            <FlashList
                data={rows}
                renderItem={({
                    item: row,
                }: {
                    item: (GalleryImage | null)[];
                }) => (
                    <View style={styles.row}>
                        {row.map((gallery, index) => (
                            <View
                                key={gallery?.id || `empty-${index}`}
                                style={styles.itemContainer}
                            >
                                {gallery ? (
                                    <GalleryImageItem
                                        image={gallery}
                                        editMode={editMode}
                                        isSelected={selectedImages.some(
                                            (img) => img.id === gallery.id
                                        )}
                                        onPress={() => onImagePress(gallery)}
                                        onLongPress={() =>
                                            onImageLongPress(gallery)
                                        }
                                        onSelect={() => onImageSelect(gallery)}
                                    />
                                ) : (
                                    <View style={styles.emptyItem} />
                                )}
                            </View>
                        ))}
                    </View>
                )}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    flatListContainer: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    row: {
        flexDirection: "row",
    },
    itemContainer: {
        flex: 1,
    },
    emptyItem: {
        flex: 1,
    },
    separator: {
        height: 15,
    },
});

export default GalleryImageGrid;
