import MagnifyingGlass from "@/assets/svgs/magnifying-glass.svg";
import Plus from "@/assets/svgs/plus.svg";
import SortAscending from "@/assets/svgs/sort-ascending.svg";
import SortDescending from "@/assets/svgs/sort-descending.svg";
import { Colors } from "@/constants/colors";
import React, { useRef } from "react";
import { StyleSheet, TextInput, TouchableOpacity, View } from "react-native";

interface GalleryListControlsProps {
    searchText: string;
    sortingByAscending: boolean;
    onSearchChange: (text: string) => void;
    onToggleSort: () => void;
    onAddNew: () => void;
}

const GalleryListControls: React.FC<GalleryListControlsProps> = ({
    searchText,
    sortingByAscending,
    onSearchChange,
    onToggleSort,
    onAddNew,
}) => {
    const searchBarRef = useRef<TextInput>(null);

    return (
        <View style={styles.controlsContainer}>
            <TouchableOpacity
                style={styles.searchBar}
                onPress={() => {
                    searchBarRef.current?.focus();
                }}
            >
                <MagnifyingGlass />
                <TextInput
                    placeholder="Search"
                    style={styles.searchBarText}
                    ref={searchBarRef}
                    value={searchText}
                    onChangeText={onSearchChange}
                />
            </TouchableOpacity>
            <TouchableOpacity
                style={styles.controlButton}
                onPress={onToggleSort}
            >
                {sortingByAscending ? <SortAscending /> : <SortDescending />}
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlButton} onPress={onAddNew}>
                <Plus />
            </TouchableOpacity>
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
        gap: 10,
        height: 35,
    },
    searchBarText: {
        fontSize: 14,
        color: Colors.darkGreenText,
        fontFamily: "Raleway-Regular",
        paddingBottom: 0,
        paddingTop: 0,
        textAlignVertical: "center",
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

export default GalleryListControls;
