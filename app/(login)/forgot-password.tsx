import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { sendPasswordResetLink } from "@/api/endpoints/auth";
import DebonSpin from "@/assets/svgs/debon-spin.svg";
import AuthField from "@/components/auth/AuthField";
import { authScreenStyles } from "@/components/auth/authScreenStyles";
import CustomText from "@/components/CustomText";
import { Colors } from "@/constants/colors";
import { shadowStyle } from "@/constants/shadows";

export default function ForgotPassword() {
    const router = useRouter();
    const [email, setEmail] = useState<string>("");
    const [isSending, setIsSending] = useState<boolean>(false);

    const handleSendReset = async () => {
        const trimmedEmail = email.trim();

        if (!trimmedEmail) {
            Alert.alert("Missing Email", "Please enter your email address.");
            return;
        }

        setIsSending(true);
        try {
            const redirectTo = Linking.createURL("/reset-password", {
                isTripleSlashed: true,
            });
            const sent = await sendPasswordResetLink(trimmedEmail, redirectTo);
            if (!sent) {
                return;
            }

            Alert.alert(
                "Reset Link Sent",
                "Check your email for the password reset link.",
            );
        } finally {
            setIsSending(false);
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
                <DebonSpin width="70%" height="30%" />

                <View style={[styles.credentialsContainer, shadowStyle]}>
                    <CustomText weight="bold" style={styles.sectionTitle}>
                        Forgot Password?
                    </CustomText>
                    <CustomText weight="medium" style={styles.helperText}>
                        Enter your email and we&apos;ll send a reset link.
                    </CustomText>

                    <AuthField
                        label="Email"
                        placeholder="Your Email"
                        placeholderTextColor="#AFAFAF"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        value={email}
                        onChangeText={setEmail}
                    />
                </View>

                <TouchableOpacity
                    style={[styles.button, shadowStyle, isSending && styles.disabled]}
                    onPress={handleSendReset}
                    disabled={isSending}
                >
                    <CustomText weight="bold" style={styles.buttonText}>
                        {isSending ? "Sending..." : "Send Reset Link"}
                    </CustomText>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.push("/(login)/new-login")}
                >
                    <CustomText weight="bold" style={styles.backButtonText}>
                        Back to Login
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
        marginBottom: "5%",
        borderRadius: 50,
        backgroundColor: "#FFCC7D",
        padding: "8%",
    },
    sectionTitle: {
        fontSize: 22,
        color: Colors.darkGreenText,
        marginBottom: "3%",
    },
    helperText: {
        color: Colors.darkBlueText,
        marginBottom: "5%",
        fontSize: 14,
    },
    button: {
        backgroundColor: "#FFBA50",
        borderRadius: 24,
        paddingVertical: "4%",
        width: "65%",
        alignItems: "center",
        marginTop: "-8%",
    },
    buttonText: {
        color: Colors.brownText,
        fontSize: 18,
    },
    disabled: {
        opacity: 0.65,
    },
    backButton: {
        marginTop: "5%",
        paddingVertical: "1%",
    },
    backButtonText: {
        color: Colors.gray,
        fontSize: 14,
        textDecorationLine: "underline",
    },
});
