import { Image } from "expo-image";
import React from "react";
import { Dimensions, StyleSheet, TouchableOpacity, View } from "react-native";

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

const SIZE = (Dimensions.get("window").width - 110) / 2;

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
            <View style={styles.container}>
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
                    source={
                        image.url_thumb ? { uri: image.url_thumb } : undefined
                    }
                    style={StyleSheet.absoluteFill}
                    contentFit="cover"
                    placeholder={
                        image.blur_hash
                            ? { blurhash: image.blur_hash }
                            : undefined
                    }
                    placeholderContentFit="cover"
                    transition={150}
                    cachePolicy="disk"
                />
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        width: SIZE,
        height: SIZE,
        borderRadius: 15,
        overflow: "hidden",
        backgroundColor: "rgba(255,255,255,0.2)",
    },
    editDeleteButton: {
        position: "absolute",
        top: 5,
        right: 5,
        borderWidth: 1.5,
        borderColor: Colors.white,
        padding: 10,
        borderRadius: 999,
        zIndex: 10,
    },
});

export default GalleryImageItem;
