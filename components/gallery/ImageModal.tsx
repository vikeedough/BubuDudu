import { Image } from "expo-image";
import React, { useEffect, useState } from "react";
import {
    Dimensions,
    Modal,
    Image as RNImage,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";

import Back from "@/assets/svgs/back.svg";
import { Colors } from "@/constants/colors";

interface ImageModalProps {
    isOpen: boolean;
    imageId: string;
    imageUri: string;
    onClose: () => void;
}

const ImageModal: React.FC<ImageModalProps> = ({
    isOpen,
    imageId,
    imageUri,
    onClose,
}) => {
    const [imageSize, setImageSize] = useState<{
        width: number;
        height: number;
    } | null>(null);

    useEffect(() => {
        if (imageUri) {
            RNImage.getSize(
                imageUri,
                (width, height) => {
                    const screenWidth = Dimensions.get("window").width * 0.9; // match modal maxWidth
                    const screenHeight = Dimensions.get("window").height * 0.8; // match modal maxHeight
                    const widthRatio = screenWidth / width;
                    const heightRatio = screenHeight / height;
                    const scaleFactor = Math.min(widthRatio, heightRatio);
                    setImageSize({
                        width: width * scaleFactor,
                        height: height * scaleFactor,
                    });
                },
                (error) => {
                    console.error("Failed to get image size:", error);
                }
            );
        }
    }, [imageUri]);

    return (
        <Modal
            visible={isOpen}
            onRequestClose={onClose}
            transparent={true}
            animationType="fade"
        >
            <View style={styles.modalOverlay}>
                <View style={styles.buttonContainer}>
                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={onClose}
                    >
                        <Back />
                    </TouchableOpacity>
                </View>

                <View style={styles.modalContainer}>
                    {imageSize && (
                        <Image
                            source={{ uri: imageUri }}
                            style={{
                                width: imageSize.width,
                                height: imageSize.height,
                                alignSelf: "center",
                            }}
                            contentFit="contain"
                        />
                    )}
                </View>
            </View>
        </Modal>
    );
};

export default ImageModal;

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
    closeButton: {
        backgroundColor: Colors.white,
        borderRadius: 999,
        height: 28,
        width: 28,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#EBEAEC",
        marginLeft: 20,
    },
    buttonText: {
        fontSize: 16,
        color: Colors.white,
    },
    buttonContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        width: "100%",
    },
    downloadButton: {
        backgroundColor: Colors.pink,
        padding: 10,
        borderRadius: 15,
        alignSelf: "flex-start",
        marginLeft: 25,
    },
});
