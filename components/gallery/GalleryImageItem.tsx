import { Image } from "expo-image";
import React, { useEffect, useState } from "react";
import { Dimensions, StyleSheet, TouchableOpacity, View } from "react-native";

import CustomText from "@/components/CustomText";
import { Colors } from "@/constants/colors";
import { useGalleryImageRefresh } from "@/hooks/useGalleryImageRefresh";
import { GalleryImage } from "@/stores/GalleryStore";

interface GalleryImageItemProps {
    image: GalleryImage;
    editMode: boolean;
    isSelected: boolean;
    onPress: (image: GalleryImage) => void;
    onLongPress: (image: GalleryImage) => void;
    onSelect: (image: GalleryImage) => void;
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
    const onImageError = useGalleryImageRefresh(image);
    const [failed, setFailed] = useState(false);
    useEffect(() => { setFailed(false); }, [image.id, image.url_thumb]);
    return (
        <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`Photo ${image.created_at}`}
            accessibilityState={{ selected: isSelected }}
            accessibilityHint={editMode ? "Double tap to change selection" : "Open photo, or use Select photo to select"}
            accessibilityActions={[{ name: "select", label: "Select photo" }]}
            onAccessibilityAction={(event) => { if (event.nativeEvent.actionName === "select") onSelect(image); }}
            onPress={() => onPress(image)}
            onLongPress={() => onLongPress(image)}
        >
            <View style={styles.container}>
                <Image
                    source={
                        image.url_thumb ? { uri: image.url_thumb, cacheKey: image.cache_scope ? `${image.cache_scope}/${image.storage_path_thumb}` : undefined } : undefined
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
                    onLoad={() => setFailed(false)}
                    onError={() => { setFailed(true); onImageError(); }}
                    cachePolicy="disk"
                />
                {failed && <TouchableOpacity accessibilityRole="button" accessibilityLabel="Retry photo thumbnail" onPress={() => onImageError(true)} style={styles.retry}><CustomText style={{ color: Colors.darkGreenText, textAlign: "center" }}>Photo unavailable. Retry</CustomText></TouchableOpacity>}
                    <TouchableOpacity
                        hitSlop={11}
                        accessibilityRole="checkbox"
                        accessibilityLabel={`Select photo ${image.created_at}`}
                        accessibilityState={{ checked: isSelected }}
                        style={[
                            styles.editDeleteButton,
                            {
                                backgroundColor: isSelected
                                    ? "rgba(255,255,255,0.7)"
                                    : "transparent",
                            },
                        ]}
                        onPress={() => onSelect(image)}
                    />
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    retry: { position: "absolute", bottom: 0, left: 0, right: 0, minHeight: 44, padding: 8, backgroundColor: Colors.yellow, justifyContent: "center" },
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

export default React.memo(GalleryImageItem);
