import { Gallery as GalleryType } from "@/api/endpoints/types";
import { Colors } from "@/constants/colors";
import { convertDate } from "@/utils/gallery";
import React from "react";
import { StyleSheet, TouchableOpacity } from "react-native";
import CustomText from "../CustomText";

interface GalleryItemProps {
    gallery: GalleryType;
    onPress: () => void;
}

const GalleryItem: React.FC<GalleryItemProps> = ({ gallery, onPress }) => {
    return (
        <TouchableOpacity style={styles.container} onPress={onPress}>
            <CustomText weight="bold" style={styles.title}>
                {gallery.title}
            </CustomText>
            <CustomText>{convertDate(gallery.date)}</CustomText>
        </TouchableOpacity>
    );
};

export default GalleryItem;

const styles = StyleSheet.create({
    container: {
        backgroundColor: Colors.white,
        padding: 20,
        borderRadius: 15,
    },
    title: {
        fontSize: 24,
    },
});
