import React, { useRef } from "react";
import { StyleSheet, TextInput, TouchableOpacity, View } from "react-native";

import MagnifyingGlass from "@/assets/svgs/magnifying-glass.svg";
import Plus from "@/assets/svgs/plus.svg";
import SortAscending from "@/assets/svgs/sort-ascending.svg";
import SortDescending from "@/assets/svgs/sort-descending.svg";
import { Colors } from "@/constants/colors";

import GalleryControlButton from "./GalleryControlButton";

interface GalleryListControlsProps {
    searchText: string;
    sortingByDescending: boolean;
    onSearchChange: (text: string) => void;
    onToggleSort: () => void;
    onAddNew: () => void;
}

const GalleryListControls: React.FC<GalleryListControlsProps> = ({
    searchText,
    sortingByDescending,
    onSearchChange,
    onToggleSort,
    onAddNew,
}) => {
    const searchBarRef = useRef<TextInput>(null);

    return (
        <View style={styles.controlsContainer}>
            <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Focus gallery search"
                style={styles.searchBar}
                onPress={() => {
                    searchBarRef.current?.focus();
                }}
            >
                <MagnifyingGlass />
                <TextInput
                    placeholder="Search"
                    placeholderTextColor={"#AFAFAF"}
                    style={styles.searchBarText}
                    ref={searchBarRef}
                    value={searchText}
                    onChangeText={onSearchChange}
                />
            </TouchableOpacity>
            <GalleryControlButton
                accessibilityLabel="Toggle gallery sort direction"
                onPress={onToggleSort}
            >
                {sortingByDescending ? <SortDescending /> : <SortAscending />}
            </GalleryControlButton>
            <GalleryControlButton
                accessibilityLabel="Add new gallery"
                onPress={onAddNew}
            >
                <Plus />
            </GalleryControlButton>
        </View>
    );
};

const styles = StyleSheet.create({
    controlsContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
        gap: 10,
        zIndex: 1000,
        paddingHorizontal: 25,
    },
    searchBar: {
        flex: 1,
        backgroundColor: "transparent",
        borderRadius: 15,
        padding: 10,
        borderWidth: 1,
        borderColor: "#EBEAEC",
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        height: 40,
    },
    searchBarText: {
        fontSize: 14,
        color: Colors.darkGreenText,
        fontFamily: "Raleway-Regular",
        paddingBottom: 0,
        paddingTop: 0,
        textAlignVertical: "center",
    },
});

export default GalleryListControls;
