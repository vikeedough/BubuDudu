import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
    updateProfileAvatarBorderColor,
    uploadAvatarAndUpdateUser,
} from "@/api/endpoints/profiles";
import DebonLyingDown from "@/assets/svgs/debon-lying-down.svg";
import CustomText from "@/components/CustomText";
import { Colors, listColorsArray } from "@/constants/colors";
import { shadowStyle } from "@/constants/shadows";
import { useAuthContext } from "@/hooks/useAuthContext";
import { shrinkImage } from "@/utils/shrinkImage";

function resolveName(nameParam?: string | string[]): string {
    if (Array.isArray(nameParam)) {
        return nameParam[0] ?? "";
    }
    return nameParam ?? "";
}

function resolveDate(dateParam?: string | string[]): string {
    if (Array.isArray(dateParam)) {
        return dateParam[0] ?? "";
    }
    return dateParam ?? "";
}

export default function OnboardingIndex() {
    const router = useRouter();
    const { updateProfile } = useAuthContext();
    const params = useLocalSearchParams<{ name?: string; date?: string }>();
    const name = resolveName(params.name).trim();
    const date = resolveDate(params.date).trim();

    const [selectedColor, setSelectedColor] = useState<string>(
        listColorsArray[0],
    );
    const [selectedColorIndex, setSelectedColorIndex] = useState<number>(0);
    const [avatarUri, setAvatarUri] = useState<string | null>(null);
    const [isPickingAvatar, setIsPickingAvatar] = useState<boolean>(false);
    const [isSaving, setIsSaving] = useState<boolean>(false);

    const handlePickAvatar = async () => {
        const permission =
            await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
            Alert.alert(
                "Permission required",
                "Please allow gallery access to upload an avatar.",
            );
            return;
        }

        setIsPickingAvatar(true);
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ["images"],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 1,
                preferredAssetRepresentationMode:
                    ImagePicker.UIImagePickerPreferredAssetRepresentationMode
                        .Automatic,
            });

            if (!result.canceled) {
                setAvatarUri(result.assets[0].uri);
            }
        } finally {
            setIsPickingAvatar(false);
        }
    };

    const handleFinish = async () => {
        if (!name || !date) {
            Alert.alert(
                "Missing Details",
                "Please complete name and birthday first.",
            );
            router.replace("/(onboarding)/name");
            return;
        }

        setIsSaving(true);
        try {
            await updateProfile({
                name,
                date_of_birth: date,
            });

            const colorSaved =
                await updateProfileAvatarBorderColor(selectedColor);
            if (!colorSaved) {
                Alert.alert(
                    "Save Failed",
                    "Could not save avatar border colour. Please try again.",
                );
                return;
            }

            if (avatarUri) {
                const { uri: processedUri } = await shrinkImage(avatarUri, {
                    maxLongEdge: 512,
                    jpegQuality: 0.65,
                });

                const uploadedUrl =
                    await uploadAvatarAndUpdateUser(processedUri);
                if (!uploadedUrl) {
                    Alert.alert(
                        "Upload Failed",
                        "Could not upload avatar. Please try again.",
                    );
                    return;
                }
            }

            router.replace("/(login)/space-management");
        } catch (err: any) {
            Alert.alert("Save Error", "Could not complete onboarding.");
            console.log("Error completing onboarding", {
                name,
                date,
                avatarUri,
            });
            console.log(err);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <CustomText weight="bold" style={styles.title}>
                    Upload Avatar
                </CustomText>

                <TouchableOpacity
                    style={[styles.avatarUploadCard, shadowStyle]}
                    onPress={handlePickAvatar}
                    disabled={isPickingAvatar || isSaving}
                >
                    <View
                        style={[
                            styles.avatarWrapper,
                            { borderColor: selectedColor },
                        ]}
                    >
                        {avatarUri ? (
                            <Image
                                source={{ uri: avatarUri }}
                                style={styles.avatarImage}
                            />
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                <CustomText
                                    weight="semibold"
                                    style={styles.avatarPlaceholderText}
                                >
                                    Tap to add photo
                                </CustomText>
                            </View>
                        )}
                    </View>
                    {isPickingAvatar ? (
                        <ActivityIndicator />
                    ) : (
                        <CustomText weight="medium" style={styles.uploadHint}>
                            {avatarUri
                                ? "Tap to change avatar"
                                : "Upload avatar"}
                        </CustomText>
                    )}
                </TouchableOpacity>

                <CustomText weight="bold" style={styles.colourTitle}>
                    Colour
                </CustomText>

                <View style={styles.colorContainer}>
                    {listColorsArray.map((color, index) => (
                        <TouchableOpacity
                            style={[
                                styles.colorBox,
                                { backgroundColor: color },
                                index === selectedColorIndex &&
                                    styles.selectedColorBox,
                            ]}
                            key={color}
                            onPress={() => {
                                setSelectedColor(color);
                                setSelectedColorIndex(index);
                            }}
                            disabled={isSaving}
                        />
                    ))}
                </View>

                <TouchableOpacity
                    style={[
                        styles.button,
                        shadowStyle,
                        isSaving && styles.disabled,
                    ]}
                    onPress={handleFinish}
                    disabled={isSaving}
                >
                    <CustomText weight="bold" style={styles.buttonText}>
                        {isSaving ? "Saving..." : "Finish"}
                    </CustomText>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.skipButton}
                    onPress={handleFinish}
                    disabled={isSaving}
                >
                    <CustomText weight="medium" style={styles.skipButtonText}>
                        Skip avatar upload
                    </CustomText>
                </TouchableOpacity>
            </View>

            <DebonLyingDown width={220} height={170} style={styles.debon} />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
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
        fontSize: 20,
        color: Colors.darkGreenText,
        marginBottom: 26,
    },
    avatarUploadCard: {
        width: 260,
        borderRadius: 15,
        backgroundColor: "#FFF5E7",
        alignItems: "center",
        paddingVertical: 18,
        marginBottom: 26,
    },
    avatarWrapper: {
        width: 140,
        height: 140,
        borderRadius: 70,
        borderWidth: 8,
        overflow: "hidden",
        backgroundColor: Colors.white,
        marginBottom: 10,
    },
    avatarImage: {
        width: "100%",
        height: "100%",
    },
    avatarPlaceholder: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 18,
    },
    avatarPlaceholderText: {
        color: Colors.gray,
        textAlign: "center",
        fontSize: 16,
    },
    uploadHint: {
        color: Colors.darkGreenText,
        fontSize: 16,
    },
    colourTitle: {
        fontSize: 20,
        color: Colors.darkGreenText,
        marginBottom: 12,
    },
    colorContainer: {
        flexDirection: "row",
        gap: 10,
        marginBottom: 30,
    },
    colorBox: {
        width: 24,
        height: 24,
        borderRadius: 999,
        opacity: 0.5,
    },
    selectedColorBox: {
        borderWidth: 1,
        borderColor: Colors.brownText,
        opacity: 1,
    },
    button: {
        backgroundColor: "#FFBA50",
        borderRadius: 15,
        paddingVertical: 14,
        width: "70%",
        alignItems: "center",
        marginBottom: 12,
    },
    disabled: {
        opacity: 0.7,
    },
    buttonText: {
        color: Colors.brownText,
        fontSize: 20,
    },
    skipButton: {
        paddingVertical: 6,
    },
    skipButtonText: {
        color: Colors.gray,
        fontSize: 16,
        textDecorationLine: "underline",
    },
    debon: {
        position: "absolute",
        left: -18,
        bottom: -8,
    },
});
