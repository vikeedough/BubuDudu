import { DateImage } from "@/api/endpoints/types";
import { Colors } from "@/constants/colors";
import React from "react";
import { ActivityIndicator, FlatList, StyleSheet, View } from "react-native";
import GalleryImageItem from "./GalleryImageItem";

interface GalleryImageGridProps {
    images: DateImage[];
    loading: boolean;
    editMode: boolean;
    selectedImages: DateImage[];
    onImagePress: (image: DateImage) => void;
    onImageLongPress: (image: DateImage) => void;
    onImageSelect: (image: DateImage) => void;
}

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

    return (
        <View style={styles.flatListContainer}>
            <FlatList
                data={images}
                renderItem={({ item }) => (
                    <GalleryImageItem
                        image={item}
                        editMode={editMode}
                        isSelected={selectedImages.includes(item)}
                        onPress={() => onImagePress(item)}
                        onLongPress={() => onImageLongPress(item)}
                        onSelect={() => onImageSelect(item)}
                    />
                )}
                numColumns={2}
                extraData={editMode}
                columnWrapperStyle={{ gap: 10 }}
                contentContainerStyle={{ gap: 10 }}
                showsVerticalScrollIndicator={false}
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
});

export default GalleryImageGrid;
