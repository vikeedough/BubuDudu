import { fetchUsers } from "@/api/endpoints/supabase";
import Colors from "@/constants/colors";
import { useAppStore } from "@/stores/AppStore";
import { useState } from "react";
import {
    Alert,
    Modal,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import CustomText from "../CustomText";

interface NoteModalProps {
    isOpen: boolean;
    onClose: () => void;
    updateNote: (note: string, user_id: number) => Promise<boolean>;
    user_id: number;
}

const NoteModal: React.FC<NoteModalProps> = ({
    isOpen,
    onClose,
    updateNote,
    user_id,
}) => {
    const [note, setNote] = useState<string>("");

    const handleSave = async () => {
        const success = await updateNote(note, user_id);
        if (success) {
            const updatedUsers = await fetchUsers();
            useAppStore.setState({ users: updatedUsers });
            setNote("");
            onClose();
        } else {
            Alert.alert(
                "Error",
                "An unexpected error occurred. Please try again."
            );
        }
    };

    return (
        <Modal
            visible={isOpen}
            onRequestClose={onClose}
            transparent={true}
            animationType="fade"
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                    <TextInput
                        value={note}
                        onChangeText={setNote}
                        placeholder="Enter your note!"
                        multiline
                        style={styles.noteInput}
                    />
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={onClose}
                        >
                            <CustomText weight="bold" style={styles.buttonText}>
                                Cancel
                            </CustomText>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.saveButton}
                            onPress={handleSave}
                        >
                            <CustomText weight="bold" style={styles.buttonText}>
                                Save
                            </CustomText>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

export default NoteModal;

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center",
        alignItems: "center",
    },
    modalContainer: {
        backgroundColor: "white",
        borderRadius: 15,
        padding: 20,
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
    },
    noteInput: {
        borderWidth: 1,
        borderColor: "gray",
        borderRadius: 15,
        padding: 10,
        marginTop: 10,
        minWidth: "80%",
        maxWidth: "80%",
        height: 70,
        fontFamily: "Baloo2-Regular",
    },
    buttonContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 10,
    },
    cancelButton: {
        backgroundColor: Colors.red,
        padding: 10,
        paddingHorizontal: 20,
        borderRadius: 15,
    },
    saveButton: {
        backgroundColor: Colors.lightBlue,
        padding: 10,
        paddingHorizontal: 20,
        borderRadius: 15,
    },
    buttonText: {
        fontSize: 16,
        color: "white",
    },
});
