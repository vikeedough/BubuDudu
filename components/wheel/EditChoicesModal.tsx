import React, { useState } from "react";
import {
    Alert,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import { Wheel } from "@/api/endpoints/types";
import CenteredModal from "@/components/common/CenteredModal";
import ModalActionButtons from "@/components/common/ModalActionButtons";
import { Colors } from "@/constants/colors";
import { useWheelStore } from "@/stores/WheelStore";

import CustomText from "../CustomText";

interface EditChoicesModalProps {
    isOpen: boolean;
    onClose: () => void;
    wheel: Wheel;
}

const ChoiceItem = ({
    item,
    onDelete,
}: {
    item: string;
    onDelete: (choice: string) => void;
}) => {
    return (
        <View style={styles.selectableChoice} key={item}>
            <CustomText weight="semibold" style={styles.choiceText}>
                {item}
            </CustomText>
            <TouchableOpacity onPress={() => onDelete(item)}>
                <CustomText weight="semibold" style={styles.deleteButtonText}>
                    X
                </CustomText>
            </TouchableOpacity>
        </View>
    );
};

const EditChoicesModal: React.FC<EditChoicesModalProps> = ({
    isOpen,
    onClose,
    wheel,
}) => {
    const updateWheelChoices = useWheelStore((s) => s.updateWheelChoices);

    const [currentChoices, setCurrentChoices] = useState<string[]>(
        wheel.choices || [],
    );
    const [newChoice, setNewChoice] = useState("");

    const handleAddChoice = () => {
        if (newChoice.trim() !== "") {
            setCurrentChoices([...currentChoices, newChoice]);

            setNewChoice("");
        }
    };

    const handleDeleteChoice = (choice: string) => {
        setCurrentChoices(currentChoices.filter((c) => c !== choice));
    };

    const handleSaveChoicesAndClose = async () => {
        // shallow compare is fine, but this is safer:
        const same =
            wheel.choices?.length === currentChoices.length &&
            wheel.choices?.every((c, i) => c === currentChoices[i]);

        if (same) {
            onClose();
            return;
        }

        try {
            await updateWheelChoices(wheel.id, currentChoices);
            onClose();
        } catch {
            Alert.alert("Error", "Failed to update choices");
        }
    };

    return (
        <CenteredModal
            isOpen={isOpen}
            onClose={onClose}
            useKeyboardAvoidingView
            containerStyle={styles.modalContainer}
        >
            <ScrollView
                contentContainerStyle={styles.modalContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <CustomText weight="bold" style={styles.modalTitle}>
                    Edit Items
                </CustomText>
                <CustomText weight="semibold" style={styles.modalSubtitle}>
                    Name
                </CustomText>
                <TextInput
                    style={styles.input}
                    value={newChoice}
                    onChangeText={setNewChoice}
                    onSubmitEditing={handleAddChoice}
                />
                <ScrollView
                    style={styles.choicesScrollView}
                    contentContainerStyle={styles.choicesContainer}
                >
                    <View style={styles.choicesList}>
                        {currentChoices.length > 0 ? (
                            currentChoices.map((choice) => (
                                <ChoiceItem
                                    key={choice}
                                    item={choice}
                                    onDelete={handleDeleteChoice}
                                />
                            ))
                        ) : (
                            <CustomText style={styles.noChoicesText}>
                                No choices available for this wheel
                            </CustomText>
                        )}
                    </View>
                </ScrollView>
            </ScrollView>
            <ModalActionButtons
                onConfirm={handleSaveChoicesAndClose}
                onCancel={onClose}
                confirmLabel="Save"
                cancelLabel="Cancel"
                containerStyle={styles.modalButtons}
            />
        </CenteredModal>
    );
};

export default EditChoicesModal;

const styles = StyleSheet.create({
    modalContainer: {
        padding: 30,
        margin: 10,
        width: "90%",
    },
    modalContent: {
        flexGrow: 1,
    },
    modalTitle: {
        fontSize: 16,
        marginBottom: 10,
    },
    modalButtons: {
        paddingTop: 12,
    },
    choicesList: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
        marginBottom: 20,
    },
    selectableChoice: {
        backgroundColor: "#FFCC7D",
        flexDirection: "row",
        justifyContent: "space-around",
        gap: 10,
        alignItems: "center",
        padding: 10,
        paddingHorizontal: 20,
        borderRadius: 15,
        marginBottom: 10,
    },
    choiceText: {
        fontSize: 11,
        color: Colors.brownText,
    },
    noChoicesText: {
        fontSize: 11,
        color: Colors.brownText,
    },
    modalSubtitle: {
        fontSize: 12,
        color: Colors.black,
    },
    input: {
        borderWidth: 1,
        borderColor: "#EBEAEC",
        borderRadius: 15,
        padding: 10,
        marginTop: 5,
        marginBottom: 20,
        fontFamily: "Raleway-Medium",
        fontSize: 12,
    },
    choicesScrollView: {
        flex: 1,
        marginBottom: 20,
        maxHeight: 200,
    },
    choicesContainer: {
        flexGrow: 1,
    },
    deleteButtonText: {
        fontSize: 16,
        color: Colors.brownText,
    },
});
