import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { supabase } from "@/api/clients/supabaseClient";
import { updatePassword } from "@/api/endpoints/auth";
import DebonSpin from "@/assets/svgs/debon-spin.svg";
import AuthField from "@/components/auth/AuthField";
import { authScreenStyles } from "@/components/auth/authScreenStyles";
import CustomText from "@/components/CustomText";
import { Colors } from "@/constants/colors";
import { shadowStyle } from "@/constants/shadows";

function getUrlParam(url: string, key: string): string | null {
    const [withoutFragment, fragment = ""] = url.split("#");
    const query = withoutFragment.includes("?")
        ? withoutFragment.split("?")[1]
        : "";
    const combinedParams = [query, fragment].filter(Boolean).join("&");
    const params = new URLSearchParams(combinedParams);

    return params.get(key);
}

export default function ResetPassword() {
    const router = useRouter();
    const liveUrl = Linking.useURL();
    const processedUrlsRef = useRef<Set<string>>(new Set());

    const [newPassword, setNewPassword] = useState<string>("");
    const [confirmPassword, setConfirmPassword] = useState<string>("");
    const [isPreparing, setIsPreparing] = useState<boolean>(true);
    const [isUpdating, setIsUpdating] = useState<boolean>(false);
    const [linkError, setLinkError] = useState<string>("");

    const prepareRecoverySessionFromUrl = async (url: string) => {
        if (processedUrlsRef.current.has(url)) {
            return;
        }
        processedUrlsRef.current.add(url);

        const code = getUrlParam(url, "code");
        const accessToken = getUrlParam(url, "access_token");
        const refreshToken = getUrlParam(url, "refresh_token");

        if (code) {
            const { error } = await supabase.auth.exchangeCodeForSession(code);
            if (error) {
                setLinkError("Invalid or expired reset link.");
                return;
            }

            setLinkError("");
            return;
        }

        if (!accessToken || !refreshToken) {
            setLinkError("Invalid or expired reset link.");
            return;
        }

        const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
        });

        if (error) {
            setLinkError("Invalid or expired reset link.");
            return;
        }

        setLinkError("");
    };

    useEffect(() => {
        let isMounted = true;

        const bootstrap = async () => {
            const initialUrl = await Linking.getInitialURL();
            if (!isMounted) return;

            if (initialUrl) {
                await prepareRecoverySessionFromUrl(initialUrl);
                if (isMounted) setIsPreparing(false);
                return;
            }

            const { data } = await supabase.auth.getSession();
            if (!isMounted) return;

            if (!data.session) {
                setLinkError("Open this page from your reset email link.");
            }
            setIsPreparing(false);
        };

        bootstrap();

        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        let isMounted = true;

        const syncFromLiveUrl = async () => {
            if (!liveUrl) return;

            await prepareRecoverySessionFromUrl(liveUrl);
            if (isMounted) {
                setIsPreparing(false);
            }
        };

        syncFromLiveUrl();

        return () => {
            isMounted = false;
        };
    }, [liveUrl]);

    const handleUpdatePassword = async () => {
        if (linkError) {
            Alert.alert("Reset Link Error", linkError);
            return;
        }

        if (!newPassword || !confirmPassword) {
            Alert.alert("Missing Information", "Please complete all fields.");
            return;
        }

        if (newPassword !== confirmPassword) {
            Alert.alert("Password Error", "Passwords do not match.");
            return;
        }

        setIsUpdating(true);
        try {
            const ok = await updatePassword(newPassword);
            if (!ok) {
                return;
            }

            Alert.alert(
                "Password Updated",
                "Your password has been reset successfully.",
            );
            router.replace("/(login)/new-login");
        } finally {
            setIsUpdating(false);
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
                        Reset Password
                    </CustomText>
                    <CustomText weight="medium" style={styles.helperText}>
                        Choose a new password for your account.
                    </CustomText>

                    {linkError ? (
                        <CustomText weight="semibold" style={styles.errorText}>
                            {linkError}
                        </CustomText>
                    ) : null}

                    <AuthField
                        label="New Password"
                        placeholder="New Password"
                        placeholderTextColor="#AFAFAF"
                        secureTextEntry
                        autoCapitalize="none"
                        value={newPassword}
                        onChangeText={setNewPassword}
                    />

                    <AuthField
                        label="Confirm Password"
                        labelStyle={styles.confirmLabel}
                        placeholder="Confirm Password"
                        placeholderTextColor="#AFAFAF"
                        secureTextEntry
                        autoCapitalize="none"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                    />
                </View>

                <TouchableOpacity
                    style={[
                        styles.button,
                        shadowStyle,
                        (isUpdating || isPreparing) && styles.disabled,
                    ]}
                    onPress={handleUpdatePassword}
                    disabled={isUpdating || isPreparing}
                >
                    <CustomText weight="bold" style={styles.buttonText}>
                        {isPreparing
                            ? "Preparing..."
                            : isUpdating
                              ? "Updating..."
                              : "Update Password"}
                    </CustomText>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.replace("/(login)/new-login")}
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
        marginBottom: "4%",
        fontSize: 14,
    },
    errorText: {
        color: Colors.hotPink,
        fontSize: 14,
        marginBottom: "4%",
    },
    confirmLabel: {
        marginTop: "4%",
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
