import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import Pencil from "@/assets/svgs/pencil.svg";
import Plus from "@/assets/svgs/plus.svg";
import TrashBin from "@/assets/svgs/trash-bin.svg";
import CustomText from "@/components/CustomText";
import { Colors } from "@/constants/colors";

import GalleryControlButton from "./GalleryControlButton";

interface GalleryControlsProps {
    galleryTitle: string;
    galleryDate: string;
    isDeleting: boolean;
    onDeleteGallery: () => void;
    onEditGallery: () => void;
    onAddImages: () => void;
}

const GalleryControls: React.FC<GalleryControlsProps> = ({
    galleryTitle,
    galleryDate,
    isDeleting,
    onDeleteGallery,
    onEditGallery,
    onAddImages,
}) => {
    return (
        <View style={styles.buttonContainer}>
            <View style={styles.controlsContainer}>
                <View style={styles.titleContainer}>
                    <CustomText weight="bold" style={styles.title}>
                        {galleryTitle}
                    </CustomText>
                    <CustomText weight="medium" style={styles.date}>
                        {galleryDate}
                    </CustomText>
                </View>
                <GalleryControlButton onPress={onDeleteGallery}>
                    {isDeleting ? (
                        <ActivityIndicator size="small" color={Colors.red} />
                    ) : (
                        <TrashBin />
                    )}
                </GalleryControlButton>
                <GalleryControlButton onPress={onEditGallery}>
                    <Pencil />
                </GalleryControlButton>
                <GalleryControlButton onPress={onAddImages}>
                    <Plus />
                </GalleryControlButton>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    buttonContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 5,
    },
    controlsContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 10,
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
    editButton: {
        width: 44,
        paddingHorizontal: 9,
    },
    editButtonText: {
        color: Colors.brownText,
        fontSize: 11,
    },
});

export default GalleryControls;
