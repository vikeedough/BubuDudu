import { useRouter } from "expo-router";
import { useState } from "react";
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { signUpWithCredentials } from "@/api/endpoints/auth";
import DebonSpin from "@/assets/svgs/debon-spin.svg";
import CustomText from "@/components/CustomText";
import AuthField from "@/components/auth/AuthField";
import { authScreenStyles } from "@/components/auth/authScreenStyles";
import { Colors } from "@/constants/colors";
import { shadowStyle } from "@/constants/shadows";

export default function CreateAccount() {
    const router = useRouter();
    const [email, setEmail] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [confirmPassword, setConfirmPassword] = useState<string>("");

    const handleSignUp = async () => {
        const trimmedEmail = email.trim();
        if (!trimmedEmail || !password || !confirmPassword) {
            Alert.alert("Missing Information", "Please complete all fields.");
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert("Password Error", "Passwords do not match.");
            return;
        }

        const result = await signUpWithCredentials(trimmedEmail, password);
        if (result) {
            router.replace("/(onboarding)/name");
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
                        New Friend!
                    </CustomText>

                    <AuthField
                        label="Email"
                        placeholder="Your Email"
                        placeholderTextColor="#AFAFAF"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        value={email}
                        onChangeText={setEmail}
                    />

                    <AuthField
                        label="Password"
                        labelStyle={styles.fieldSpacing}
                        placeholder="Password"
                        placeholderTextColor="#AFAFAF"
                        secureTextEntry
                        value={password}
                        onChangeText={setPassword}
                    />

                    <TextInput
                        allowFontScaling={false}
                        placeholder="Confirm Password"
                        placeholderTextColor="#AFAFAF"
                        secureTextEntry
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        style={[styles.confirmPasswordInput]}
                    />

                    <View style={styles.loginContainer}>
                        <CustomText weight="medium" style={styles.loginText}>
                            Already have an account?
                        </CustomText>
                        <TouchableOpacity
                            onPress={() => router.push("/(login)/new-login")}
                        >
                            <CustomText
                                weight="bold"
                                style={styles.loginButtonText}
                            >
                                Login
                            </CustomText>
                        </TouchableOpacity>
                    </View>
                </View>

                <TouchableOpacity
                    style={[styles.button, shadowStyle]}
                    onPress={handleSignUp}
                >
                    <CustomText weight="bold" style={styles.buttonText}>
                        Sign Up
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
        color: Colors.darkGreenText,
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
        color: Colors.darkGreenText,
        marginBottom: 15,
    },
    fieldSpacing: {
        marginTop: 20,
    },
    confirmPasswordInput: {
        width: "100%",
        height: 40,
        paddingHorizontal: 20,
        backgroundColor: Colors.white,
        borderRadius: 38,
        fontFamily: "Raleway-Regular",
        color: "#AFAFAF",
        fontSize: 14,
        marginTop: 12,
    },
    loginContainer: {
        flexDirection: "row",
        justifyContent: "center",
        marginTop: 20,
        paddingBottom: 50,
    },
    loginText: {
        color: Colors.gray,
        marginRight: 8,
        fontSize: 14,
    },
    loginButtonText: {
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
