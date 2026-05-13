import { useEffect, useState } from "react";
import { Alert, ScrollView, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import CustomText from "@/components/CustomText";
import { settingsScreenStyles } from "@/components/settings/settingsScreenStyles";
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
                        Name
                    </CustomText>
                    <CustomText
                        weight="medium"
                        style={settingsScreenStyles.subtitle}
                    >
                        This is how your name appears across the app.
                    </CustomText>
                </View>

                <View
                    style={[
                        settingsScreenStyles.card,
                        settingsScreenStyles.formCard,
                    ]}
                >
                    <SettingsTextInputField
                        label="Name"
                        value={name}
                        onChangeText={setName}
                        placeholder="Enter your name"
                        autoCapitalize="words"
                    />
                    <View style={settingsScreenStyles.actionsRow}>
                        <TouchableOpacity
                            activeOpacity={0.78}
                            onPress={handleSave}
                            disabled={
                                name.trim() === "" || name === profile?.name
                            }
                            style={[
                                settingsScreenStyles.primaryButton,
                                (name.trim() === "" ||
                                    name === profile?.name) &&
                                    settingsScreenStyles.disabled,
                            ]}
                        >
                            <CustomText
                                weight="semibold"
                                style={settingsScreenStyles.primaryButtonText}
                            >
                                Save
                            </CustomText>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
