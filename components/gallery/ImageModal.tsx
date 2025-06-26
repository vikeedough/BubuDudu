import Colors from "@/constants/colors";
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
import CustomText from "../CustomText";

interface ImageModalProps {
    isOpen: boolean;
    imageUri: string;
    onClose: () => void;
}

const ImageModal: React.FC<ImageModalProps> = ({
    isOpen,
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
                <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                    <CustomText weight="bold" style={styles.buttonText}>
                        Close
                    </CustomText>
                </TouchableOpacity>
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
        backgroundColor: Colors.red,
        padding: 10,
        borderRadius: 15,
        alignSelf: "flex-end",
        marginRight: 25,
    },
    buttonText: {
        fontSize: 16,
        color: Colors.white,
    },
});
