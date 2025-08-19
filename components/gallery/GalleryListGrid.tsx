import { fetchGalleries } from "@/api/endpoints/galleries";
import { Gallery as GalleryType } from "@/api/endpoints/types";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useAppStore } from "@/stores/AppStore";
import { FlashList } from "@shopify/flash-list";
import React from "react";
import { StyleSheet, View } from "react-native";
import GalleryItem from "./GalleryItem";

interface GalleryListGridProps {
    galleries: GalleryType[];
    onGalleryPress: (gallery: GalleryType) => void;
}

// Helper function to group galleries into pairs (rows of 2)
const groupIntoRows = (galleries: GalleryType[]): (GalleryType | null)[][] => {
    const rows: (GalleryType | null)[][] = [];
    for (let i = 0; i < galleries.length; i += 2) {
        const row = [galleries[i], galleries[i + 1] || null];
        rows.push(row);
    }
    return rows;
};

const fetchAndUpdateGalleries = async () => {
    const galleries = await fetchGalleries();
    useAppStore.setState({ galleries });
};

const GalleryListGrid: React.FC<GalleryListGridProps> = ({
    galleries,
    onGalleryPress,
}) => {
    const rows = groupIntoRows(galleries);
    const { refreshing, onRefresh } = usePullToRefresh(fetchAndUpdateGalleries);

    return (
        <FlashList
            data={rows}
            renderItem={({ item: row }: { item: (GalleryType | null)[] }) => (
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
            estimatedItemSize={180}
            refreshing={refreshing}
            onRefresh={onRefresh}
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
    secondItem: {
        // No margin for the second item
    },
    emptyItem: {
        flex: 1,
    },
    separator: {
        height: 15,
    },
});

export default GalleryListGrid;
