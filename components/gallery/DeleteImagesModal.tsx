import { Colors } from "@/constants/colors";
import { GalleryImage, useGalleryStore } from "@/stores/GalleryStore";
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
    selectedImages: GalleryImage[];
    galleryId: string;
    setSelectedImages: (images: GalleryImage[]) => void;
    setEditMode: (editMode: boolean) => void;
}

const DeleteImagesModal: React.FC<DeleteImagesModalProps> = ({
    isOpen,
    onClose,
    selectedImages,
    galleryId,
    setSelectedImages,
    setEditMode,
}) => {
    const [isDeleting, setIsDeleting] = useState(false);

    const fetchGalleryImages = useGalleryStore((s) => s.fetchGalleryImages);
    const deleteMultipleGalleryImages = useGalleryStore(
        (s) => s.deleteMultipleGalleryImages
    );

    const handleDeleteImage = async () => {
        if (!selectedImages.length) {
            onClose();
            return;
        }

        setIsDeleting(true);

        const ok = await deleteMultipleGalleryImages(
            galleryId,
            selectedImages.map((img) => img.id.toString())
        );

        if (ok) {
            await fetchGalleryImages(galleryId);
            setSelectedImages([]);
            setEditMode(false);
            onClose();
        } else {
            // keep modal open if you want, but current UX closes anyway
            onClose();
        }

        setIsDeleting(false);
    };

    return (
        <Modal
            visible={isOpen}
            onRequestClose={onClose}
            transparent
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
                            disabled={isDeleting}
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
                            disabled={isDeleting}
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
        shadowOffset: { width: 0, height: 2 },
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
