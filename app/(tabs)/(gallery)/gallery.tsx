import { Gallery as GalleryType } from "@/api/endpoints/types";
import CustomText from "@/components/CustomText";
import GalleryItem from "@/components/gallery/GalleryItem";
import Colors from "@/constants/colors";
import { useAppStore } from "@/stores/AppStore";
import { router } from "expo-router";
import { FlatList, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const Gallery = () => {
    const galleries = useAppStore((state) => state.galleries);

    const handleAddNewGallery = () => {
        router.push({
            pathname: "/(tabs)/(gallery)/addNewGallery",
        });
    };

    const navigateToGalleryContent = (gallery: GalleryType) => {
        router.push({
            pathname: "/(tabs)/(gallery)/galleryContent",
            params: {
                galleryId: gallery.id,
                galleryTitle: gallery.title,
                galleryDate: gallery.date,
            },
        });
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.headerButton}
                    onPress={handleAddNewGallery}
                >
                    <CustomText weight="bold" style={styles.headerTitle}>
                        Add New Gallery
                    </CustomText>
                </TouchableOpacity>
            </View>
            <FlatList
                data={galleries}
                renderItem={({ item }: { item: GalleryType }) => (
                    <GalleryItem
                        gallery={item}
                        onPress={() => navigateToGalleryContent(item)}
                    />
                )}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
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
        flexDirection: "row",
        justifyContent: "flex-end",
        alignItems: "center",
        marginBottom: 20,
    },
    headerTitle: {
        fontSize: 24,
        color: Colors.white,
    },
    headerButton: {
        backgroundColor: Colors.lightBlue,
        padding: 10,
        borderRadius: 15,
    },
    separator: {
        height: 15,
    },
});
