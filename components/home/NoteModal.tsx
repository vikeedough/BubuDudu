import { useState } from "react";
import {
    Alert,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import CenteredModal from "@/components/common/CenteredModal";
import { Colors } from "@/constants/colors";
import { toast } from "@/toast/api";

import CustomText from "../CustomText";

interface NoteModalProps {
    isOpen: boolean;
    onClose: () => void;
    updateNote: (note: string) => Promise<boolean>;
    onSaved: () => Promise<void> | void;
}

const NoteModal: React.FC<NoteModalProps> = ({
    isOpen,
    onClose,
    updateNote,
    onSaved,
}) => {
    const [note, setNote] = useState<string>("");

    const handleSave = async () => {
        const success = await updateNote(note);
        if (success) {
            await onSaved();
            toast.show({
                title: "Success!",
                message: "Your note has been updated.",
                durationMs: 2500,
            });
            setNote("");
            onClose();
        } else {
            Alert.alert(
                "Error",
                "An unexpected error occurred. Please try again.",
            );
        }
    };

    return (
        <CenteredModal
            isOpen={isOpen}
            onClose={onClose}
            useKeyboardAvoidingView
            containerStyle={styles.modalContainer}
        >
            <CustomText weight="bold" style={styles.modalTitle}>
                Edit Status
            </CustomText>
            <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="Enter your note!"
                multiline
                style={styles.noteInput}
            />
            <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                    <CustomText weight="bold" style={styles.buttonText}>
                        Save
                    </CustomText>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                    <CustomText weight="bold" style={styles.buttonText}>
                        Cancel
                    </CustomText>
                </TouchableOpacity>
            </View>
        </CenteredModal>
    );
};

export default NoteModal;

const styles = StyleSheet.create({
    modalContainer: {
        padding: 20,
        margin: 20,
    },
    modalTitle: {
        fontSize: 16,
        marginBottom: 5,
        textAlign: "center",
    },
    noteInput: {
        borderWidth: 1,
        borderColor: "#EBEAEC",
        borderRadius: 15,
        padding: 10,
        marginTop: 10,
        minWidth: "80%",
        maxWidth: "80%",
        height: 70,
        fontFamily: "Raleway-Medium",
        fontSize: 12,
    },
    buttonContainer: {
        flexDirection: "row",
        justifyContent: "center",
        gap: 40,
        marginTop: 15,
    },
    cancelButton: {
        backgroundColor: "#AFAFAF",
        padding: 10,
        paddingHorizontal: 20,
        borderRadius: 15,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    saveButton: {
        backgroundColor: "#FFCC7D",
        padding: 10,
        paddingHorizontal: 20,
        borderRadius: 15,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    buttonText: {
        fontSize: 16,
        color: Colors.brownText,
    },
});
