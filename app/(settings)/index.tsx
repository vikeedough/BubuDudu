import CustomText from "@/components/CustomText";
import { SettingsField } from "@/components/settings/SettingsField";
import { useAuthContext } from "@/hooks/useAuthContext";
import { formatDate } from "@/utils/settings";
import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";

export default function Settings() {
    const router = useRouter();
    const { profile } = useAuthContext();
    const formattedDateOfBirth = profile?.date_of_birth
        ? formatDate(profile.date_of_birth)
        : "";

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
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: "10%",
    },
});
