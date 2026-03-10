import { router } from "expo-router";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import DebonSpin from "@/assets/svgs/debon-spin.svg";
import CustomText from "@/components/CustomText";
import { Colors } from "@/constants/colors";

const Index = () => {
    return (
        <SafeAreaView style={styles.container}>
            <CustomText weight="bold" style={styles.title}>
                Hello!
            </CustomText>
            <DebonSpin style={styles.debonSpin} width={250} height={280} />
            <TouchableOpacity
                style={styles.button}
                onPress={() => router.push("/new-login")}
            >
                <CustomText weight="bold" style={styles.buttonText}>
                    Login
                </CustomText>
            </TouchableOpacity>
            <View style={styles.createAccountContainer}>
                <CustomText weight="medium" style={styles.createAccountText}>
                    Don't have an account?
                </CustomText>
                <TouchableOpacity
                    onPress={() => router.push("/create-account")}
                >
                    <CustomText
                        weight="bold"
                        style={styles.createAccountButtonText}
                    >
                        Sign Up
                    </CustomText>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
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
        marginTop: -25,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#FFCC7D",
        width: 220,
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
        fontSize: 20,
    },
    debonSpin: {
        zIndex: 1000,
    },
    createAccountContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 20,
    },
    createAccountText: {
        color: Colors.gray,
        marginRight: 10,
        fontSize: 16,
    },
    createAccountButtonText: {
        color: Colors.gray,
        textDecorationLine: "underline",
        fontSize: 16,
    },
});
