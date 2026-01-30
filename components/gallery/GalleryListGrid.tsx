import { FlashList } from "@shopify/flash-list";
import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { Colors } from "@/constants/colors";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { Gallery, useGalleryStore } from "@/stores/GalleryStore";

import GalleryItem from "./GalleryItem";

interface GalleryListGridProps {
    galleries: Gallery[];
    onGalleryPress: (gallery: Gallery) => void;
}

// Helper function to group galleries into pairs (rows of 2)
const groupIntoRows = (galleries: Gallery[]): (Gallery | null)[][] => {
    const rows: (Gallery | null)[][] = [];
    for (let i = 0; i < galleries.length; i += 2) {
        rows.push([galleries[i], galleries[i + 1] || null]);
    }
    return rows;
};

const GalleryListGrid: React.FC<GalleryListGridProps> = ({
    galleries,
    onGalleryPress,
}) => {
    const refreshGalleries = useGalleryStore((s) => s.refreshGalleries);
    const loadMoreGalleries = useGalleryStore((s) => s.loadMoreGalleries);
    const isLoadingMore = useGalleryStore((s) => s.galleriesPage.isLoadingMore);
    const hasMore = useGalleryStore((s) => s.galleriesPage.hasMore);

    const rows = groupIntoRows(galleries);
    const { refreshing, onRefresh } = usePullToRefresh(refreshGalleries);

    const handleEndReached = React.useCallback(() => {
        if (!hasMore || isLoadingMore) return;
        loadMoreGalleries();
    }, [hasMore, isLoadingMore, loadMoreGalleries]);

    return (
        <FlashList
            data={rows}
            renderItem={({ item: row }: { item: (Gallery | null)[] }) => (
                <View style={styles.row}>
                    {row.map((gallery, index) => (
                        <View
                            key={gallery?.id || `empty-${index}`}
                            style={[
                                styles.itemContainer,
                                index === 0
                                    ? styles.firstItem
                                    : styles.secondItem,
                            ]}
                        >
                            {gallery ? (
                                <GalleryItem
                                    gallery={gallery}
                                    onPress={() => onGalleryPress(gallery)}
                                />
                            ) : (
                                <View style={styles.emptyItem} />
                            )}
                        </View>
                    ))}
                </View>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            refreshing={refreshing}
            onRefresh={onRefresh}
            onEndReached={handleEndReached}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
                isLoadingMore ? (
                    <View style={styles.footer}>
                        <ActivityIndicator
                            size="small"
                            color={Colors.lightBlue}
                        />
                    </View>
                ) : null
            }
        />
    );
};

const styles = StyleSheet.create({
    row: {
        flexDirection: "row",
        paddingHorizontal: 15,
        marginBottom: 10,
    },
    itemContainer: {
        flex: 1,
    },
    firstItem: {
        marginRight: 15,
    },
    secondItem: {},
    emptyItem: {
        flex: 1,
    },
    separator: {
        height: 15,
    },
    footer: {
        paddingVertical: 15,
    },
});

export default GalleryListGrid;
