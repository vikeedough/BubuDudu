import { Image } from "expo-image";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface AvatarProps {
    image: any;
    onPress: () => void;
    isSelected: boolean;
    hasAddMessageButton: boolean;
    isBubu: boolean;
}

const Avatar = ({
    image,
    onPress,
    isSelected,
    isBubu,
    hasAddMessageButton,
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
                <TouchableOpacity style={styles.addMessageButton}>
                    <Text>+</Text>
                </TouchableOpacity>
            )}
            <TouchableOpacity onPress={onPress}>
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
    },
    selectedContainer: {
        borderColor: "#b2e1de",
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
        borderColor: "#b2e1de",
        borderWidth: 5,
        height: 145,
        width: 145,
    },
    bubuSelectedContainer: {
        borderColor: "#fdcfd0",
        borderWidth: 5,
        height: 145,
        width: 145,
    },
});
