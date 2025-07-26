import Plus from "@/assets/svgs/plus.svg";
import SortAscending from "@/assets/svgs/sort-ascending.svg";
import SortDescending from "@/assets/svgs/sort-descending.svg";
import TrashBin from "@/assets/svgs/trash-bin.svg";
import CustomText from "@/components/CustomText";
import { Colors } from "@/constants/colors";
import React from "react";
import {
    ActivityIndicator,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";

interface GalleryControlsProps {
    galleryTitle: string;
    galleryDate: string;
    sortingByAscending: boolean;
    isDeleting: boolean;
    onDeleteGallery: () => void;
    onToggleSort: () => void;
    onAddImages: () => void;
}

const GalleryControls: React.FC<GalleryControlsProps> = ({
    galleryTitle,
    galleryDate,
    sortingByAscending,
    isDeleting,
    onDeleteGallery,
    onToggleSort,
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
                <TouchableOpacity
                    style={styles.controlButton}
                    onPress={onDeleteGallery}
                >
                    {isDeleting ? (
                        <ActivityIndicator size="small" color={Colors.red} />
                    ) : (
                        <TrashBin />
                    )}
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.controlButton}
                    onPress={onToggleSort}
                >
                    {sortingByAscending ? (
                        <SortAscending />
                    ) : (
                        <SortDescending />
                    )}
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.controlButton}
                    onPress={onAddImages}
                >
                    <Plus />
                </TouchableOpacity>
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
});

export default GalleryControls;
