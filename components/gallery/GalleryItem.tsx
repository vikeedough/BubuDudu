import { isBlurhashValid } from "blurhash";
import { Image } from "expo-image";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

import { Colors } from "@/constants/colors";
import { useGalleryStore , Gallery as GalleryType } from "@/stores/GalleryStore";
import { getIsOnline } from "@/utils/offline/network";

import CustomText from "../CustomText";

interface GalleryItemProps {
    gallery: GalleryType;
    onPress: (gallery: GalleryType) => void;
}

const GalleryItem: React.FC<GalleryItemProps> = ({ gallery, onPress }) => {
    const retried = useRef(false);
    const [failed, setFailed] = useState(false);
    const refreshCover = useCallback((explicit?: unknown) => {
        if (!getIsOnline() || (retried.current && explicit !== true)) return;
        retried.current = true;
        void useGalleryStore.getState().refreshCoverUrls([gallery.id], true)
            .then(() => setFailed(false)).catch(() => setFailed(true));
    }, [gallery.id]);
    useEffect(() => {
        retried.current = false; setFailed(false);
        if (!gallery.cover_expires_at) return;
        const expiry = Date.parse(gallery.cover_expires_at);
        if (!Number.isFinite(expiry)) return;
        const timer = setTimeout(refreshCover, Math.max(0, expiry - Date.now() - 30000));
        return () => clearTimeout(timer);
    }, [gallery.cover_expires_at, gallery.cover_image_thumb_path, refreshCover]);
    return (
        <View style={styles.shadowContainer}>
            <TouchableOpacity
                style={[
                    styles.container,
                    { backgroundColor: `${gallery.color}40` },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Open gallery ${gallery.title}`}
                onPress={() => onPress(gallery)}
            >
                <View>
                    {gallery.cover_thumb_url ? (
                        <Image
                            source={{ uri: gallery.cover_thumb_url, cacheKey: gallery.cache_scope ? `${gallery.cache_scope}/${gallery.cover_image_thumb_path}` : undefined }}
                            onError={refreshCover}
                            placeholder={
                                gallery.cover_image_blur_hash && isBlurhashValid(gallery.cover_image_blur_hash).result ? { blurhash: gallery.cover_image_blur_hash } : undefined
                            }
                            transition={200}
                            style={styles.image}
                            cachePolicy="memory-disk"
                        />
                    ) : null}
                    {failed && <TouchableOpacity accessibilityRole="button" accessibilityLabel="Retry gallery cover" onPress={() => refreshCover(true)} style={{ minHeight: 44, justifyContent: "center" }}><CustomText style={{ color: Colors.darkGreenText }}>Cover unavailable. Retry</CustomText></TouchableOpacity>}
                    <View style={styles.locationContainer}>
                        <CustomText
                            weight="semibold"
                            style={styles.location}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                        >
                            {gallery.location}
                        </CustomText>
                    </View>
                </View>

                <CustomText
                    weight="bold"
                    style={styles.title}
                    numberOfLines={3}
                    ellipsizeMode="tail"
                >
                    {gallery.title}
                </CustomText>
            </TouchableOpacity>
        </View>
    );
};

export default React.memo(GalleryItem);

const styles = StyleSheet.create({
    shadowContainer: {
        backgroundColor: "white",
        borderRadius: 15,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3,
        elevation: 3,
        flex: 1,
    },
    container: {
        backgroundColor: Colors.white,
        padding: 10,
        borderRadius: 15,
        flex: 1,
        minHeight: 150,
        justifyContent: "flex-start",
    },
    title: {
        marginTop: 10,
        fontSize: 14,
        color: "#774433",
        lineHeight: 18,
    },
    image: {
        width: "100%",
        height: 85,
        borderRadius: 15,
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    locationContainer: {
        marginTop: 10,
        backgroundColor: "#F9CD64",
        borderRadius: 15,
        padding: 5,
        alignSelf: "flex-start",
        justifyContent: "center",
        alignItems: "center",
    },
    location: {
        fontSize: 10,
        color: Colors.brownText,
        textAlign: "center",
        paddingLeft: 3,
        paddingRight: 2,
    },
});
