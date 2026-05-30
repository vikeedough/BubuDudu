import { FlashList } from "@shopify/flash-list";
import React, { useCallback, useMemo } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { Colors } from "@/constants/colors";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { Gallery, useGalleryStore } from "@/stores/GalleryStore";

import CustomText from "../CustomText";

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

const GalleryListGrid: React.FC<GalleryListGridProps> = ({
    galleries,
    onGalleryPress,
}) => {
    const refreshGalleries = useGalleryStore((s) => s.refreshGalleries);
    const loadMoreGalleries = useGalleryStore((s) => s.loadMoreGalleries);
    const error = useGalleryStore((s) => s.error);
    const isLoadingInitial = useGalleryStore(
        (s) => s.galleriesPage.isLoadingInitial,
    );
    const isLoadingMore = useGalleryStore((s) => s.galleriesPage.isLoadingMore);
    const hasMore = useGalleryStore((s) => s.galleriesPage.hasMore);
    const searchText = useGalleryStore((s) => s.galleriesQuery.searchText);

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
    const emptyState = useMemo(() => {
        if (isLoadingInitial) {
            return (
                <View style={styles.emptyState}>
                    <ActivityIndicator size="large" color={Colors.lightBlue} />
                </View>
            );
        }

        if (error) {
            return (
                <View style={styles.emptyState}>
                    <CustomText weight="bold" style={styles.emptyTitle}>
                        Gallery could not load
                    </CustomText>
                    <CustomText weight="medium" style={styles.emptyText}>
                        Pull down to try again.
                    </CustomText>
                </View>
            );
        }

        const hasSearch = searchText.trim().length > 0;
        return (
            <View style={styles.emptyState}>
                <CustomText weight="bold" style={styles.emptyTitle}>
                    {hasSearch ? "No matching galleries" : "No galleries yet"}
                </CustomText>
                <CustomText weight="medium" style={styles.emptyText}>
                    {hasSearch
                        ? "Try a different search."
                        : "Tap plus to save your first date."}
                </CustomText>
            </View>
        );
    }, [error, isLoadingInitial, searchText]);
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
            refreshing={refreshing}
            onRefresh={onRefresh}
            onEndReached={handleEndReached}
            onEndReachedThreshold={0.5}
            ListEmptyComponent={emptyState}
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
    emptyState: {
        flex: 1,
        minHeight: 260,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 28,
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

export default GalleryListGrid;
