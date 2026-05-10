import { useEffect, useState } from "react";
import { Alert, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { GeneralButton } from "@/components/GeneralButton";
import { SettingsTextInputField } from "@/components/settings/SettingsTextInputField";
import { useAuthContext } from "@/hooks/useAuthContext";
export default function Name() {
    const { profile, updateProfile } = useAuthContext();
    const [name, setName] = useState(profile?.name || "");

    useEffect(() => {
        setName(profile?.name || "");
    }, [profile]);

    const handleSave = async () => {
        if (name.trim() === "") {
            Alert.alert("Name cannot be empty.");
            return;
        }

        if (name !== profile?.name) {
            try {
                await updateProfile({ name });
                Alert.alert("Name saved successfully.");
            } catch {
                Alert.alert("Failed to save name.");
            }
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <SettingsTextInputField
                label="Name"
                value={name}
                onChangeText={setName}
                placeholder="Enter your name"
            />
            <GeneralButton
                label="Save"
                onPress={handleSave}
                disabled={name.trim() === "" || name === profile?.name}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: "10%",
    },
});
