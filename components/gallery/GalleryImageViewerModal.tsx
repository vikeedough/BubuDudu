import React, { useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Image,
    Modal,
    StyleSheet,
    TouchableOpacity,
    View,
    useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Gallery, fitContainer } from "react-native-zoom-toolkit";

import Back from "@/assets/svgs/back.svg";
import { Colors } from "@/constants/colors";
import type { GalleryImage } from "@/stores/GalleryStore";
import { GestureHandlerRootView } from "react-native-gesture-handler";

interface GalleryImageViewerModalProps {
    isOpen: boolean;
    initialImageId: string | null;
    images: GalleryImage[];
    hasMore: boolean;
    isLoadingMore: boolean;
    onLoadMore: () => void;
    onClose: () => void;
}

const getBestUrl = (img?: GalleryImage | null) => {
    if (!img) return null;
    return img.url_orig ?? img.url_grid ?? img.url_thumb ?? null;
};

const getBestKnownSize = (img: GalleryImage, uri: string | null) => {
    if (!uri) return null;

    if (uri === img.url_orig && img.width_orig && img.height_orig) {
        return { width: img.width_orig, height: img.height_orig };
    }
    if (uri === img.url_grid && img.width_grid && img.height_grid) {
        return { width: img.width_grid, height: img.height_grid };
    }
    if (uri === img.url_thumb && img.width_thumb && img.height_thumb) {
        return { width: img.width_thumb, height: img.height_thumb };
    }

    if (img.width_grid && img.height_grid) {
        return { width: img.width_grid, height: img.height_grid };
    }
    if (img.width_orig && img.height_orig) {
        return { width: img.width_orig, height: img.height_orig };
    }
    if (img.width_thumb && img.height_thumb) {
        return { width: img.width_thumb, height: img.height_thumb };
    }

    return null;
};

const GalleryViewerItem = React.memo(
    ({
        img,
        containerWidth,
        containerHeight,
    }: {
        img: GalleryImage;
        containerWidth: number;
        containerHeight: number;
    }) => {
        const uri = getBestUrl(img);

        const [intrinsicSize, setIntrinsicSize] = useState<{
            width: number;
            height: number;
        } | null>(null);

        const knownSize = getBestKnownSize(img, uri) ?? intrinsicSize;

        const fitted =
            knownSize && knownSize.width > 0 && knownSize.height > 0
                ? fitContainer(knownSize.width / knownSize.height, {
                      width: containerWidth,
                      height: containerHeight,
                  })
                : { width: containerWidth, height: containerHeight };

        return (
            <View style={styles.page}>
                {uri ? (
                    <Image
                        source={{ uri }}
                        style={{
                            width: fitted.width,
                            height: fitted.height,
                        }}
                        resizeMode="contain"
                        onLoad={(e) => {
                            if (intrinsicSize) return;
                            const { width, height } = e.nativeEvent.source;
                            if (!width || !height) return;
                            setIntrinsicSize({ width, height });
                        }}
                    />
                ) : (
                    <View style={styles.empty} />
                )}
            </View>
        );
    },
);

GalleryViewerItem.displayName = "GalleryViewerItem";

