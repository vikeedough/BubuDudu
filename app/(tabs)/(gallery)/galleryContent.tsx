import {
    deleteGallery,
    fetchGalleries,
    fetchGalleryImages,
    uploadGalleryImages,
} from "@/api/endpoints/supabase";
import { DateImage } from "@/api/endpoints/types";
import Back from "@/assets/svgs/back.svg";
import Plus from "@/assets/svgs/plus.svg";
import SortAscending from "@/assets/svgs/sort-ascending.svg";
import SortDescending from "@/assets/svgs/sort-descending.svg";
import TrashBin from "@/assets/svgs/trash-bin.svg";
import CustomText from "@/components/CustomText";
import DeleteGalleryModal from "@/components/gallery/DeleteGalleryModal";
import DeleteImagesModal from "@/components/gallery/DeleteImagesModal";
import ImageModal from "@/components/gallery/ImageModal";
import { Colors } from "@/constants/colors";
import { useAppStore } from "@/stores/AppStore";
import {
    convertDate,
    multipleDownloadAndSaveImage,
    pickMultipleImages,
} from "@/utils/gallery";
import { getDate } from "@/utils/home";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const GalleryContent = () => {
    const {
        galleryId,
        galleryTitle,
        galleryDate,
        galleryLocation,
        galleryColor,
    } = useLocalSearchParams();
    const date = getDate();

    const [loading, setLoading] = useState(true);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [images, setImages] = useState<DateImage[]>([]);
    const [selectedImage, setSelectedImage] = useState<DateImage | null>(null);
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const [isDeleteImagesModalOpen, setIsDeleteImagesModalOpen] =
        useState(false);
    const [isDeleteGalleryModalOpen, setIsDeleteGalleryModalOpen] =
        useState(false);
    const [editMode, setEditMode] = useState(false);
    const [selectedImages, setSelectedImages] = useState<DateImage[]>([]);
    const [sortingByAscending, setSortingByAscending] = useState(true);

    useEffect(() => {
        const fetchImages = async () => {
            const images = await fetchGalleryImages(galleryId as string);
            setImages(images);
            setLoading(false);
        };

        fetchImages();
    }, []);

    const sortedImages = useMemo(
        () =>
            images.sort((a, b) => {
                return sortingByAscending
                    ? a.created_at.localeCompare(b.created_at)
                    : b.created_at.localeCompare(a.created_at);
            }),
        [images, sortingByAscending]
    );

    const handleAddImages = async () => {
        const images = await pickMultipleImages();
        if (images) {
            const uploadedImages = await uploadGalleryImages(
                galleryId as string,
                images
            );
            if (uploadedImages) {
                const updatedGalleries = await fetchGalleries();
                useAppStore.setState({ galleries: updatedGalleries });
                const images = await fetchGalleryImages(galleryId as string);
                setImages(images);
            }
        }
    };

    const handleBack = () => {
        router.back();
    };

    const handleEditGallery = (image: DateImage) => {
        if (editMode) {
            setSelectedImages([]);
            setEditMode(false);
            return;
        }
        setEditMode(true);
        setSelectedImages([image]);
    };

    const handleSelectImage = (image: DateImage) => {
        if (selectedImages.includes(image)) {
            const filteredImages = selectedImages.filter(
                (i) => i.id !== image.id
            );
            setSelectedImages(filteredImages);
            if (filteredImages.length === 0) {
                setEditMode(false);
            }
        } else {
            setSelectedImages([...selectedImages, image]);
        }
    };

    const handleDownloadImages = async () => {
        setIsDownloading(true);
        await multipleDownloadAndSaveImage(selectedImages);
        setSelectedImages([]);
        setEditMode(false);
        setIsDownloading(false);
    };

    const handleDeleteGallery = async () => {
        setIsDeleting(true);
        const deletedGallery = await deleteGallery(galleryId as string);
        if (deletedGallery) {
            setIsDeleteGalleryModalOpen(false);
            router.back();
            const updatedGalleries = await fetchGalleries();
            useAppStore.setState({ galleries: updatedGalleries });
        }
        setIsDeleting(false);
    };

    return (
        <SafeAreaView style={styles.container}>
            {selectedImage && (
                <ImageModal
                    isOpen={isImageModalOpen}
                    imageId={selectedImage.id.toString()}
                    imageUri={selectedImage.url}
                    onClose={() => setIsImageModalOpen(false)}
                />
            )}
            {isDeleteImagesModalOpen && (
                <DeleteImagesModal
                    isOpen={isDeleteImagesModalOpen}
                    onClose={() => setIsDeleteImagesModalOpen(false)}
                    selectedImages={selectedImages}
                    galleryId={galleryId as string}
                    setImages={setImages}
                    setSelectedImages={setSelectedImages}
                    setEditMode={setEditMode}
                />
            )}
            {isDeleteGalleryModalOpen && (
                <DeleteGalleryModal
                    isOpen={isDeleteGalleryModalOpen}
                    onClose={() => setIsDeleteGalleryModalOpen(false)}
                    handleDeleteGallery={handleDeleteGallery}
                />
            )}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={handleBack}
                    style={styles.backButton}
                >
                    <Back />
                </TouchableOpacity>
                <View>
                    <CustomText weight="extrabold" style={styles.headerTitle}>
                        Gallery
                    </CustomText>
                    <CustomText weight="medium" style={styles.headerDate}>
                        {date}
                    </CustomText>
                </View>
            </View>
            <View
                style={[
                    styles.galleryContainer,
                    { backgroundColor: `${galleryColor}40` },
                ]}
            >
                <View style={styles.buttonContainer}>
                    <View style={styles.controlsContainer}>
                        <View style={styles.titleContainer}>
                            <CustomText weight="bold" style={styles.title}>
                                {galleryTitle}
                            </CustomText>
                            <CustomText weight="medium" style={styles.date}>
                                {convertDate(galleryDate as string)}
                            </CustomText>
                        </View>
                        <TouchableOpacity
                            style={styles.controlButton}
                            onPress={() => setIsDeleteGalleryModalOpen(true)}
                        >
                            {isDeleting ? (
                                <ActivityIndicator
                                    size="small"
                                    color={Colors.red}
                                />
                            ) : (
                                <TrashBin />
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.controlButton}
                            onPress={() =>
                                setSortingByAscending(!sortingByAscending)
                            }
                        >
                            {sortingByAscending ? (
                                <SortAscending />
                            ) : (
                                <SortDescending />
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.controlButton}
                            onPress={handleAddImages}
                        >
                            <Plus />
                        </TouchableOpacity>
                    </View>
                </View>

                {editMode && (
                    <View style={styles.editControlsContainer}>
                        <TouchableOpacity
                            style={styles.downloadButton}
                            onPress={handleDownloadImages}
                        >
                            {isDownloading ? (
                                <ActivityIndicator
                                    size="small"
                                    color={Colors.white}
                                />
                            ) : (
                                <CustomText
                                    weight="semibold"
                                    style={styles.buttonText}
                                >
                                    Download
                                </CustomText>
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.deleteButton}
                            onPress={() => setIsDeleteImagesModalOpen(true)}
                        >
                            <CustomText
                                weight="semibold"
                                style={styles.buttonText}
                            >
                                Delete
                            </CustomText>
                        </TouchableOpacity>
                    </View>
                )}

                <View style={styles.locationClearButtonRow}>
                    <View style={styles.locationContainer}>
                        <CustomText weight="semibold" style={styles.location}>
                            {galleryLocation}
                        </CustomText>
                    </View>
                    {selectedImages.length > 0 && (
                        <TouchableOpacity
                            style={styles.clearButton}
                            onPress={() => {
                                setSelectedImages([]);
                                setEditMode(false);
                            }}
                        >
                            <CustomText
                                weight="medium"
                                style={styles.clearButtonText}
                            >
                                Clear
                            </CustomText>
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.flatListContainer}>
                    {loading ? (
                        <ActivityIndicator
                            size="large"
                            color={Colors.lightBlue}
                        />
                    ) : (
                        <FlatList
                            data={sortedImages}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    onPress={() => {
                                        if (editMode) {
                                            handleSelectImage(item);
                                            return;
                                        }
                                        setSelectedImage(item);
                                        setIsImageModalOpen(true);
                                    }}
                                    onLongPress={() => {
                                        if (!editMode) {
                                            handleEditGallery(item);
                                            return;
                                        }
                                    }}
                                >
                                    {editMode && (
                                        <TouchableOpacity
                                            style={[
                                                styles.editDeleteButton,
                                                {
                                                    backgroundColor:
                                                        selectedImages.includes(
                                                            item
                                                        )
                                                            ? "rgba(255,255,255,0.7)"
                                                            : "transparent",
                                                },
                                            ]}
                                            onPress={() =>
                                                handleSelectImage(item)
                                            }
                                        />
                                    )}
                                    <Image
                                        source={{ uri: item.url }}
                                        style={styles.image}
                                    />
                                </TouchableOpacity>
                            )}
                            numColumns={2}
                            extraData={editMode}
                            columnWrapperStyle={{
                                gap: 10,
                            }}
                            contentContainerStyle={{
                                gap: 10,
                            }}
                            showsVerticalScrollIndicator={false}
                        />
                    )}
                </View>
            </View>
        </SafeAreaView>
    );
};

export default GalleryContent;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.backgroundPink,
        paddingVertical: 25,
        paddingHorizontal: 25,
    },
    backButton: {
        height: 28,
        width: 28,
        backgroundColor: Colors.white,
        borderRadius: 999,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#EBEAEC",
        marginTop: 3,
    },
    titleContainer: {
        marginBottom: 10,
        flex: 1,
    },
    title: {
        fontSize: 20,
        color: Colors.darkGreenText,
    },
    date: {
        marginTop: 5,
        fontSize: 10,
        color: Colors.darkGreenText,
    },
    image: {
        width: (Dimensions.get("window").width - 110) / 2,
        height: (Dimensions.get("window").width - 110) / 2,
        borderRadius: 15,
    },
    header: {
        marginBottom: 20,
        flexDirection: "row",
        gap: 10,
    },
    headerTitle: {
        fontSize: 24,
        color: Colors.darkGreenText,
    },
    headerDate: {
        fontSize: 12,
        color: Colors.darkGreenText,
    },
    galleryContainer: {
        flex: 1,
        paddingVertical: 25,
        marginBottom: 50,
        paddingHorizontal: 25,
        borderRadius: 15,
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 0,
    },
    controlsContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 10,
    },
    buttonContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 5,
    },
    button: {
        backgroundColor: Colors.lightBlue,
        padding: 10,
        borderRadius: 15,
    },
    buttonText: {
        fontSize: 16,
        color: Colors.brownText,
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
    selectedImagesContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 10,
        paddingHorizontal: 15,
        paddingVertical: 10,
        alignItems: "center",
        backgroundColor: Colors.white,
        borderRadius: 15,
        marginBottom: 20,
        position: "absolute",
        bottom: 10,
        alignSelf: "center",
        zIndex: 2000,
        borderWidth: 1,
        borderColor: Colors.lightBlue,
    },
    deleteImagesButton: {
        backgroundColor: Colors.red,
        padding: 10,
        borderRadius: 15,
    },
    controlButton: {
        backgroundColor: Colors.white,
        borderRadius: 999,
        padding: 10,
        height: 30,
        width: 30,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#EBEAEC",
    },
    locationContainer: {
        backgroundColor: "#F9CD64",
        borderRadius: 15,
        padding: 5,
        alignSelf: "flex-start",
        paddingHorizontal: 10,
        borderWidth: 1,
        borderColor: "transparent",
    },
    location: {
        fontSize: 10,
        color: Colors.brownText,
    },
    clearButton: {
        backgroundColor: Colors.white,
        borderRadius: 15,
        padding: 5,
        alignSelf: "flex-end",
        paddingHorizontal: 10,
        borderWidth: 1,
        borderColor: "#EBEAEC",
    },
    clearButtonText: {
        fontSize: 10,
        color: "#505739",
    },
    flatListContainer: {
        flex: 1,
    },
    editControlsContainer: {
        position: "absolute",
        bottom: 10,
        left: 0,
        right: 0,
        flexDirection: "row",
        justifyContent: "space-around",
        gap: 10,
        paddingHorizontal: 15,
        paddingVertical: 10,
        zIndex: 2000,
    },
    downloadButton: {
        backgroundColor: "#FFCC7D",
        padding: 10,
        borderRadius: 15,
        paddingHorizontal: 20,
    },
    deleteButton: {
        backgroundColor: "#BF7B7B",
        padding: 10,
        borderRadius: 15,
        paddingHorizontal: 20,
    },
    locationClearButtonRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        width: "100%",
        marginBottom: 10,
    },
});
