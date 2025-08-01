import CustomText from "@/components/CustomText";
import { Colors } from "@/constants/colors";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

interface GalleryLocationBarProps {
    location: string;
    showClearButton: boolean;
    onClear: () => void;
}

const GalleryLocationBar: React.FC<GalleryLocationBarProps> = ({
    location,
    showClearButton,
    onClear,
}) => {
    return (
        <View style={styles.locationClearButtonRow}>
            <View style={styles.locationContainer}>
                <CustomText weight="semibold" style={styles.location}>
                    {location}
                </CustomText>
            </View>
            {showClearButton && (
                <TouchableOpacity style={styles.clearButton} onPress={onClear}>
                    <CustomText weight="medium" style={styles.clearButtonText}>
                        Clear
                    </CustomText>
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    locationClearButtonRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        width: "100%",
        marginBottom: 20,
    },
    locationContainer: {
        backgroundColor: "#F9CD64",
        borderRadius: 15,
        padding: 5,
        alignSelf: "flex-start",
        paddingHorizontal: 10,
        borderWidth: 1,
        borderColor: "transparent",
    },
    location: {
        fontSize: 10,
        color: Colors.brownText,
    },
    clearButton: {
        backgroundColor: Colors.white,
        borderRadius: 15,
        padding: 5,
        alignSelf: "flex-end",
        paddingHorizontal: 10,
        borderWidth: 1,
        borderColor: "#EBEAEC",
    },
    clearButtonText: {
        fontSize: 10,
        color: "#505739",
    },
});

export default GalleryLocationBar;
