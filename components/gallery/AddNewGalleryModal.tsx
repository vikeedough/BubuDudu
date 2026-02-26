import DateTimePicker from "@react-native-community/datetimepicker";
import { FlashList } from "@shopify/flash-list";
import { Image } from "expo-image";
import { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from "react-native";

import CustomText from "@/components/CustomText";
import { Colors, listColorsArray } from "@/constants/colors";
import { useGalleryStore } from "@/stores/GalleryStore";
import { pickMultipleImages } from "@/utils/gallery";

interface AddNewGalleryModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const blurhash =
    "|rF?hV%2WCj[ayj[a|j[az_NaeWBj@ayfRayfQfQM{M|azj[azf6fQfQfQIpWXofj[ayj[j[fQayWCoeoeaya}j[ayfQa{oLj?j[WVj[ayayj[fQoff7azayj[ayj[j[ayofayayayj[fQj[ayayj[ayfjj[j[ayjuayj[";

const AddNewGalleryModal: React.FC<AddNewGalleryModalProps> = ({
    isOpen,
    onClose,
}) => {
    const addNewGallery = useGalleryStore((s) => s.addNewGallery);
    const uploadGalleryImages = useGalleryStore((s) => s.uploadGalleryImages);
    const refreshGalleries = useGalleryStore((s) => s.refreshGalleries);

    const [showDatePicker, setShowDatePicker] = useState(false);
    const [dateName, setDateName] = useState("");
    const [location, setLocation] = useState("");
    const [date, setDate] = useState(new Date());
    const [images, setImages] = useState<string[]>([]);
    const [selectedColor, setSelectedColor] = useState<string>(
        listColorsArray[0],
    );
    const [selectedColorIndex, setSelectedColorIndex] = useState<number>(0);
    const [isAddingImages, setIsAddingImages] = useState(false);
    const [isUploadingImages, setIsUploadingImages] = useState(false);

    const resetForm = () => {
        setDateName("");
        setLocation("");
        setDate(new Date());
        setImages([]);
        setShowDatePicker(false);
        setSelectedColor(listColorsArray[0]);
        setSelectedColorIndex(0);
        setIsAddingImages(false);
        setIsUploadingImages(false);
    };

    const handleCancel = () => {
        resetForm();
        onClose();
    };

    const handleAddGallery = async () => {
        if (
            dateName.trim() === "" ||
            location.trim() === "" ||
            !date ||
            images.length === 0 ||
            selectedColor === ""
        ) {
            Alert.alert("Error", "Please fill in all fields.");
            return;
        }

        setIsUploadingImages(true);
        resetForm();
        onClose();

        // 1) create gallery row
        const newGallery = await addNewGallery({
            title: dateName.trim(),
            date: date.toISOString(), // matches your current DB values
            color: selectedColor,
            location: location.trim(),
        });

        if (!newGallery) {
            setIsUploadingImages(false);
            Alert.alert("Error", "Failed to add gallery");
            return;
        }

        // 2) upload images (this will also update cover image + imagesByGalleryId in store)
        const ok = await uploadGalleryImages(newGallery.id, images);

        if (!ok) {
            setIsUploadingImages(false);
            Alert.alert("Error", "Failed to upload images");
            return;
        }

        // Sync list ordering + cover thumbs for current query
        await refreshGalleries();

        setIsUploadingImages(false);
    };

    const imagesShown = () => (
        <View style={styles.flashListContainer}>
            <FlashList
                data={images}
                keyExtractor={(_, index) => index.toString()}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        onPress={() =>
                            setImages(images.filter((img) => img !== item))
                        }
                    >
                        <Image
                            source={{ uri: item }}
                            style={styles.image}
                            placeholder={{ blurhash }}
                            contentFit="cover"
                            transition={1000}
                        />
                    </TouchableOpacity>
                )}
                numColumns={3}
            />
            <CustomText weight="regular" style={styles.instructionText}>
                Tap on photos to remove
            </CustomText>
        </View>
    );

    return (
        <Modal
            visible={isOpen}
            onRequestClose={handleCancel}
            transparent
            animationType="fade"
        >
            <TouchableWithoutFeedback
                onPress={Keyboard.dismiss}
                accessible={false}
            >
                <View style={styles.modalOverlay}>
                    <KeyboardAvoidingView
                        style={styles.kav}
                        behavior={"padding"}
                        keyboardVerticalOffset={0}
                    >
                        <View style={styles.modalContainer}>
                            <ScrollView
                                style={styles.scroll}
                                contentContainerStyle={styles.scrollContent}
                                keyboardShouldPersistTaps="handled"
                                showsVerticalScrollIndicator={false}
                            >
                                <View style={styles.imagesContainer}>
                                    <TouchableOpacity
                                        style={
                                            images.length > 0
                                                ? styles.galleryContainerWithImages
                                                : styles.galleryContainer
                                        }
                                        onPress={() => {
                                            setIsAddingImages(true);
                                            pickMultipleImages().then(
                                                (imagesToAdd) => {
                                                    if (imagesToAdd?.length) {
                                                        setImages((prev) => [
                                                            ...prev,
                                                            ...imagesToAdd,
                                                        ]);
                                                    }
                                                    setIsAddingImages(false);
                                                },
                                            );
                                        }}
                                        disabled={isUploadingImages}
                                    >
                                        {images.length > 0 ? (
                                            isAddingImages ? (
                                                <ActivityIndicator
                                                    size="small"
                                                    color="#FFCC7D"
                                                />
                                            ) : (
                                                imagesShown()
                                            )
                                        ) : (
                                            <CustomText
                                                weight="regular"
                                                style={styles.galleryTitle}
                                            >
                                                Tap to upload photos
                                            </CustomText>
                                        )}
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.form}>
                                    <CustomText
                                        weight="semibold"
                                        style={styles.formTitle}
                                    >
                                        Name
                                    </CustomText>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Enter date name"
                                        placeholderTextColor={Colors.gray}
                                        value={dateName}
                                        onChangeText={setDateName}
                                    />

                                    <CustomText
                                        weight="semibold"
                                        style={styles.formTitle}
                                    >
                                        Location
                                    </CustomText>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Enter location"
                                        placeholderTextColor={Colors.gray}
                                        value={location}
                                        onChangeText={setLocation}
                                    />

                                    <CustomText
                                        weight="semibold"
                                        style={styles.formTitle}
                                    >
                                        Date
                                    </CustomText>
                                    <TouchableOpacity
                                        onPress={() => setShowDatePicker(true)}
                                        style={styles.datePicker}
                                        disabled={isUploadingImages}
                                    >
                                        <CustomText
                                            weight="semibold"
                                            style={styles.datePickerText}
                                        >
                                            {date.toLocaleDateString()}
                                        </CustomText>
                                    </TouchableOpacity>

                                    {showDatePicker && (
                                        <DateTimePicker
                                            value={date}
                                            mode="date"
                                            display="default"
                                            onChange={(_event, picked) => {
                                                if (picked) setDate(picked);
                                                setShowDatePicker(false);
                                            }}
                                        />
                                    )}

                                    <CustomText
                                        weight="semibold"
                                        style={styles.formTitle}
                                    >
                                        Colour
                                    </CustomText>
                                    <View style={styles.colorContainer}>
                                        {listColorsArray.map((color, index) => (
                                            <TouchableOpacity
                                                style={[
                                                    styles.colorBox,
                                                    { backgroundColor: color },
                                                    index ===
                                                        selectedColorIndex &&
                                                        styles.selectedColorBox,
                                                ]}
                                                key={color}
                                                onPress={() => {
                                                    setSelectedColor(color);
                                                    setSelectedColorIndex(
                                                        index,
                                                    );
                                                }}
                                                disabled={isUploadingImages}
                                            />
                                        ))}
                                    </View>
                                </View>

                                <View style={styles.footer}>
                                    <TouchableOpacity
                                        style={styles.confirmButton}
                                        onPress={handleAddGallery}
                                        disabled={isUploadingImages}
                                    >
                                        {isUploadingImages ? (
                                            <ActivityIndicator />
                                        ) : (
                                            <CustomText
                                                weight="semibold"
                                                style={styles.headerTitle}
                                            >
                                                Save
                                            </CustomText>
                                        )}
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.headerButton}
                                        onPress={handleCancel}
                                        disabled={isUploadingImages}
                                    >
                                        <CustomText
                                            weight="semibold"
                                            style={styles.headerTitle}
                                        >
                                            Cancel
                                        </CustomText>
                                    </TouchableOpacity>
                                </View>
                            </ScrollView>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

