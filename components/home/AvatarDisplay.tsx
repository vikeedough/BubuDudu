import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

interface AvatarDisplayProps {
    image: any;
    borderColor: string;
}

const AvatarDisplay = ({ image, borderColor }: AvatarDisplayProps) => {
    return (
        <View style={styles.outsideContainer}>
            <View style={[styles.container, { borderColor }]}>
                <Image source={{ uri: image }} style={styles.image} />
            </View>
        </View>
    );
};

export default AvatarDisplay;

const styles = StyleSheet.create({
    container: {
        width: "100%",
        aspectRatio: 1,
        borderRadius: 999,
        borderWidth: 18,
        backgroundColor: "white",
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    outsideContainer: {
        justifyContent: "center",
        borderRadius: 999,
        alignItems: "center",
    },
    image: {
        width: "110%",
        height: "110%",
        borderRadius: 999,
        justifyContent: "center",
        alignItems: "center",
    },
});
