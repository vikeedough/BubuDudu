import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
    Alert,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import SignOutButton from "@/components/auth/sign-out-button";
import CustomText from "@/components/CustomText";
import { AvatarColorPicker } from "@/components/settings/AvatarColorPicker";
import { InviteCode } from "@/components/settings/InviteCode";
import { SettingsField } from "@/components/settings/SettingsField";
import { settingsScreenStyles } from "@/components/settings/settingsScreenStyles";
import { Colors } from "@/constants/colors";
import { useAuthContext } from "@/hooks/useAuthContext";
import { useMilestoneStore } from "@/stores/MilestoneStore";
import { normalizeHexColor } from "@/utils/colors";
import { formatDate } from "@/utils/settings";

export default function Settings() {
    const router = useRouter();
    const { profile, updateProfile } = useAuthContext();
    const savedAvatarColor =
        normalizeHexColor(profile?.avatar_border_color) ?? Colors.darkBlue;
    const [avatarColor, setAvatarColor] = useState(savedAvatarColor);
    const [isSavingAvatarColor, setIsSavingAvatarColor] = useState(false);

    const milestone = useMilestoneStore((s) => s.milestone);
    const fetchMilestone = useMilestoneStore((s) => s.fetchMilestone);

    const formattedDateOfBirth = profile?.date_of_birth
        ? formatDate(profile.date_of_birth)
        : "";

    // Fetch milestone once (or only if missing)
    useEffect(() => {
        if (!milestone) {
            fetchMilestone();
        }
    }, [milestone, fetchMilestone]);

    useEffect(() => {
        setAvatarColor(savedAvatarColor);
    }, [savedAvatarColor]);

    const formattedMilestone = useMemo(() => {
        if (!milestone) return "No shared milestone yet!";
        return `${milestone.title} - ${formatDate(milestone.date)}`;
    }, [milestone]);

    const hasAvatarColorChanges = avatarColor !== savedAvatarColor;

    const handleSaveAvatarColor = async () => {
        const normalizedColor = normalizeHexColor(avatarColor);

        if (!normalizedColor) {
            Alert.alert("Invalid colour", "Please enter a valid hex colour.");
            return;
        }

        setIsSavingAvatarColor(true);
        try {
            await updateProfile({ avatar_border_color: normalizedColor });
            setAvatarColor(normalizedColor);
            Alert.alert("Avatar colour saved.");
        } catch {
            Alert.alert("Failed to save avatar colour.");
        } finally {
            setIsSavingAvatarColor(false);
        }
    };

    return (
        <SafeAreaView style={settingsScreenStyles.container}>
            <ScrollView
                contentContainerStyle={settingsScreenStyles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                <View style={settingsScreenStyles.header}>
                    <CustomText
                        weight="extrabold"
                        style={settingsScreenStyles.title}
                    >
                        Settings
                    </CustomText>
                    <CustomText
                        weight="medium"
                        style={settingsScreenStyles.subtitle}
                    >
                        Keep your profile and shared space details up to date.
                    </CustomText>
                </View>

                <View style={styles.section}>
                    <CustomText
                        weight="semibold"
                        style={settingsScreenStyles.sectionTitle}
                    >
                        Profile
                    </CustomText>
                    <SettingsField
                        label="Name"
                        value={profile?.name || ""}
                        onPress={() => router.push("/(settings)/name")}
                    />
                    <SettingsField
                        label="Date of Birth"
                        value={formattedDateOfBirth}
                        onPress={() => router.push("/(settings)/date-of-birth")}
                    />
                    <SettingsField
                        label="Shared Milestone"
                        value={formattedMilestone}
                        onPress={() =>
                            router.push("/(settings)/shared-milestone")
                        }
                    />
                </View>

                <View
                    style={[
                        settingsScreenStyles.card,
                        settingsScreenStyles.formCard,
                    ]}
                >
                    <AvatarColorPicker
                        value={avatarColor}
                        onChange={setAvatarColor}
                        avatarUri={profile?.avatar_url}
                        name={profile?.name}
                        disabled={isSavingAvatarColor}
                    />
                    <View style={settingsScreenStyles.actionsRow}>
                        <TouchableOpacity
                            activeOpacity={0.78}
                            disabled={
                                !hasAvatarColorChanges || isSavingAvatarColor
                            }
                            onPress={handleSaveAvatarColor}
                            style={[
                                settingsScreenStyles.primaryButton,
                                (!hasAvatarColorChanges ||
                                    isSavingAvatarColor) &&
                                    settingsScreenStyles.disabled,
                            ]}
                        >
                            <CustomText
                                weight="semibold"
                                style={settingsScreenStyles.primaryButtonText}
                            >
                                {isSavingAvatarColor ? "Saving..." : "Save"}
                            </CustomText>
                        </TouchableOpacity>
                    </View>
                </View>

                <InviteCode />

                <SignOutButton style={styles.signOutButton} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    section: {
        gap: 10,
    },
    signOutButton: {
        alignSelf: "stretch",
    },
});
