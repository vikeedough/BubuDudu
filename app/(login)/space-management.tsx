import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { supabase } from "@/api/clients/supabaseClient";
import CustomText from "@/components/CustomText";
import { Colors } from "@/constants/colors";
import { shadowStyle } from "@/constants/shadows";
import { clearOfflineData } from "@/utils/offline/local-db";
import { deleteSpaceId } from "@/utils/secure-store";
import { createSpace, joinSpace } from "@/utils/space-management";

const INVITE_CODE_LENGTH = 8;

export default function SpaceManagementPage() {
    const router = useRouter();
    const inviteCodeInputRef = useRef<TextInput>(null);
    const [inviteCode, setInviteCode] = useState<string>("");
    const [isJoining, setIsJoining] = useState<boolean>(false);
    const [isCreating, setIsCreating] = useState<boolean>(false);

    const handleCreateSpace = async () => {
        let result;

        setIsCreating(true);
        try {
            result = await createSpace("BubuDudu");
        } finally {
            setIsCreating(false);
        }

        if (result) {
            router.replace("/(tabs)/initial");
        }
    };

    const handleJoinSpace = async () => {
        const code = inviteCode.trim();

        if (code.length !== INVITE_CODE_LENGTH) {
            Alert.alert(
                "Incomplete Code",
                "Invite code must be 8 characters long.",
            );
            return;
        }

        let result;

        setIsJoining(true);
        try {
            result = await joinSpace(code);
        } finally {
            setIsJoining(false);
        }

        if (result) {
            router.replace("/(tabs)/initial");
        }
    };

    const handleChangeInviteCode = (text: string) => {
        const cleaned = text.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8);
        setInviteCode(cleaned);
    };

    const handleEmergencyToLogin = async () => {
        try {
            await supabase.auth.signOut();
        } catch (error) {
            console.error("Emergency sign-out failed:", error);
        } finally {
            await clearOfflineData();
            await deleteSpaceId();
            router.replace("/(login)");
        }
    };

    const isBusy = isJoining || isCreating;

    return (
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
                <View style={styles.content}>
                    <CustomText weight="bold" style={styles.title}>
                        Join a Space
                    </CustomText>

                    <View style={[styles.joinCard, shadowStyle]}>
                        <CustomText weight="bold" style={styles.sectionTitle}>
                            Invite Code
                        </CustomText>
                        <CustomText weight="medium" style={styles.subtitle}>
                            Enter your partner&apos;s 8-character code.
                        </CustomText>

                        <Pressable
                            style={styles.otpContainer}
                            onPress={() => inviteCodeInputRef.current?.focus()}
                        >
                            {Array.from(
                                { length: INVITE_CODE_LENGTH },
                                (_, index) => {
                                    const value = inviteCode[index] ?? "";
                                    const isActive =
                                        inviteCode.length === index &&
                                        inviteCode.length < INVITE_CODE_LENGTH;

                                    return (
                                        <View
                                            key={`invite-box-${index}`}
                                            style={[
                                                styles.otpBox,
                                                isActive && styles.otpBoxActive,
                                            ]}
                                        >
                                            <CustomText
                                                weight="bold"
                                                style={styles.otpChar}
                                            >
                                                {value}
                                            </CustomText>
                                        </View>
                                    );
                                },
                            )}
                        </Pressable>

                        <TextInput
                            ref={inviteCodeInputRef}
                            value={inviteCode}
                            onChangeText={handleChangeInviteCode}
                            maxLength={INVITE_CODE_LENGTH}
                            autoCapitalize="none"
                            autoCorrect={false}
                            keyboardType="default"
                            textContentType="oneTimeCode"
                            importantForAutofill="yes"
                            style={styles.hiddenInput}
                            editable={!isBusy}
                        />

                        <TouchableOpacity
                            style={[
                                styles.primaryButton,
                                shadowStyle,
                                isBusy && styles.disabledButton,
                            ]}
                            onPress={handleJoinSpace}
                            disabled={isBusy}
                        >
                            <CustomText
                                weight="bold"
                                style={styles.primaryButtonText}
                            >
                                {isJoining ? "Joining..." : "Join Space"}
                            </CustomText>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.dividerContainer}>
                        <CustomText weight="medium" style={styles.dividerText}>
                            or
                        </CustomText>
                    </View>

                    <View style={[styles.createCard, shadowStyle]}>
                        <CustomText weight="bold" style={styles.sectionTitle}>
                            Start New
                        </CustomText>
                        <CustomText weight="medium" style={styles.subtitle}>
                            Create your own Space and invite your partner later.
                        </CustomText>

                        <TouchableOpacity
                            style={[
                                styles.primaryButton,
                                shadowStyle,
                                isBusy && styles.disabledButton,
                            ]}
                            onPress={handleCreateSpace}
                            disabled={isBusy}
                        >
                            <CustomText
                                weight="bold"
                                style={styles.primaryButtonText}
                            >
                                {isCreating ? "Creating..." : "Create Space"}
                            </CustomText>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={styles.emergencyButton}
                        onPress={handleEmergencyToLogin}
                    >
                        <CustomText
                            weight="bold"
                            style={styles.emergencyButtonText}
                        >
                            Emergency: Go to Login
                        </CustomText>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: Colors.backgroundPink,
    },
    container: {
        flex: 1,
        backgroundColor: Colors.backgroundPink,
    },
    content: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 24,
    },
    title: {
        fontSize: 28,
        color: Colors.darkGreenText,
        marginBottom: 16,
    },
    joinCard: {
        width: "100%",
        backgroundColor: "#FFCC7D",
        borderRadius: 30,
        paddingHorizontal: 24,
        paddingVertical: 24,
    },
    createCard: {
        width: "100%",
        backgroundColor: "#FFCC7D",
        borderRadius: 30,
        paddingHorizontal: 24,
        paddingVertical: 24,
        marginTop: 6,
    },
    sectionTitle: {
        fontSize: 24,
        color: Colors.darkGreenText,
        textAlign: "center",
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 15,
        color: Colors.darkBlueText,
        textAlign: "center",
        marginBottom: 18,
    },
    otpContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 22,
        gap: 6,
    },
    otpBox: {
        width: "11%",
        aspectRatio: 34 / 44,
        borderRadius: 12,
        borderWidth: 1.2,
        borderColor: "#88A7AE",
        backgroundColor: "#F8FCFC",
        justifyContent: "center",
        alignItems: "center",
    },
    otpBoxActive: {
        borderColor: Colors.darkBlue,
        backgroundColor: "#EAF5F8",
    },
    otpChar: {
        fontSize: 20,
        color: Colors.darkGreenText,
        textAlign: "center",
    },
    hiddenInput: {
        position: "absolute",
        opacity: 0,
        width: "0%",
        height: "0%",
    },
    primaryButton: {
        backgroundColor: "#FFBA50",
        borderRadius: 18,
        paddingVertical: 14,
        alignItems: "center",
    },
    primaryButtonText: {
        color: Colors.brownText,
        fontSize: 18,
    },
    disabledButton: {
        opacity: 0.6,
    },
    dividerContainer: {
        marginVertical: 10,
    },
    dividerText: {
        fontSize: 15,
        color: Colors.gray,
    },
    emergencyButton: {
        marginTop: 14,
        paddingVertical: 8,
    },
    emergencyButtonText: {
        color: Colors.hotPink,
        fontSize: 14,
        textDecorationLine: "underline",
    },
    debon: {
        position: "absolute",
        width: "58%",
        aspectRatio: 220 / 170,
        left: -18,
        bottom: -8,
    },
});
