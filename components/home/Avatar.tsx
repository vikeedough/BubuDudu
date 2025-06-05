import { Image } from "expo-image";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface AvatarProps {
    image: any;
}

const Avatar = ({ image }: AvatarProps) => {
    return (
        <View style={styles.container}>
            <TouchableOpacity style={styles.addMessageButton}>
                <Text>+</Text>
            </TouchableOpacity>
            <TouchableOpacity>
                <Image source={image} style={styles.image} />
            </TouchableOpacity>
        </View>
    );
};

export default Avatar;

const styles = StyleSheet.create({
    container: {
        width: 135,
        height: 135,
        borderRadius: 999,
        borderWidth: 1,
        backgroundColor: "white",
        justifyContent: "center",
        alignItems: "center",
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
});