const GalleryImageViewerModal: React.FC<GalleryImageViewerModalProps> = ({
    isOpen,
    initialImageId,
    images,
    hasMore,
    isLoadingMore,
    onLoadMore,
    onClose,
}) => {
    const window = useWindowDimensions();
    const [containerSize, setContainerSize] = useState<{
        width: number;
        height: number;
    }>({ width: 0, height: 0 });
    const lastLoadMoreLengthRef = useRef<number>(-1);

    const initialIndex = useMemo(() => {
        if (!images.length) return 0;
        if (!initialImageId) return 0;
        const idx = images.findIndex((img) => img.id === initialImageId);
        return idx >= 0 ? idx : 0;
    }, [images, initialImageId]);

    const safeInitialIndex = useMemo(() => {
        if (!images.length) return 0;
        return Math.min(Math.max(initialIndex, 0), images.length - 1);
    }, [images.length, initialIndex]);

    const containerWidth = containerSize.width || window.width;
    const containerHeight = containerSize.height || window.height;

    const shouldMountGallery =
        isOpen &&
        images.length > 0 &&
        containerWidth > 0 &&
        containerHeight > 0;

    return (
        <Modal
            visible={isOpen}
            onRequestClose={onClose}
            transparent
            animationType="fade"
        >
            <GestureHandlerRootView style={{ flex: 1 }}>
                <View style={styles.modalOverlay}>
                    <SafeAreaView style={styles.safeArea}>
                        <View style={styles.topBar}>
                            <TouchableOpacity
                                style={styles.closeButton}
                                onPress={onClose}
                                accessibilityRole="button"
                                accessibilityLabel="Close image viewer"
                            >
                                <Back />
                            </TouchableOpacity>
                        </View>

                        <View
                            style={styles.galleryContainer}
                            onLayout={(e) => {
                                const { width, height } = e.nativeEvent.layout;
                                if (!width || !height) return;
                                setContainerSize((prev) => {
                                    if (
                                        prev.width === width &&
                                        prev.height === height
                                    ) {
                                        return prev;
                                    }
                                    return { width, height };
                                });
                            }}
                        >
                            {!shouldMountGallery && (
                                <View style={styles.loadingContainer}>
                                    <ActivityIndicator
                                        size="large"
                                        color={Colors.white}
                                    />
                                </View>
                            )}

                            {shouldMountGallery && (
                                <Gallery<GalleryImage>
                                    data={images}
                                    initialIndex={safeInitialIndex}
                                    gap={16}
                                    windowSize={3}
                                    keyExtractor={(item) => item.id}
                                    onIndexChange={(index) => {
                                        if (
                                            index >= images.length - 3 &&
                                            hasMore &&
                                            !isLoadingMore
                                        ) {
                                            if (
                                                lastLoadMoreLengthRef.current !==
                                                images.length
                                            ) {
                                                lastLoadMoreLengthRef.current =
                                                    images.length;
                                                onLoadMore();
                                            }
                                        }
                                    }}
                                    renderItem={(item, _index) => {
                                        const img = item as unknown as
                                            | GalleryImage
                                            | null
                                            | undefined;
                                        if (!img) {
                                            return (
                                                <View
                                                    style={{
                                                        width: containerWidth,
                                                        height: containerHeight,
                                                    }}
                                                />
                                            );
                                        }

                                        return (
                                            <GalleryViewerItem
                                                img={img}
                                                containerWidth={containerWidth}
                                                containerHeight={
                                                    containerHeight
                                                }
                                            />
                                        );
                                    }}
                                    onPanStart={() => console.log("onPanStart")}
                                    onPanEnd={() => console.log("onPanEnd")}
                                    onPinchStart={() =>
                                        console.log("onPinchStart")
                                    }
                                    onPinchEnd={() => console.log("onPinchEnd")}
                                    onTap={() => console.log("onTap")}
                                    onSwipe={(dir) =>
                                        console.log("onSwipe", dir)
                                    }
                                />
                            )}
                        </View>
                    </SafeAreaView>
                </View>
            </GestureHandlerRootView>
        </Modal>
    );
};

export default GalleryImageViewerModal;

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.95)",
    },
    safeArea: {
        flex: 1,
    },
    topBar: {
        width: "100%",
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 10,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-start",
    },
    closeButton: {
        backgroundColor: Colors.white,
        borderRadius: 999,
        height: 28,
        width: 28,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#EBEAEC",
    },
    galleryContainer: {
        flex: 1,
    },
    page: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "transparent",
    },
    empty: {
        width: "100%",
        height: "100%",
    },
    loadingContainer: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: "center",
        alignItems: "center",
    },
});
