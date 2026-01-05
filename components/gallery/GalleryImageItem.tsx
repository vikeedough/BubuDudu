import { Image } from "expo-image";
import React from "react";
import { Dimensions, StyleSheet, TouchableOpacity } from "react-native";

import { Colors } from "@/constants/colors";
import { GalleryImage } from "@/stores/GalleryStore";

interface GalleryImageItemProps {
    image: GalleryImage;
    editMode: boolean;
    isSelected: boolean;
    onPress: () => void;
    onLongPress: () => void;
    onSelect: () => void;
}

const GalleryImageItem: React.FC<GalleryImageItemProps> = ({
    image,
    editMode,
    isSelected,
    onPress,
    onLongPress,
    onSelect,
}) => {
    return (
        <TouchableOpacity onPress={onPress} onLongPress={onLongPress}>
            {editMode && (
                <TouchableOpacity
                    style={[
                        styles.editDeleteButton,
                        {
                            backgroundColor: isSelected
                                ? "rgba(255,255,255,0.7)"
                                : "transparent",
                        },
                    ]}
                    onPress={onSelect}
                />
            )}
            <Image
                source={{ uri: image.url }}
                placeholder={image.blur_hash}
                transition={200}
                style={styles.image}
                cachePolicy="memory-disk"
            />
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    image: {
        width: (Dimensions.get("window").width - 110) / 2,
        height: (Dimensions.get("window").width - 110) / 2,
        borderRadius: 15,
    },
    editDeleteButton: {
        position: "absolute",
        top: 5,
        right: 5,
        borderWidth: 1.5,
        borderColor: Colors.white,
        padding: 10,
        borderRadius: 999,
        zIndex: 1000,
    },
});

export default GalleryImageItem;
