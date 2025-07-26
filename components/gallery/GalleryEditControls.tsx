import CustomText from "@/components/CustomText";
import { Colors } from "@/constants/colors";
import React from "react";
import {
    ActivityIndicator,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";

interface GalleryEditControlsProps {
    isDownloading: boolean;
    onDownload: () => void;
    onDelete: () => void;
}

const GalleryEditControls: React.FC<GalleryEditControlsProps> = ({
    isDownloading,
    onDownload,
    onDelete,
}) => {
    return (
        <View style={styles.editControlsContainer}>
            <TouchableOpacity
                style={styles.downloadButton}
                onPress={onDownload}
            >
                {isDownloading ? (
                    <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                    <CustomText weight="semibold" style={styles.buttonText}>
                        Download
                    </CustomText>
                )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
                <CustomText weight="semibold" style={styles.buttonText}>
                    Delete
                </CustomText>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
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
    buttonText: {
        fontSize: 16,
        color: Colors.brownText,
    },
});

export default GalleryEditControls;
