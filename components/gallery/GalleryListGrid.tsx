import { FlashList } from "@shopify/flash-list";
import React, { useCallback, useMemo } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { Colors } from "@/constants/colors";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { Gallery, useGalleryStore } from "@/stores/GalleryStore";

import GalleryItem from "./GalleryItem";

interface GalleryListGridProps {
    galleries: Gallery[];
    onGalleryPress: (gallery: Gallery) => void;
}

type GalleryRow = (Gallery | null)[];

// Helper function to group galleries into pairs (rows of 2)
const groupIntoRows = (galleries: Gallery[]): GalleryRow[] => {
    const rows: GalleryRow[] = [];
    for (let i = 0; i < galleries.length; i += 2) {
        rows.push([galleries[i], galleries[i + 1] || null]);
    }
    return rows;
};

const ESTIMATED_ROW_SIZE = 185;

const GalleryListGrid: React.FC<GalleryListGridProps> = ({
    galleries,
    onGalleryPress,
}) => {
    const refreshGalleries = useGalleryStore((s) => s.refreshGalleries);
    const loadMoreGalleries = useGalleryStore((s) => s.loadMoreGalleries);
    const isLoadingMore = useGalleryStore((s) => s.galleriesPage.isLoadingMore);
    const hasMore = useGalleryStore((s) => s.galleriesPage.hasMore);

    const rows = useMemo(() => groupIntoRows(galleries), [galleries]);
    const { refreshing, onRefresh } = usePullToRefresh(refreshGalleries);

    const handleEndReached = useCallback(() => {
        if (!hasMore || isLoadingMore) return;
        loadMoreGalleries();
    }, [hasMore, isLoadingMore, loadMoreGalleries]);
    const renderSeparator = useCallback(
        () => <View style={styles.separator} />,
        [],
    );
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
        ({ item: row }: { item: GalleryRow }) => (
            <View style={styles.row}>
                {row.map((gallery, index) => (
                    <View
                        key={gallery?.id || `empty-${index}`}
                        style={[
                            styles.itemContainer,
                            index === 0 ? styles.firstItem : styles.secondItem,
                        ]}
                    >
                        {gallery ? (
                            <GalleryItem
                                gallery={gallery}
                                onPress={onGalleryPress}
                            />
                        ) : (
                            <View style={styles.emptyItem} />
                        )}
                    </View>
                ))}
            </View>
        ),
        [onGalleryPress],
    );

    return (
        <FlashList
            data={rows}
            renderItem={renderRow}
            ItemSeparatorComponent={renderSeparator}
            estimatedItemSize={ESTIMATED_ROW_SIZE}
            refreshing={refreshing}
            onRefresh={onRefresh}
            onEndReached={handleEndReached}
            onEndReachedThreshold={0.5}
            ListFooterComponent={renderFooter}
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
