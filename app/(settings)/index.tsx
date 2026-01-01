import CustomText from "@/components/CustomText";
import { SettingsField } from "@/components/settings/SettingsField";
import { useAuthContext } from "@/hooks/useAuthContext";
import { useMilestoneStore } from "@/stores/milestoneStore";
import { formatDate } from "@/utils/settings";
import { useRouter } from "expo-router";
import { useEffect, useMemo } from "react";
import { StyleSheet, View } from "react-native";

export default function Settings() {
    const router = useRouter();
    const { profile } = useAuthContext();

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

    const formattedMilestone = useMemo(() => {
        if (!milestone) return "No shared milestone yet!";
        return `${milestone.title} - ${formatDate(milestone.date)}`;
    }, [milestone]);

    return (
        <View style={styles.container}>
            <CustomText weight="bold">Settings</CustomText>

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
                onPress={() => router.push("/(settings)/shared-milestone")}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: "10%",
    },
});
