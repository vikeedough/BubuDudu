import { useEffect, useState } from "react";
import { Alert, ScrollView, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import CustomText from "@/components/CustomText";
import { DisplayDatePickerField } from "@/components/settings/DisplayDatePickerField";
import { settingsScreenStyles } from "@/components/settings/settingsScreenStyles";
import { useAuthContext } from "@/hooks/useAuthContext";
import { dateToYYYYMMDD, formatDate } from "@/utils/settings";

export default function DateOfBirth() {
    const { profile, updateProfile } = useAuthContext();
    const [displayedDate, setDisplayedDate] = useState<string>(
        profile?.date_of_birth ? formatDate(profile.date_of_birth) : ""
    );
    const [date, setDate] = useState<Date>(
        profile?.date_of_birth ? new Date(profile.date_of_birth) : new Date()
    );

    useEffect(() => {
        if (profile?.date_of_birth) {
            const nextDate = new Date(profile.date_of_birth);
            setDate(nextDate);
            setDisplayedDate(formatDate(profile.date_of_birth));
            return;
        }
        setDate(new Date());
        setDisplayedDate("");
    }, [profile]);

    const selectedDateValue = dateToYYYYMMDD(date);
    const hasDateChanges = selectedDateValue !== profile?.date_of_birth;

    const handleSaveDate = async () => {
        if (date) {
            try {
                await updateProfile({ date_of_birth: selectedDateValue });
                Alert.alert("Date of Birth saved successfully.");
            } catch {
                Alert.alert("Failed to save Date of Birth.");
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
                        Birthday
                    </CustomText>
                    <CustomText
                        weight="medium"
                        style={settingsScreenStyles.subtitle}
                    >
                        Your birthday powers the home countdown.
                    </CustomText>
                </View>

                <View
                    style={[
                        settingsScreenStyles.card,
                        settingsScreenStyles.formCard,
                    ]}
                >
                    <DisplayDatePickerField
                        label="Date of Birth"
                        date={date}
                        displayedDate={displayedDate}
                        setDate={setDate}
                        setDisplayedDate={setDisplayedDate}
                    />
                    <View style={settingsScreenStyles.actionsRow}>
                        <TouchableOpacity
                            activeOpacity={0.78}
                            onPress={handleSaveDate}
                            disabled={!hasDateChanges}
                            style={[
                                settingsScreenStyles.primaryButton,
                                !hasDateChanges &&
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
