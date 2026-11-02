import React from "react";
import {
    ActivityIndicator,
    LayoutChangeEvent,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";

import CustomText from "@/components/CustomText";
import { Colors } from "@/constants/colors";

interface GalleryEditControlsProps {
    isDownloading: boolean;
    progress?: { saved: number; total: number } | null;
    onLayout?: (event: LayoutChangeEvent) => void;
    selectedCount: number;
    onDownload: () => void;
    onDelete: () => void;
}

const GalleryEditControls: React.FC<GalleryEditControlsProps> = ({
    isDownloading,
    progress,
    onLayout,
    selectedCount,
    onDownload,
    onDelete,
}) => {
    if (selectedCount <= 0) return null;

    const disabled = isDownloading;
    const suffix = ` ${selectedCount}`;

    return (
        <View onLayout={onLayout} style={styles.editControlsContainer}>
            <TouchableOpacity
                style={[styles.downloadButton, disabled && styles.disabledButton]}
                accessibilityRole="button"
                accessibilityLabel={isDownloading ? `Saving photos: ${progress?.saved ?? 0} of ${progress?.total ?? selectedCount} saved` : `Download ${selectedCount} selected photos`}
                accessibilityState={{ disabled, busy: isDownloading }}
                onPress={onDownload}
                disabled={disabled}
            >
                {isDownloading ? (
                    <View><ActivityIndicator size="small" color={Colors.white} /><CustomText style={styles.buttonText}>{progress?.saved ?? 0}/{progress?.total ?? selectedCount} saved</CustomText></View>
                ) : (
                    <CustomText weight="semibold" style={styles.buttonText}>
                        Download{suffix}
                    </CustomText>
                )}
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.deleteButton, disabled && styles.disabledButton]}
                accessibilityRole="button"
                accessibilityLabel={`Delete ${selectedCount} selected photos`}
                accessibilityState={{ disabled }}
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
