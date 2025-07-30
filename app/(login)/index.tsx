import DebonSpin from "@/assets/svgs/debon-spin.svg";
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
            <DebonSpin style={styles.debonSpin} width={200} height={200} />
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
        fontSize: 32,
        color: Colors.black,
    },
    button: {
        marginTop: -10,
        backgroundColor: "#FFCC7D",
        paddingHorizontal: 80,
        paddingVertical: 12,
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
        color: Colors.brownText,
    },
    debonSpin: {
        zIndex: 1000,
    },
});
