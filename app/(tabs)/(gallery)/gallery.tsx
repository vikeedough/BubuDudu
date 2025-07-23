import { Gallery as GalleryType } from "@/api/endpoints/types";
import MagnifyingGlass from "@/assets/svgs/magnifying-glass.svg";
import Plus from "@/assets/svgs/plus.svg";
import SortAscending from "@/assets/svgs/sort-ascending.svg";
import SortDescending from "@/assets/svgs/sort-descending.svg";
import CustomText from "@/components/CustomText";
import NewGalleryModal from "@/components/gallery/AddNewGalleryModal";
import GalleryItem from "@/components/gallery/GalleryItem";
import { Colors } from "@/constants/colors";
import { useAppStore } from "@/stores/AppStore";
import { getDate } from "@/utils/home";
import { router } from "expo-router";
import { useMemo, useRef, useState } from "react";
import {
    FlatList,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const Gallery = () => {
    const date = getDate();
    const galleries = useAppStore((state) => state.galleries);
    const [sortingByAscending, setSortingByAscending] = useState(true);
    const [searchText, setSearchText] = useState("");
    const [isNewGalleryModalOpen, setIsNewGalleryModalOpen] = useState(false);
    const searchBarRef = useRef<TextInput>(null);
    const handleAddNewGallery = () => {
        setIsNewGalleryModalOpen(true);
    };

    const filteredGalleries = useMemo(
        () =>
            galleries
                .filter((gallery) =>
                    gallery.title
                        .toLowerCase()
                        .includes(searchText.toLowerCase())
                )
                .sort((a, b) => {
                    return sortingByAscending
                        ? a.created_at.localeCompare(b.created_at)
                        : b.created_at.localeCompare(a.created_at);
                }),
        [galleries, searchText, sortingByAscending]
    );

    const navigateToGalleryContent = (gallery: GalleryType) => {
        router.push({
            pathname: "/(tabs)/(gallery)/galleryContent",
            params: {
                galleryId: gallery.id,
                galleryTitle: gallery.title,
                galleryDate: gallery.date,
                galleryLocation: gallery.location,
                galleryColor: gallery.color,
            },
        });
    };

    return (
        <SafeAreaView style={styles.container}>
            <NewGalleryModal
                isOpen={isNewGalleryModalOpen}
                onClose={() => setIsNewGalleryModalOpen(false)}
            />
            <View style={styles.header}>
                <CustomText weight="extrabold" style={styles.headerTitle}>
                    Gallery
                </CustomText>
                <CustomText weight="medium" style={styles.headerDate}>
                    {date}
                </CustomText>
            </View>
            <View style={styles.galleryContainer}>
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
                            onChangeText={setSearchText}
                        />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.controlButton}
                        onPress={() =>
                            setSortingByAscending(!sortingByAscending)
                        }
                    >
                        {sortingByAscending ? (
                            <SortAscending />
                        ) : (
                            <SortDescending />
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.controlButton}
                        onPress={handleAddNewGallery}
                    >
                        <Plus />
                    </TouchableOpacity>
                </View>
                <FlatList
                    data={filteredGalleries}
                    renderItem={({ item }: { item: GalleryType }) => (
                        <GalleryItem
                            gallery={item}
                            onPress={() => navigateToGalleryContent(item)}
                        />
                    )}
                    ItemSeparatorComponent={() => (
                        <View style={styles.separator} />
                    )}
                    numColumns={2}
                    columnWrapperStyle={styles.columnWrapper}
                />
            </View>
        </SafeAreaView>
    );
};

export default Gallery;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.backgroundPink,
        paddingVertical: 25,
        paddingHorizontal: 25,
    },
    header: {
        marginBottom: 20,
        marginLeft: 15,
    },
    headerTitle: {
        fontSize: 24,
        color: Colors.darkGreenText,
    },
    headerDate: {
        fontSize: 12,
        color: Colors.darkGreenText,
    },
    separator: {
        height: 15,
    },
    galleryContainer: {
        flex: 1,
        backgroundColor: Colors.white,
        paddingVertical: 25,
        marginBottom: 50,
        paddingHorizontal: 25,
        borderRadius: 15,
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    controlsContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
        gap: 10,
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
    columnWrapper: {
        justifyContent: "space-between",
    },
});
