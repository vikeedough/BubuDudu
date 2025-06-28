import {
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
        console.log("Edit Gallery");
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
                    onPress={() => {}}
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
                                setSelectedImage(item);
                                setIsImageModalOpen(true);
                            }}
                        >
                            <Image
                                source={{ uri: item.url }}
                                style={styles.image}
                            />
                        </TouchableOpacity>
                    )}
                    numColumns={3}
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
});
