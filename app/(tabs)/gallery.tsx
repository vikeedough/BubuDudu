import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const Gallery = () => {
    return (
        <SafeAreaView style={styles.container}>
            <Text>Gallery</Text>
        </SafeAreaView>
    );
};

export default Gallery;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff",
    },
});
