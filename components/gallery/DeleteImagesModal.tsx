import {
    deleteMultipleGalleryImages,
    fetchGalleries,
    fetchGalleryImages,
} from "@/api/endpoints";
import { DateImage } from "@/api/endpoints/types";
import { Colors } from "@/constants/colors";
import { useAppStore } from "@/stores/AppStore";
import { normalizeGalleries } from "@/utils/gallery";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Modal,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";
import CustomText from "../CustomText";

interface DeleteImagesModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedImages: DateImage[];
    galleryId: string;
    setImages: (images: DateImage[]) => void;
    setSelectedImages: (images: DateImage[]) => void;
    setEditMode: (editMode: boolean) => void;
}

const DeleteImagesModal: React.FC<DeleteImagesModalProps> = ({
    isOpen,
    onClose,
    selectedImages,
    galleryId,
    setImages,
    setSelectedImages,
    setEditMode,
}) => {
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDeleteImage = async () => {
        setIsDeleting(true);
        const deletedImages = await deleteMultipleGalleryImages(
            galleryId as string,
            selectedImages.map((image) => image.id.toString())
        );
        if (deletedImages) {
            const updatedGalleries = await fetchGalleries();
            useAppStore.setState({
                galleries: normalizeGalleries(updatedGalleries),
            });
            const images = await fetchGalleryImages(galleryId as string);
            setImages(images);
            setSelectedImages([]);
            setEditMode(false);
        }
        setIsDeleting(false);
        onClose();
    };

    return (
        <Modal
            visible={isOpen}
            onRequestClose={onClose}
            transparent={true}
            animationType="fade"
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                    <CustomText weight="bold" style={styles.modalTitle}>
                        Are you sure?
                    </CustomText>
                    <CustomText weight="regular" style={styles.modalText}>
                        Are you sure you want to delete these images?
                    </CustomText>
                    <View style={styles.modalButtons}>
                        <TouchableOpacity
                            style={styles.yesButton}
                            onPress={handleDeleteImage}
                        >
                            {isDeleting ? (
                                <ActivityIndicator
                                    size="small"
                                    color={Colors.white}
                                />
                            ) : (
                                <CustomText
                                    weight="semibold"
                                    style={styles.modalButtonText}
                                >
                                    Yes
                                </CustomText>
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.noButton}
                            onPress={onClose}
                        >
                            <CustomText
                                weight="semibold"
                                style={styles.modalButtonText}
                            >
                                No
                            </CustomText>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

export default DeleteImagesModal;

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center",
        alignItems: "center",
    },
    modalContainer: {
        backgroundColor: "white",
        borderRadius: 15,
        padding: 30,
        margin: 20,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        maxWidth: "90%",
        maxHeight: "80%",
    },
    modalTitle: {
        fontSize: 16,
        textAlign: "center",
        marginBottom: 10,
    },
    modalText: {
        fontSize: 13,
        textAlign: "center",
        marginBottom: 20,
    },
    modalButtons: {
        flexDirection: "row",
        gap: 25,
        justifyContent: "center",
    },
    yesButton: {
        backgroundColor: "#FFCC7D",
        borderRadius: 15,
        padding: 10,
        width: 83,
        justifyContent: "center",
        alignItems: "center",
    },
    noButton: {
        backgroundColor: "#AFAFAF",
        borderRadius: 15,
        padding: 10,
        width: 83,
        justifyContent: "center",
        alignItems: "center",
    },
    modalButtonText: {
        color: Colors.brownText,
        fontSize: 14,
    },
});
