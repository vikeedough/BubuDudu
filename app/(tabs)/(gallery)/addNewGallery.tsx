import {
    addNewGallery,
    fetchGalleries,
    getGalleryId,
    uploadGalleryImages,
} from "@/api/endpoints/supabase";
import CustomText from "@/components/CustomText";
import { Colors } from "@/constants/colors";
import { useAppStore } from "@/stores/AppStore";
import { pickMultipleImages } from "@/utils/gallery";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import {
    Alert,
    Dimensions,
    FlatList,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const AddNewGallery = () => {
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [dateName, setDateName] = useState("");
    const [date, setDate] = useState(new Date());
    const [images, setImages] = useState<string[]>([]);

    const handleBack = () => {
        router.back();
    };

    const handleAddGallery = async () => {
        if (dateName === "" || date === null) {
            Alert.alert("Error", "Please fill in all fields.");
            return;
        }

        const success = await addNewGallery(dateName, date.toISOString());
        if (!success) {
            Alert.alert("Error", "Failed to add gallery");
            return;
        }

        const galleryId = await getGalleryId(dateName);
        if (!galleryId) {
            Alert.alert("Error", "Failed to get gallery ID");
            return;
        }

        if (images.length > 0) {
            const uploadSuccess = await uploadGalleryImages(galleryId, images);
            if (!uploadSuccess) {
                Alert.alert("Error", "Failed to upload images");
                return;
            }
        }

        const updatedGalleries = await fetchGalleries();
        useAppStore.setState({ galleries: updatedGalleries });
        router.push("/gallery");
    };

    const imagesShown = () => {
        return (
            <View>
                <FlatList
                    data={images}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            onPress={() => {
                                setImages(
                                    images.filter((image) => image !== item)
                                );
                            }}
                        >
                            <Image
                                source={{ uri: item }}
                                style={styles.image}
                            />
                        </TouchableOpacity>
                    )}
                    numColumns={3}
                />
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.headerButton}
                    onPress={handleBack}
                >
                    <CustomText weight="bold" style={styles.headerTitle}>
                        Cancel
                    </CustomText>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={handleAddGallery}
                >
                    <CustomText weight="bold" style={styles.headerTitle}>
                        Confirm
                    </CustomText>
                </TouchableOpacity>
            </View>
            <View style={styles.form}>
                <CustomText weight="bold" style={styles.formTitle}>
                    Date Name
                </CustomText>
                <TextInput
                    style={styles.input}
                    placeholder="Enter date name"
                    value={dateName}
                    onChangeText={setDateName}
                />
                <CustomText weight="bold" style={styles.formTitle}>
                    Date
                </CustomText>
                <TouchableOpacity
                    onPress={() => setShowDatePicker(true)}
                    style={styles.datePicker}
                >
                    <CustomText weight="bold" style={styles.datePickerText}>
                        {date.toLocaleDateString()}
                    </CustomText>
                </TouchableOpacity>
                {showDatePicker && (
                    <DateTimePicker
                        value={date}
                        mode="date"
                        display="default"
                        onChange={(event, date) => {
                            if (date) {
                                setDate(date);
                                setShowDatePicker(false);
                            }
                        }}
                    />
                )}
            </View>
            <TouchableOpacity
                style={
                    images.length > 0
                        ? styles.galleryContainerWithImages
                        : styles.galleryContainer
                }
                onPress={() => {
                    pickMultipleImages().then((images) => {
                        if (images) {
                            setImages(images);
                        }
                    });
                }}
            >
                {images.length > 0 ? (
                    imagesShown()
                ) : (
                    <CustomText weight="bold" style={styles.galleryTitle}>
                        Add photos here!
                    </CustomText>
                )}
            </TouchableOpacity>
        </SafeAreaView>
    );
};

export default AddNewGallery;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.backgroundPink,
        paddingVertical: 25,
        paddingHorizontal: 25,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
    },
    deleteButton: {
        backgroundColor: Colors.red,
        padding: 10,
        borderRadius: 15,
    },
    headerButton: {
        backgroundColor: Colors.lightBlue,
        padding: 10,
        borderRadius: 15,
    },
    headerTitle: {
        fontSize: 12,
        color: Colors.white,
    },
    form: {
        marginBottom: 20,
    },
    formTitle: {
        fontSize: 24,
        color: Colors.black,
        marginBottom: 5,
    },
    input: {
        backgroundColor: Colors.white,
        padding: 10,
        borderRadius: 15,
        fontSize: 16,
        marginBottom: 10,
        fontFamily: "Raleway-Regular",
    },
    datePicker: {
        backgroundColor: Colors.white,
        padding: 10,
        borderRadius: 15,
        marginBottom: 10,
    },
    datePickerText: {
        fontSize: 16,
        color: Colors.black,
    },
    galleryContainer: {
        borderStyle: "dashed",
        borderWidth: 1,
        borderColor: Colors.black,
        borderRadius: 15,
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    galleryContainerWithImages: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    galleryTitle: {
        fontSize: 24,
        color: Colors.black,
        textAlign: "center",
    },
    image: {
        width: (Dimensions.get("window").width - 50) / 3,
        height: (Dimensions.get("window").width - 50) / 3,
    },
});
