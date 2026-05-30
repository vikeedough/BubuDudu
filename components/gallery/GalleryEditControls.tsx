import React from "react";
import {
    ActivityIndicator,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";

import CustomText from "@/components/CustomText";
import { Colors } from "@/constants/colors";

interface GalleryEditControlsProps {
    isDownloading: boolean;
    selectedCount: number;
    onDownload: () => void;
    onDelete: () => void;
}

const GalleryEditControls: React.FC<GalleryEditControlsProps> = ({
    isDownloading,
    selectedCount,
    onDownload,
    onDelete,
}) => {
    const disabled = selectedCount === 0 || isDownloading;
    const suffix = selectedCount > 0 ? ` ${selectedCount}` : "";

    return (
        <View style={styles.editControlsContainer}>
            <TouchableOpacity
                style={[styles.downloadButton, disabled && styles.disabledButton]}
                onPress={onDownload}
                disabled={disabled}
            >
                {isDownloading ? (
                    <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                    <CustomText weight="semibold" style={styles.buttonText}>
                        Download{suffix}
                    </CustomText>
                )}
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.deleteButton, disabled && styles.disabledButton]}
                onPress={onDelete}
                disabled={disabled}
            >
                <CustomText weight="semibold" style={styles.buttonText}>
                    Delete{suffix}
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
    disabledButton: {
        opacity: 0.45,
    },
    buttonText: {
        fontSize: 16,
        color: Colors.brownText,
    },
});

export default GalleryEditControls;
