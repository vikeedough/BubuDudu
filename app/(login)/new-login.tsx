import { useRouter } from "expo-router";
import { useState } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { signInWithEmail } from "@/api/endpoints/auth";
import DebonSpin from "@/assets/svgs/debon-spin.svg";
import AuthCredentialsFields from "@/components/auth/AuthCredentialsFields";
import { authScreenStyles } from "@/components/auth/authScreenStyles";
import CustomText from "@/components/CustomText";
import { Colors } from "@/constants/colors";
import { shadowStyle } from "@/constants/shadows";

export default function NewLogin() {
    const router = useRouter();
    const [email, setEmail] = useState<string>("");
    const [password, setPassword] = useState<string>("");

    const handleLogin = async () => {
        const result = await signInWithEmail(email, password);
        if (result) {
            router.replace("/(tabs)/initial");
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView
                style={authScreenStyles.container}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
                <CustomText weight="bold" style={styles.title}>
                    Hello!
                </CustomText>
                <DebonSpin width={250} height={280} />

                <View style={[styles.credentialsContainer, shadowStyle]}>
                    <CustomText weight="bold" style={styles.sectionTitle}>
                        Welcome Back!
                    </CustomText>
                    <AuthCredentialsFields
                        email={email}
                        password={password}
                        onEmailChange={setEmail}
                        onPasswordChange={setPassword}
                    />

                    <View style={styles.forgotPasswordContainer}>
                        <CustomText
                            weight="medium"
                            style={styles.forgotPasswordText}
                        >
                            Forgot password?
                        </CustomText>
                        <TouchableOpacity
                            onPress={() =>
                                router.push("/(login)/forgot-password")
                            }
                        >
                            <CustomText
                                weight="bold"
                                style={styles.forgotPasswordButtonText}
                            >
                                Reset
                            </CustomText>
                        </TouchableOpacity>
                    </View>
                </View>

                <TouchableOpacity
                    style={[styles.button, shadowStyle]}
                    onPress={handleLogin}
                >
                    <CustomText weight="bold" style={styles.buttonText}>
                        Login
                    </CustomText>
                </TouchableOpacity>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    title: {
        fontSize: 26,
        color: "#505739",
    },
    credentialsContainer: {
        width: "100%",
        marginBottom: 20,
        borderRadius: 50,
        backgroundColor: "#FFCC7D",
        padding: 30,
    },
    sectionTitle: {
        fontSize: 22,
        color: "#505739",
        marginBottom: 15,
    },
    forgotPasswordContainer: {
        flexDirection: "row",
        justifyContent: "center",
        marginTop: 20,
        paddingBottom: 50,
    },
    forgotPasswordText: {
        color: Colors.gray,
        marginRight: 10,
        fontSize: 14,
    },
    forgotPasswordButtonText: {
        color: Colors.gray,
        fontSize: 14,
    },
    button: {
        backgroundColor: "#FFBA50",
        borderRadius: 24,
        paddingVertical: 15,
        paddingHorizontal: 30,
        width: "60%",
        alignItems: "center",
        marginTop: -50,
    },
    buttonText: {
        color: Colors.brownText,
        fontSize: 18,
    },
});