export default AddNewGalleryModal;

// styles unchanged ↓
const styles = StyleSheet.create({
    modalOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center",
        alignItems: "center",
    },
    kav: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    modalContainer: {
        backgroundColor: Colors.white,
        borderRadius: 10,
        padding: 30,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        width: "100%",
        maxHeight: "100%",
        flexShrink: 1,
        alignItems: "center",
    },
    scroll: {
        width: "100%",
    },
    scrollContent: {
        alignItems: "center",
    },
    footer: {
        flexDirection: "row",
        justifyContent: "center",
        gap: 20,
        alignItems: "center",
    },
    confirmButton: {
        backgroundColor: "#FFCC7D",
        padding: 10,
        borderRadius: 10,
        width: 120,
        justifyContent: "center",
        alignItems: "center",
    },
    headerButton: {
        backgroundColor: "#AFAFAF",
        padding: 10,
        borderRadius: 10,
        width: 120,
        justifyContent: "center",
        alignItems: "center",
    },
    headerTitle: {
        fontSize: 14,
        color: Colors.brownText,
    },
    form: {
        marginBottom: 20,
        width: "100%",
    },
    formTitle: {
        fontSize: 12,
        color: Colors.black,
        marginBottom: 5,
    },
    input: {
        backgroundColor: Colors.white,
        padding: 10,
        borderRadius: 10,
        fontSize: 12,
        marginBottom: 10,
        fontFamily: "Raleway-Regular",
        borderWidth: 1,
        borderColor: "#EBEAEC",
        color: Colors.black,
    },
    datePicker: {
        backgroundColor: Colors.white,
        padding: 10,
        borderRadius: 10,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: "#EBEAEC",
    },
    datePickerText: {
        fontSize: 12,
        color: Colors.black,
    },
    galleryContainer: {
        borderStyle: "dashed",
        borderWidth: 1,
        borderColor: Colors.gray,
        borderRadius: 10,
        justifyContent: "center",
        alignItems: "center",
        flex: 1,
        width: "100%",
    },
    galleryContainerWithImages: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        minHeight: 200,
    },
    galleryTitle: {
        fontSize: 16,
        color: Colors.gray,
        textAlign: "center",
    },
    image: {
        width: (Dimensions.get("window").width - 150) / 3,
        height: (Dimensions.get("window").width - 150) / 3,
        marginBottom: 10,
    },
    imagesContainer: {
        backgroundColor: Colors.white,
        justifyContent: "center",
        alignItems: "center",
        width: "100%",
        aspectRatio: 1,
        maxHeight: 260,
        flexShrink: 1,
        marginBottom: 12,
        borderRadius: 10,
    },
    colorContainer: {
        flexDirection: "row",
        gap: 10,
    },
    colorBox: {
        width: 20,
        height: 20,
        borderRadius: 999,
        opacity: 0.5,
    },
    selectedColorBox: {
        borderWidth: 1,
        borderColor: Colors.brownText,
        opacity: 1,
    },
    flashListContainer: {
        height: Dimensions.get("window").width - 130,
        width: Dimensions.get("window").width - 130,
        flex: 1,
    },
    instructionText: {
        fontSize: 10,
        color: Colors.gray,
        marginTop: 5,
        textAlign: "center",
    },
});
