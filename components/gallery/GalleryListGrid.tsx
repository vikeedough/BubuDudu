import { Gallery as GalleryType } from "@/api/endpoints/types";
import React from "react";
import { FlatList, StyleSheet, View } from "react-native";
import GalleryItem from "./GalleryItem";

interface GalleryListGridProps {
    galleries: GalleryType[];
    onGalleryPress: (gallery: GalleryType) => void;
}

const GalleryListGrid: React.FC<GalleryListGridProps> = ({
    galleries,
    onGalleryPress,
}) => {
    return (
        <FlatList
            data={galleries}
            renderItem={({ item }: { item: GalleryType }) => (
                <GalleryItem
                    gallery={item}
                    onPress={() => onGalleryPress(item)}
                />
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            numColumns={2}
            columnWrapperStyle={styles.columnWrapper}
        />
    );
};

const styles = StyleSheet.create({
    separator: {
        height: 15,
    },
    columnWrapper: {
        justifyContent: "space-between",
    },
});

export default GalleryListGrid;
