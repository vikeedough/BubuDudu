import { FlashList } from "@shopify/flash-list";
import { Image } from "expo-image";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Pressable,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { ScrollView } from "react-native-gesture-handler";

import CustomText from "@/components/CustomText";
import { Colors, listColorsArray } from "@/constants/colors";
import { useGalleryStore } from "@/stores/GalleryStore";
import { useSyncStore } from "@/stores/SyncStore";
import { pickMultipleImages } from "@/utils/gallery";

import InlineWheelDatePicker from "../InlineWheelDatePicker";

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
    const isOnline = useSyncStore((s) => s.isOnline);

    const [dateName, setDateName] = useState("");
    const [location, setLocation] = useState("");
    const [date, setDate] = useState(new Date());
    const [images, setImages] = useState<string[]>([]);
    const [selectedColor, setSelectedColor] = useState<string>(
        listColorsArray[0],
    );
    const [selectedColorIndex, setSelectedColorIndex] = useState<number>(0);
    const pickerBusy = useRef(false);
    const createBusy = useRef(false);
    const visible = useRef(isOpen);
    visible.current = isOpen;
    const pickerRevision = useRef(0);
    useEffect(() => { if (!isOpen) pickerRevision.current++; }, [isOpen]);
    const [isAddingImages, setIsAddingImages] = useState(false);
    const [isUploadingImages, setIsUploadingImages] = useState(false);
    const [formScrollEnabled, setFormScrollEnabled] = useState(true);
    const formScrollRef = useRef<React.ElementRef<typeof ScrollView>>(null);

    const handleRemovePreviewImage = useCallback((imageUri: string) => {
        setImages((prev) => prev.filter((img) => img !== imageUri));
    }, []);

    const renderPreviewItem = useCallback(
        ({ item }: { item: string }) => (
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Remove photo from upload preview" onPress={() => handleRemovePreviewImage(item)}>
                <Image
                    source={{ uri: item }}
                    style={styles.image}
                    placeholder={{ blurhash }}
                    contentFit="cover"
                    transition={1000}
                />
            </TouchableOpacity>
        ),
        [handleRemovePreviewImage],
    );

    const resetForm = () => {
        setDateName("");
        setLocation("");
        setDate(new Date());
        setImages([]);
        setSelectedColor(listColorsArray[0]);
        setSelectedColorIndex(0);
        setIsAddingImages(false);
        setIsUploadingImages(false);
    };

    const handleCancel = () => {
        if (pickerBusy.current || createBusy.current) return;
        resetForm();
        onClose();
    };

    const uploadCreatedGalleryImages = useCallback(
        async (galleryId: string, selectedImages: string[]) => {
            try {
                await refreshGalleries();
                const ok = await uploadGalleryImages(galleryId, selectedImages);

                if (!ok) Alert.alert("Some photos were not uploaded", "Completed photos were kept. Open the gallery to add the remaining photos.");
                await refreshGalleries();
            } catch {
                Alert.alert("Upload incomplete", "Open the gallery to check completed photos and retry.");
            }
        },
        [refreshGalleries, uploadGalleryImages],
    );

    const handlePickImages = async () => {
        if (pickerBusy.current || createBusy.current) return;
        pickerBusy.current = true; setIsAddingImages(true);
        const revision = pickerRevision.current;
        try {
            const imagesToAdd = await pickMultipleImages();
            if (visible.current && revision === pickerRevision.current && imagesToAdd?.length) setImages((prev) => Array.from(new Set([...prev, ...imagesToAdd])));
        } catch { if (visible.current) Alert.alert("Photos unavailable", "The photo picker could not open. Please try again."); }
        finally { pickerBusy.current = false; setIsAddingImages(false); }
    };

    const handleAddGallery = async () => {
        if (createBusy.current || pickerBusy.current) return;
        if (!isOnline) {
            Alert.alert("Offline", "Gallery uploads are unavailable offline.");
            return;
        }

        const trimmedTitle = dateName.trim();
        const trimmedLocation = location.trim();
        const selectedImages = images.slice();

        if (
            trimmedTitle === "" ||
            trimmedLocation === "" ||
            selectedImages.length === 0 ||
            selectedColor === ""
        ) {
            Alert.alert("Error", "Please fill in all fields.");
            return;
        }

        createBusy.current = true;
        setIsUploadingImages(true);

        try {
            const newGallery = await addNewGallery({
                title: trimmedTitle,
                date: date.toISOString(),
                color: selectedColor,
                location: trimmedLocation,
            });

            if (!newGallery) {
                Alert.alert("Error", "Failed to add gallery");
                return;
            }

            resetForm();
            onClose();
            void uploadCreatedGalleryImages(newGallery.id, selectedImages);
        } catch (err) {
            console.error("Error creating gallery:", err);
            Alert.alert("Error", "Failed to add gallery");
        } finally {
            createBusy.current = false;
            setIsUploadingImages(false);
        }
    };

    const imagesShown = () => (
        <View style={styles.flashListContainer}>
            <FlashList
                data={images}
                keyExtractor={(item) => item}
                renderItem={renderPreviewItem}
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
            onRequestClose={() => {
                if (!isUploadingImages) handleCancel();
            }}
            transparent
            animationType="fade"
        >
            <View style={styles.modalOverlay}>
                <Pressable
                    style={StyleSheet.absoluteFill}
                    onPress={Keyboard.dismiss}
                />
                <KeyboardAvoidingView
                    style={styles.kav}
                    behavior={"padding"}
                    keyboardVerticalOffset={0}
                >
                    <View style={styles.modalContainer}>
                        <ScrollView
                            ref={formScrollRef}
                            style={styles.scroll}
                            contentContainerStyle={styles.scrollContent}
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={false}
                            scrollEnabled={formScrollEnabled}
                        >
                            <View style={styles.imagesContainer}>
                                <TouchableOpacity
                                    style={
                                        images.length > 0
                                            ? styles.galleryContainerWithImages
                                            : styles.galleryContainer
                                    }
                                    accessibilityRole="button"
                                    accessibilityLabel="Choose gallery photos"
                                    accessibilityState={{ busy: isAddingImages || isUploadingImages, disabled: isAddingImages || isUploadingImages }}
                                    onPress={handlePickImages}
                                    disabled={isUploadingImages || isAddingImages}
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
                                    allowFontScaling={false}
                                    style={styles.input}
                                    placeholder="Enter date name"
                                    placeholderTextColor={Colors.gray}
                                    value={dateName}
                                    onChangeText={setDateName}
                                    editable={!isUploadingImages}
                                />

                                <CustomText
                                    weight="semibold"
                                    style={styles.formTitle}
                                >
                                    Location
                                </CustomText>
                                <TextInput
                                    allowFontScaling={false}
                                    style={styles.input}
                                    placeholder="Enter location"
                                    placeholderTextColor={Colors.gray}
                                    value={location}
                                    onChangeText={setLocation}
                                    editable={!isUploadingImages}
                                />

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
                                            accessibilityRole="radio"
                                            accessibilityLabel={`Gallery colour ${index + 1}`}
                                            accessibilityState={{ selected: index === selectedColorIndex, disabled: isUploadingImages || isAddingImages }}
                                            key={color}
                                            onPress={() => {
                                                setSelectedColor(color);
                                                setSelectedColorIndex(index);
                                            }}
                                            disabled={isUploadingImages || isAddingImages}
                                        />
                                    ))}
                                </View>

                                <CustomText
                                    weight="semibold"
                                    style={[
                                        styles.formTitle,
                                        { marginTop: 12 },
                                    ]}
                                >
                                    Date
                                </CustomText>
                                <InlineWheelDatePicker
                                    value={date}
                                    onChange={setDate}
                                    minYear={1900}
                                    maxYear={new Date().getFullYear() + 20}
                                    nestedScrollEnabled
                                    parentScrollRef={formScrollRef}
                                    onInteractionStart={() => {
                                        if (formScrollEnabled)
                                            setFormScrollEnabled(false);
                                    }}
                                    onInteractionEnd={() => {
                                        if (!formScrollEnabled)
                                            setFormScrollEnabled(true);
                                    }}
                                />
                            </View>

                            <View style={styles.footer}>
                                <TouchableOpacity
                                    style={styles.confirmButton}
                                    accessibilityRole="button"
                                    accessibilityLabel="Save gallery"
                                    accessibilityState={{ busy: isUploadingImages, disabled: isUploadingImages || isAddingImages }}
                                    onPress={handleAddGallery}
                                    disabled={isUploadingImages || isAddingImages}
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
                                    accessibilityRole="button" accessibilityLabel="Cancel new gallery" onPress={handleCancel}
                                    disabled={isUploadingImages || isAddingImages}
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
        </Modal>
    );
};

export default AddNewGalleryModal;

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
