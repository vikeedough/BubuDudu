import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

import SortAscending from "@/assets/svgs/sort-ascending.svg";
import SortDescending from "@/assets/svgs/sort-descending.svg";
import CustomText from "@/components/CustomText";
import { Colors } from "@/constants/colors";

import GalleryControlButton from "./GalleryControlButton";

interface GalleryLocationBarProps {
    location: string;
    showClearButton: boolean;
    sortingByAscending: boolean;
    onToggleSort: () => void;
    onClear: () => void;
}

const GalleryLocationBar: React.FC<GalleryLocationBarProps> = ({
    location,
    showClearButton,
    sortingByAscending,
    onToggleSort,
    onClear,
}) => {
    return (
        <View style={styles.locationClearButtonRow}>
            <View style={styles.locationContainer}>
                <CustomText
                    weight="semibold"
                    style={styles.location}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                >
                    {location}
                </CustomText>
            </View>
            <View style={styles.actions}>
                <GalleryControlButton
                    accessibilityLabel="Toggle photo sort direction"
                    style={styles.sortButton}
                    onPress={onToggleSort}
                >
                    {sortingByAscending ? <SortAscending /> : <SortDescending />}
                </GalleryControlButton>
                {showClearButton && (
                    <TouchableOpacity style={styles.clearButton} onPress={onClear}>
                        <CustomText weight="medium" style={styles.clearButtonText}>
                            Clear
                        </CustomText>
                    </TouchableOpacity>
                )}
            </View>
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
        gap: 10,
    },
    locationContainer: {
        backgroundColor: "#F9CD64",
        borderRadius: 15,
        padding: 5,
        alignSelf: "flex-start",
        borderWidth: 1,
        borderColor: "transparent",
        justifyContent: "center",
        alignItems: "center",
        maxWidth: "58%",
    },
    location: {
        fontSize: 10,
        color: Colors.brownText,
        textAlign: "center",
        paddingLeft: 3,
        paddingRight: 2,
    },
    actions: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: 8,
    },
    sortButton: {
        height: 32,
        width: 32,
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
