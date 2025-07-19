import {
    addNewGallery,
    fetchGalleries,
    getGalleryId,
    uploadGalleryImages,
} from "@/api/endpoints/supabase";
import CustomText from "@/components/CustomText";
import { Colors, listColorsArray } from "@/constants/colors";
import { useAppStore } from "@/stores/AppStore";
import { pickMultipleImages } from "@/utils/gallery";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Image } from "expo-image";
import { useState } from "react";
import {
    Alert,
    Dimensions,
    FlatList,
    Keyboard,
    Modal,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from "react-native";

interface AddNewGalleryModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const AddNewGalleryModal: React.FC<AddNewGalleryModalProps> = ({
    isOpen,
    onClose,
}) => {
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [dateName, setDateName] = useState("");
    const [location, setLocation] = useState("");
    const [date, setDate] = useState(new Date());
    const [images, setImages] = useState<string[]>([]);
    const [selectedColor, setSelectedColor] = useState<string>(
        listColorsArray[0]
    );
    const [selectedColorIndex, setSelectedColorIndex] = useState<number>(0);

    const handleCancel = () => {
        setDateName("");
        setLocation("");
        setDate(new Date());
        setImages([]);
        setShowDatePicker(false);
        onClose();
    };

    const handleAddGallery = async () => {
        if (
            dateName === "" ||
            date === null ||
            images.length === 0 ||
            selectedColor === "" ||
            location === ""
        ) {
            Alert.alert("Error", "Please fill in all fields.");
            return;
        }

        const success = await addNewGallery(
            dateName,
            date.toISOString(),
            selectedColor,
            location
        );
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

        // Reset form state and close modal
        setDateName("");
        setDate(new Date());
        setImages([]);
        setShowDatePicker(false);
        onClose();
    };

    const imagesShown = () => {
        return (
            <View>
                <FlatList
                    data={images}
                    keyExtractor={(item, index) => index.toString()}
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
        <Modal
            visible={isOpen}
            onRequestClose={handleCancel}
            transparent={true}
            animationType="fade"
        >
            <TouchableWithoutFeedback
                onPress={Keyboard.dismiss}
                accessible={false}
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
                                    onChange={(event, date) => {
                                        if (date) {
                                            setDate(date);
                                            setShowDatePicker(false);
                                        }
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
                                    />
                                ))}
                            </View>
                        </View>
                        <View style={styles.header}>
                            <TouchableOpacity
                                style={styles.confirmButton}
                                onPress={handleAddGallery}
                            >
                                <CustomText
                                    weight="semibold"
                                    style={styles.headerTitle}
                                >
                                    Save
                                </CustomText>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.headerButton}
                                onPress={handleCancel}
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
            </TouchableWithoutFeedback>
        </Modal>
    );
};

export default AddNewGalleryModal;

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
        shadowOffset: {
            width: 0,
            height: 2,
        },
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
        shadowOffset: {
            width: 0,
            height: 2,
        },
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
});
