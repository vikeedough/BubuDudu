import { FlashList } from "@shopify/flash-list";
import React, { useCallback, useMemo } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { Colors } from "@/constants/colors";
import { GalleryImage } from "@/stores/GalleryStore";

import CustomText from "../CustomText";

import GalleryImageItem from "./GalleryImageItem";

interface GalleryImageGridProps {
    images: GalleryImage[];
    isLoadingInitial: boolean;
    isLoadingMore: boolean;
    hasMore: boolean;
    onEndReached: () => void;
    editMode: boolean;
    selectedImageIds: ReadonlySet<string>;
    onImagePress: (image: GalleryImage) => void;
    onImageLongPress: (image: GalleryImage) => void;
    onImageSelect: (image: GalleryImage) => void;
}

type GalleryImageRow = (GalleryImage | null)[];

// Helper function to group pictures into pairs (rows of 2)
const groupIntoRows = (images: GalleryImage[]): GalleryImageRow[] => {
    const rows: GalleryImageRow[] = [];
    for (let i = 0; i < images.length; i += 2) {
        const row = [images[i], images[i + 1] || null];
        rows.push(row);
    }
    return rows;
};

const GalleryImageGrid: React.FC<GalleryImageGridProps> = ({
    images,
    isLoadingInitial,
    isLoadingMore,
    hasMore,
    onEndReached,
    editMode,
    selectedImageIds,
    onImagePress,
    onImageLongPress,
    onImageSelect,
}) => {
    const rows = useMemo(() => groupIntoRows(images), [images]);
    const renderSeparator = useCallback(
        () => <View style={styles.separator} />,
        [],
    );
    const handleEndReached = useCallback(() => {
        if (!hasMore || isLoadingMore) return;
        onEndReached();
    }, [hasMore, isLoadingMore, onEndReached]);
    const renderFooter = useMemo(
        () =>
            isLoadingMore ? (
                <View style={styles.footer}>
                    <ActivityIndicator size="small" color={Colors.lightBlue} />
                </View>
            ) : null,
        [isLoadingMore],
    );
    const renderRow = useCallback(
        ({ item: row }: { item: GalleryImageRow }) => (
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
                                isSelected={selectedImageIds.has(gallery.id)}
                                onPress={onImagePress}
                                onLongPress={onImageLongPress}
                                onSelect={onImageSelect}
                            />
                        ) : (
                            <View style={styles.emptyItem} />
                        )}
                    </View>
                ))}
            </View>
        ),
        [
            editMode,
            onImageLongPress,
            onImagePress,
            onImageSelect,
            selectedImageIds,
        ],
    );

    if (isLoadingInitial) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.lightBlue} />
            </View>
        );
    }

    return (
        <View style={styles.flatListContainer}>
            <FlashList
                data={rows}
                renderItem={renderRow}
                ItemSeparatorComponent={renderSeparator}
                onEndReached={handleEndReached}
                onEndReachedThreshold={0.5}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <CustomText weight="bold" style={styles.emptyTitle}>
                            No photos here yet
                        </CustomText>
                        <CustomText weight="medium" style={styles.emptyText}>
                            Tap plus to add photos.
                        </CustomText>
                    </View>
                }
                ListFooterComponent={renderFooter}
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
    footer: {
        paddingVertical: 15,
    },
    emptyState: {
        minHeight: 260,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 24,
        gap: 8,
    },
    emptyTitle: {
        color: Colors.darkGreenText,
        fontSize: 16,
        textAlign: "center",
    },
    emptyText: {
        color: Colors.darkGreenText,
        fontSize: 12,
        opacity: 0.68,
        textAlign: "center",
    },
});

export default GalleryImageGrid;
