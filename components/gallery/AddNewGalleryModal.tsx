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
    Platform,
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
    const fetchGalleries = useGalleryStore((s) => s.fetchGalleries);

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

        // 1) create gallery row (store updates galleries immediately)
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

        // Optional safety sync (not strictly required if store updates are correct)
        await fetchGalleries();

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
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
                    style={{ flex: 1 }}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.imagesContainer}>
                            <TouchableOpacity
                                style={
                                    images.length > 0
                                        ? styles.galleryContainerWithImages
                                        : styles.galleryContainer
                                }
                                onPress={() => {
                                    setIsAddingImages(true);
                                    pickMultipleImages().then((imagesToAdd) => {
                                        if (imagesToAdd?.length) {
                                            setImages((prev) => [
                                                ...prev,
                                                ...imagesToAdd,
                                            ]);
                                        }
                                        setIsAddingImages(false);
                                    });
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
                                        +
                                    </CustomText>
                                )}
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalContainer}>
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
                                                index === selectedColorIndex &&
                                                    styles.selectedColorBox,
                                            ]}
                                            key={color}
                                            onPress={() => {
                                                setSelectedColor(color);
                                                setSelectedColorIndex(index);
                                            }}
                                            disabled={isUploadingImages}
                                        />
                                    ))}
                                </View>
                            </View>

                            <View style={styles.header}>
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
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

export default AddNewGalleryModal;

// styles unchanged ↓
const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center",
        alignItems: "center",
    },
    modalContainer: {
        backgroundColor: Colors.white,
        borderRadius: 15,
        padding: 25,
        margin: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        maxWidth: "90%",
        maxHeight: "80%",
        width: "100%",
    },
    header: {
        flexDirection: "row",
        justifyContent: "center",
        gap: 20,
        alignItems: "center",
    },
    confirmButton: {
        backgroundColor: "#FFCC7D",
        padding: 10,
        borderRadius: 15,
        width: 120,
        justifyContent: "center",
        alignItems: "center",
    },
    headerButton: {
        backgroundColor: "#AFAFAF",
        padding: 10,
        borderRadius: 15,
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
    },
    formTitle: {
        fontSize: 12,
        color: Colors.black,
        marginBottom: 5,
    },
    input: {
        backgroundColor: Colors.white,
        padding: 10,
        borderRadius: 15,
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
        borderRadius: 15,
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
        borderColor: Colors.black,
        borderRadius: 15,
        justifyContent: "center",
        alignItems: "center",
        flex: 1,
        width: 270,
        height: 270,
    },
    galleryContainerWithImages: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        minHeight: 200,
    },
    galleryTitle: {
        fontSize: 80,
        color: Colors.black,
        textAlign: "center",
    },
    image: {
        width: (Dimensions.get("window").width - 150) / 3,
        height: (Dimensions.get("window").width - 150) / 3,
        marginBottom: 10,
    },
    imagesContainer: {
        justifyContent: "center",
        alignItems: "center",
        height: 310,
        width: 310,
        backgroundColor: Colors.white,
        padding: 20,
        borderRadius: 15,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    colorContainer: {
        flexDirection: "row",
        gap: 10,
    },
    colorBox: {
        width: 20,
        height: 20,
        borderRadius: 999,
    },
    selectedColorBox: {
        borderWidth: 1,
        borderColor: Colors.brownText,
    },
    flashListContainer: {
        height: Dimensions.get("window").width - 130,
        width: Dimensions.get("window").width - 130,
        flex: 1,
    },
});
