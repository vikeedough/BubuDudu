import React from "react";
import {
    KeyboardAvoidingView,
    Modal,
    Platform,
    StyleProp,
    StyleSheet,
    View,
    ViewStyle,
} from "react-native";

interface CenteredModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    useKeyboardAvoidingView?: boolean;
    keyboardVerticalOffset?: number;
    containerStyle?: StyleProp<ViewStyle>;
}

const CenteredModal: React.FC<CenteredModalProps> = ({
    isOpen,
    onClose,
    children,
    useKeyboardAvoidingView = false,
    keyboardVerticalOffset = 0,
    containerStyle,
}) => {
    const content = (
        <View style={[styles.modalContainer, containerStyle]}>{children}</View>
    );

    return (
        <Modal
            visible={isOpen}
            onRequestClose={onClose}
            transparent={true}
            animationType="fade"
        >
            <View style={styles.modalOverlay}>
                {useKeyboardAvoidingView ? (
                    <KeyboardAvoidingView
                        style={styles.centered}
                        behavior={Platform.OS === "ios" ? "padding" : "height"}
                        keyboardVerticalOffset={keyboardVerticalOffset}
                    >
                        {content}
                    </KeyboardAvoidingView>
                ) : (
                    <View style={styles.centered}>{content}</View>
                )}
            </View>
        </Modal>
    );
};

export default CenteredModal;

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
    },
    centered: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    modalContainer: {
        backgroundColor: "white",
        borderRadius: 15,
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
});
