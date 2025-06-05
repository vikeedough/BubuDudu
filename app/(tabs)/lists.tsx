import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const Lists = () => {
    return (
        <SafeAreaView style={styles.container}>
            <Text>Lists</Text>
        </SafeAreaView>
    );
};

export default Lists;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff",
    },
});
