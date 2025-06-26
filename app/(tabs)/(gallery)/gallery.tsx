import CustomText from "@/components/CustomText";
import Colors from "@/constants/colors";
import { router } from "expo-router";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const Gallery = () => {
    const handleAddNewGallery = () => {
        router.push({
            pathname: "/(tabs)/(gallery)/addNewGallery",
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
});
