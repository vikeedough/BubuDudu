import Colors from "@/constants/colors";
import { Image } from "expo-image";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface AvatarProps {
    image: any;
    onPressNoteButton: () => void;
    onPressImage: () => void;
    isSelected: boolean;
    hasAddMessageButton: boolean;
    isBubu: boolean;
    disabled: boolean;
}

const Avatar = ({
    image,
    onPressNoteButton,
    onPressImage,
    isSelected,
    isBubu,
    hasAddMessageButton,
    disabled,
}: AvatarProps) => {
    return (
        <View
            style={[
                styles.container,
                isSelected && !isBubu && styles.selectedContainer,
                isSelected && isBubu && styles.bubuSelectedContainer,
            ]}
        >
            {hasAddMessageButton && (
                <TouchableOpacity
                    style={styles.addMessageButton}
                    disabled={disabled}
                    onPress={onPressNoteButton}
                >
                    <Text>+</Text>
                </TouchableOpacity>
            )}
            <TouchableOpacity onPress={onPressImage} disabled={disabled}>
                <Image source={{ uri: image }} style={styles.image} />
            </TouchableOpacity>
        </View>
    );
};

export default Avatar;

const styles = StyleSheet.create({
    container: {
        width: 145,
        height: 145,
        borderRadius: 999,
        borderWidth: 1,
        backgroundColor: "white",
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 15,
        elevation: 5,
    },
    selectedContainer: {
        borderColor: Colors.lightBlue,
        borderWidth: 5,
        height: 145,
        width: 145,
    },
    addMessageButton: {
        position: "absolute",
        top: 5,
        right: 5,
        height: 25,
        width: 25,
        backgroundColor: "white",
        borderRadius: 999,
        borderWidth: 1,
        zIndex: 100,
        justifyContent: "center",
        alignItems: "center",
    },
    image: {
        width: 125,
        height: 125,
        borderRadius: 999,
    },
    bubuContainer: {
        borderColor: Colors.lightBlue,
        borderWidth: 5,
        height: 145,
        width: 145,
    },
    bubuSelectedContainer: {
        borderColor: Colors.pink,
        borderWidth: 5,
        height: 145,
        width: 145,
    },
});
