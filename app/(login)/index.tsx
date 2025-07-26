import CustomText from "@/components/CustomText";
import { Colors } from "@/constants/colors";
import { router } from "expo-router";
import { StyleSheet, TouchableOpacity, View } from "react-native";

const Index = () => {
    return (
        <View style={styles.container}>
            <CustomText weight="bold" style={styles.title}>
                Hello!
            </CustomText>
            <TouchableOpacity
                style={styles.button}
                onPress={() => router.push("/login")}
            >
                <CustomText weight="bold" style={styles.buttonText}>
                    Login
                </CustomText>
            </TouchableOpacity>
        </View>
    );
};

export default Index;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    title: {
        fontSize: 24,
        color: Colors.black,
    },
    button: {
        marginTop: 20,
        backgroundColor: "#FFCC7D",
        paddingHorizontal: 80,
        paddingVertical: 12,
        borderRadius: 15,
    },
    buttonText: {
        color: Colors.brownText,
    },
});
