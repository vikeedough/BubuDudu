import { FlashList } from "@shopify/flash-list";
import React, { useCallback, useMemo } from "react";
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from "react-native";

import { Colors } from "@/constants/colors";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { GalleryImage } from "@/stores/GalleryStore";

import CustomText from "../CustomText";

import GalleryImageItem from "./GalleryImageItem";

interface GalleryImageGridProps {
    bottomInset?: number;
    error?: string | null;
    isOnline?: boolean;
    onRefresh?: () => Promise<unknown>;
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
const noRefresh = () => undefined;

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
    bottomInset = 0,
    isLoadingInitial,
    isLoadingMore,
    hasMore,
    onEndReached,
    editMode,
    selectedImageIds,
    onImagePress,
    onImageLongPress,
    onImageSelect,
    error = null,
    isOnline = true,
    onRefresh,
}) => {
    const { refreshing, onRefresh: refresh } = usePullToRefresh(onRefresh ?? noRefresh);
    const retry = isOnline && onRefresh ? (
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Retry loading photos" onPress={refresh} disabled={refreshing || isLoadingInitial} style={styles.retry}>
            <CustomText weight="semibold" style={styles.emptyText}>Retry</CustomText>
        </TouchableOpacity>
    ) : null;
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

    if (isLoadingInitial && images.length === 0) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.lightBlue} />
            </View>
        );
    }

    return (
        <View style={styles.flatListContainer}>
            {!isOnline && <CustomText style={styles.notice}>Offline. Only photos already cached on this device may open.</CustomText>}
            {error && images.length > 0 && <View accessibilityRole="alert" style={styles.notice}><CustomText style={styles.emptyText}>{error}</CustomText>{retry}</View>}
            <FlashList
                contentContainerStyle={{ paddingBottom: bottomInset }}
                data={rows}
                renderItem={renderRow}
                ItemSeparatorComponent={renderSeparator}
                onEndReached={handleEndReached}
                onEndReachedThreshold={0.5}
                refreshing={refreshing}
                onRefresh={isOnline && onRefresh ? refresh : undefined}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <CustomText weight="bold" style={styles.emptyTitle}>
                            {error ? "Photos could not load" : !isOnline ? "No cached photos" : "No photos here yet"}
                        </CustomText>
                        <CustomText weight="medium" style={styles.emptyText}>
                            {error ?? (!isOnline ? "Open this gallery online to load photos." : "Tap plus to add photos.")}
                        </CustomText>
                        {error ? retry : null}
                    </View>
                }
                ListFooterComponent={renderFooter}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    notice: { paddingVertical: 8, color: Colors.darkGreenText, fontSize: 12 },
    retry: { padding: 12, backgroundColor: Colors.yellow, borderRadius: 10, alignSelf: "center" },
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
