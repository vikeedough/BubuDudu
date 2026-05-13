import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { ScrollView } from "react-native-gesture-handler";

import CenteredModal from "@/components/common/CenteredModal";
import CustomText from "@/components/CustomText";
import InlineWheelDatePicker from "@/components/InlineWheelDatePicker";
import { Colors } from "@/constants/colors";

interface EditGalleryDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    galleryTitle: string;
    galleryLocation: string;
    galleryDate: string;
    isSaving: boolean;
    onSave: (input: {
        title: string;
        location: string;
        date: string;
    }) => Promise<unknown>;
}

function parseGalleryDate(value: string) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

const EditGalleryDetailsModal: React.FC<EditGalleryDetailsModalProps> = ({
    isOpen,
    onClose,
    galleryTitle,
    galleryLocation,
    galleryDate,
    isSaving,
    onSave,
}) => {
    const [title, setTitle] = useState(galleryTitle);
    const [location, setLocation] = useState(galleryLocation);
    const [date, setDate] = useState(() => parseGalleryDate(galleryDate));
    const [formScrollEnabled, setFormScrollEnabled] = useState(true);
    const formScrollRef = useRef<React.ElementRef<typeof ScrollView>>(null);

    useEffect(() => {
        if (!isOpen) return;
        setTitle(galleryTitle);
        setLocation(galleryLocation);
        setDate(parseGalleryDate(galleryDate));
        setFormScrollEnabled(true);
    }, [galleryDate, galleryLocation, galleryTitle, isOpen]);

    const handleSave = async () => {
        const trimmedTitle = title.trim();
        const trimmedLocation = location.trim();

        if (!trimmedTitle || !trimmedLocation) {
            Alert.alert("Missing details", "Please enter a name and location.");
            return;
        }

        await onSave({
            title: trimmedTitle,
            location: trimmedLocation,
            date: date.toISOString(),
        });
    };

    return (
        <CenteredModal
            isOpen={isOpen}
            onClose={onClose}
            useKeyboardAvoidingView
            keyboardVerticalOffset={20}
            containerStyle={styles.modalContainer}
        >
            <ScrollView
                ref={formScrollRef}
                keyboardShouldPersistTaps="handled"
                scrollEnabled={formScrollEnabled}
                showsVerticalScrollIndicator={false}
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
            >
                <View style={styles.header}>
                    <CustomText weight="bold" style={styles.modalTitle}>
                        Edit Gallery
                    </CustomText>
                    <CustomText weight="medium" style={styles.modalSubtitle}>
                        Update gallery details.
                    </CustomText>
                </View>

                <View style={styles.form}>
                    <CustomText weight="semibold" style={styles.formLabel}>
                        Name
                    </CustomText>
                    <TextInput
                        allowFontScaling={false}
                        editable={!isSaving}
                        onChangeText={setTitle}
                        placeholder="Gallery name"
                        placeholderTextColor={Colors.gray}
                        style={styles.input}
                        value={title}
                    />

                    <CustomText weight="semibold" style={styles.formLabel}>
                        Location
                    </CustomText>
                    <TextInput
                        allowFontScaling={false}
                        editable={!isSaving}
                        onChangeText={setLocation}
                        placeholder="Location"
                        placeholderTextColor={Colors.gray}
                        style={styles.input}
                        value={location}
                    />

                    <CustomText weight="semibold" style={styles.formLabel}>
                        Date
                    </CustomText>
                    <InlineWheelDatePicker
                        value={date}
                        onChange={setDate}
                        minYear={1900}
                        maxYear={new Date().getFullYear() + 20}
                        nestedScrollEnabled
                        parentScrollRef={formScrollRef}
                        textColor={Colors.darkGreenText}
                        dimTextColor="rgba(80,87,57,0.28)"
                        cardColor={Colors.white}
                        highlightColor="#EEF0EB"
                        onInteractionStart={() => {
                            if (formScrollEnabled) {
                                setFormScrollEnabled(false);
                            }
                        }}
                        onInteractionEnd={() => {
                            if (!formScrollEnabled) {
                                setFormScrollEnabled(true);
                            }
                        }}
                    />
                </View>

                <View style={styles.footer}>
                    <TouchableOpacity
                        activeOpacity={0.78}
                        disabled={isSaving}
                        onPress={handleSave}
                        style={[
                            styles.saveButton,
                            isSaving && styles.disabled,
                        ]}
                    >
                        {isSaving ? (
                            <ActivityIndicator
                                size="small"
                                color={Colors.brownText}
                            />
                        ) : (
                            <CustomText
                                weight="semibold"
                                style={styles.actionText}
                            >
                                Save
                            </CustomText>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        activeOpacity={0.78}
                        disabled={isSaving}
                        onPress={onClose}
                        style={[
                            styles.cancelButton,
                            isSaving && styles.disabled,
                        ]}
                    >
                        <CustomText weight="semibold" style={styles.actionText}>
                            Cancel
                        </CustomText>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </CenteredModal>
    );
};

export default EditGalleryDetailsModal;

const styles = StyleSheet.create({
    modalContainer: {
        width: "90%",
        maxWidth: 380,
        maxHeight: "88%",
        padding: 22,
    },
    scroll: {
        width: "100%",
    },
    scrollContent: {
        gap: 18,
    },
    header: {
        gap: 5,
    },
    modalTitle: {
        color: Colors.darkGreenText,
        fontSize: 20,
    },
    modalSubtitle: {
        color: Colors.darkGreenText,
        fontSize: 12,
        opacity: 0.68,
    },
    form: {
        gap: 8,
    },
    formLabel: {
        color: Colors.darkGreenText,
        fontSize: 12,
    },
    input: {
        minHeight: 42,
        borderWidth: 1,
        borderColor: "#EBEAEC",
        borderRadius: 10,
        color: Colors.black,
        fontFamily: "Raleway-Regular",
        fontSize: 14,
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginBottom: 4,
    },
    footer: {
        flexDirection: "row",
        justifyContent: "center",
        gap: 14,
    },
    saveButton: {
        width: 112,
        minHeight: 40,
        borderRadius: 10,
        backgroundColor: "#FFCC7D",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 14,
    },
    cancelButton: {
        width: 112,
        minHeight: 40,
        borderRadius: 10,
        backgroundColor: "#AFAFAF",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 14,
    },
    actionText: {
        color: Colors.brownText,
        fontSize: 14,
    },
    disabled: {
        opacity: 0.55,
    },
});
