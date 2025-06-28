import {
    deleteMultipleGalleryImages,
    fetchGalleries,
    fetchGalleryImages,
    uploadGalleryImages,
} from "@/api/endpoints/supabase";
import { DateImage } from "@/api/endpoints/types";
import CustomText from "@/components/CustomText";
import ImageModal from "@/components/gallery/ImageModal";
import Colors from "@/constants/colors";
import { useAppStore } from "@/stores/AppStore";
import { convertDate, pickMultipleImages } from "@/utils/gallery";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
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
    const { galleryId, galleryTitle, galleryDate } = useLocalSearchParams();

    const [loading, setLoading] = useState(true);
    const [images, setImages] = useState<DateImage[]>([]);
    const [selectedImage, setSelectedImage] = useState<DateImage | null>(null);
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [selectedImages, setSelectedImages] = useState<DateImage[]>([]);

    useEffect(() => {
        const fetchImages = async () => {
            const images = await fetchGalleryImages(galleryId as string);
            setImages(images);
            setLoading(false);
        };

        fetchImages();
    }, []);

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

    const handleEditGallery = () => {
        if (editMode) {
            setSelectedImages([]);
            setEditMode(false);
            return;
        }
        setEditMode(true);
        setSelectedImages([]);
    };

    const handleSelectImage = (image: DateImage) => {
        if (selectedImages.includes(image)) {
            setSelectedImages(selectedImages.filter((i) => i.id !== image.id));
        } else {
            setSelectedImages([...selectedImages, image]);
        }
    };

    const handleDeleteImage = async () => {
        const deletedImages = await deleteMultipleGalleryImages(
            galleryId as string,
            selectedImages.map((image) => image.id.toString())
        );
        if (deletedImages) {
            const updatedGalleries = await fetchGalleries();
            useAppStore.setState({ galleries: updatedGalleries });
            const images = await fetchGalleryImages(galleryId as string);
            setImages(images);
            setSelectedImages([]);
            setEditMode(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            {selectedImage && (
                <ImageModal
                    isOpen={isImageModalOpen}
                    imageUri={selectedImage.url}
                    onClose={() => setIsImageModalOpen(false)}
                />
            )}
            {selectedImages.length > 0 && (
                <View style={styles.selectedImagesContainer}>
                    <CustomText>
                        Selected Images: {selectedImages.length}
                    </CustomText>
                    <TouchableOpacity
                        style={styles.deleteImagesButton}
                        onPress={() => {
                            handleDeleteImage();
                        }}
                    >
                        <CustomText weight="bold" style={styles.buttonText}>
                            Delete Images
                        </CustomText>
                    </TouchableOpacity>
                </View>
            )}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.headerButton}
                    onPress={handleBack}
                >
                    <CustomText weight="bold" style={styles.headerTitle}>
                        Back
                    </CustomText>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => {
                        console.log(selectedImages);
                    }}
                >
                    <CustomText weight="bold" style={styles.headerTitle}>
                        Delete Gallery
                    </CustomText>
                </TouchableOpacity>
            </View>
            <View style={styles.titleContainer}>
                <CustomText weight="bold" style={styles.title}>
                    {galleryTitle}
                </CustomText>
                <CustomText>{convertDate(galleryDate as string)}</CustomText>
            </View>

            <View style={styles.buttonContainer}>
                <TouchableOpacity
                    style={styles.button}
                    onPress={handleAddImages}
                >
                    <CustomText weight="bold" style={styles.buttonText}>
                        Add Images
                    </CustomText>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.button}
                    onPress={handleEditGallery}
                >
                    <CustomText weight="bold" style={styles.buttonText}>
                        Edit Gallery
                    </CustomText>
                </TouchableOpacity>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color={Colors.lightBlue} />
            ) : (
                <FlatList
                    data={images}
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
                        >
                            {editMode && (
                                <TouchableOpacity
                                    style={[
                                        styles.editDeleteButton,
                                        {
                                            backgroundColor:
                                                selectedImages.includes(item)
                                                    ? Colors.white
                                                    : "transparent",
                                        },
                                    ]}
                                    onPress={() => handleSelectImage(item)}
                                />
                            )}
                            <Image
                                source={{ uri: item.url }}
                                style={styles.image}
                            />
                        </TouchableOpacity>
                    )}
                    numColumns={3}
                    extraData={editMode}
                />
            )}
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
    titleContainer: {
        marginBottom: 20,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    title: {
        fontSize: 24,
    },
    image: {
        width: (Dimensions.get("window").width - 50) / 3,
        height: (Dimensions.get("window").width - 50) / 3,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
    },
    deleteButton: {
        backgroundColor: Colors.red,
        padding: 10,
        borderRadius: 15,
    },
    headerButton: {
        backgroundColor: Colors.lightBlue,
        padding: 10,
        borderRadius: 15,
    },
    headerTitle: {
        fontSize: 24,
        color: Colors.white,
    },
    buttonContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
    },
    button: {
        backgroundColor: Colors.lightBlue,
        padding: 10,
        borderRadius: 15,
    },
    buttonText: {
        fontSize: 16,
        color: Colors.white,
    },
    editDeleteButton: {
        position: "absolute",
        top: 5,
        right: 5,
        borderWidth: 1.5,
        borderColor: Colors.pink,
        padding: 12,
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
});
