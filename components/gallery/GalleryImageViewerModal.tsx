import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Image,
    Modal,
    StyleSheet,
    TouchableOpacity,
    View,
    useWindowDimensions,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { Gallery, fitContainer } from "react-native-zoom-toolkit";

import Back from "@/assets/svgs/back.svg";
import CustomText from "@/components/CustomText";
import { Colors } from "@/constants/colors";
import { useGalleryImageRefresh } from "@/hooks/useGalleryImageRefresh";

import type { GalleryImage } from "@/stores/GalleryStore";
import type { GalleryRefType } from "react-native-zoom-toolkit";

interface GalleryImageViewerModalProps {
    isOpen: boolean;
    initialImageId: string | null;
    images: GalleryImage[];
    hasMore: boolean;
    isLoadingMore: boolean;
    onLoadMore: () => Promise<unknown> | void;
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
        const renew = useGalleryImageRefresh(img);
        const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");
        useEffect(() => { setStatus("loading"); }, [uri]);

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
                {status !== "loaded" && img.url_thumb && img.url_thumb !== uri ? <Image source={{ uri: img.url_thumb }} resizeMode="contain" style={{ position: "absolute", width: fitted.width, height: fitted.height }} /> : null}
                {uri ? (
                    <Image
                        source={{ uri }}
                        style={{
                            width: fitted.width,
                            height: fitted.height,
                        }}
                        resizeMode="contain"
                        accessibilityLabel="Gallery photo"
                        onLoadStart={() => setStatus("loading")}
                        onError={() => { setStatus("error"); renew(); }}
                        onLoad={(e) => {
                            setStatus("loaded");
                            if (intrinsicSize) return;
                            const { width, height } = e.nativeEvent.source;
                            if (!width || !height) return;
                            setIntrinsicSize({ width, height });
                        }}
                    />
                ) : (
                    <View style={styles.empty} />
                )}
                {status === "loading" && uri && <ActivityIndicator accessibilityLabel="Loading original photo" color={Colors.white} style={StyleSheet.absoluteFill} />}
                {(status === "error" || !uri) && <View style={styles.imageNotice}><CustomText style={{ color: Colors.white }}>Photo could not load</CustomText><TouchableOpacity accessibilityRole="button" accessibilityLabel="Retry photo" onPress={() => { setStatus("loading"); renew(true); }} style={styles.retry}><CustomText>Retry</CustomText></TouchableOpacity></View>}
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
    const galleryRef = useRef<GalleryRefType>(null);
    const activeId = useRef<string | null>(initialImageId);
    const activeIndex = useRef(0);
    const request = useRef<symbol | null>(null);
    const session = useRef(0);
    const attempted = useRef(-1);
    const [pageFailed, setPageFailed] = useState(false);
    useLayoutEffect(() => {
        session.current++; request.current = null; attempted.current = -1;
        activeId.current = initialImageId; setPageFailed(false);
    }, [isOpen, initialImageId]);
    useLayoutEffect(() => {
        if (!isOpen || !activeId.current) return;
        const index = images.findIndex((image) => image.id === activeId.current);
        if (index >= 0 && index !== activeIndex.current) {
            activeIndex.current = index; galleryRef.current?.setIndex(index);
        }
    }, [images, isOpen]);

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
    const emptyPageStyle = useMemo(
        () => ({
            width: containerWidth,
            height: containerHeight,
        }),
        [containerHeight, containerWidth],
    );
    const requestMore = useCallback((explicit = false) => {
        if (!isOpen || !hasMore || isLoadingMore || request.current || (!explicit && attempted.current === images.length)) return;
        const token = Symbol(); const epoch = session.current;
        request.current = token; attempted.current = images.length; setPageFailed(false);
        void Promise.resolve().then(onLoadMore).then((rows) => {
            if (epoch === session.current && Array.isArray(rows) && rows.length <= images.length) setPageFailed(true);
        }).catch(() => { if (epoch === session.current) setPageFailed(true); })
            .finally(() => { if (request.current === token) request.current = null; });
    }, [hasMore, images.length, isLoadingMore, isOpen, onLoadMore]);
    const handleIndexChange = useCallback((index: number) => {
        activeIndex.current = index; activeId.current = images[index]?.id ?? null;
        if (index >= images.length - 3) requestMore();
    }, [images, requestMore]);
    const renderGalleryItem = useCallback(
        (item: GalleryImage, _index: number) => {
            const img = item as unknown as GalleryImage | null | undefined;
            if (!img) {
                return <View style={emptyPageStyle} />;
            }

            return (
                <GalleryViewerItem
                    img={img}
                    containerWidth={containerWidth}
                    containerHeight={containerHeight}
                />
            );
        },
        [containerHeight, containerWidth, emptyPageStyle],
    );

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
                                hitSlop={8}
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
                                    ref={galleryRef}
                                    data={images}
                                    initialIndex={safeInitialIndex}
                                    gap={16}
                                    windowSize={3}
                                    keyExtractor={(item) => item.id}
                                    onIndexChange={handleIndexChange}
                                    renderItem={renderGalleryItem}
                                />
                            )}
                            {isLoadingMore && <ActivityIndicator accessibilityLabel="Loading more photos" color={Colors.white} />}
                            {pageFailed && hasMore && <TouchableOpacity accessibilityRole="button" accessibilityLabel="Retry loading more photos" onPress={() => requestMore(true)} style={styles.retry}><CustomText>More photos could not load. Retry</CustomText></TouchableOpacity>}
                        </View>
                    </SafeAreaView>
                </View>
            </GestureHandlerRootView>
        </Modal>
    );
};

export default GalleryImageViewerModal;

const styles = StyleSheet.create({
    retry: { padding: 12, minHeight: 44, backgroundColor: Colors.yellow, borderRadius: 10, alignSelf: "center" },
    imageNotice: { position: "absolute", alignItems: "center", gap: 12 },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.95)",
    },
    safeArea: {
        flex: 1,
    },
    topBar: {
        width: "100%",
        marginTop: 40,
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
