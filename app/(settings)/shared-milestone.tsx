import { useEffect, useState } from "react";
import { Alert, ScrollView, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import CustomText from "@/components/CustomText";
import { DisplayDatePickerField } from "@/components/settings/DisplayDatePickerField";
import { settingsScreenStyles } from "@/components/settings/settingsScreenStyles";
import { SettingsTextInputField } from "@/components/settings/SettingsTextInputField";
import { useMilestoneStore } from "@/stores/MilestoneStore";
import { dateToYYYYMMDD, formatDate } from "@/utils/settings";

export default function SharedMilestone() {
    const milestone = useMilestoneStore((s) => s.milestone);
    const fetchMilestone = useMilestoneStore((s) => s.fetchMilestone);
    const upsertMilestone = useMilestoneStore((s) => s.upsertMilestone);

    const [milestoneTitle, setMilestoneTitle] = useState<string>("");
    const [date, setDate] = useState<Date>(new Date());
    const [displayedDate, setDisplayedDate] = useState<string>("");

    // Fetch milestone once (or only if missing)
    useEffect(() => {
        if (!milestone) fetchMilestone();
    }, [milestone, fetchMilestone]);

    // Hydrate local form state when store milestone changes
    useEffect(() => {
        if (milestone) {
            setMilestoneTitle(milestone.title ?? "");
            setDisplayedDate(formatDate(milestone.date));
            setDate(new Date(milestone.date));
        } else {
            setMilestoneTitle("");
            setDisplayedDate("");
            setDate(new Date());
        }
    }, [milestone]);

    const selectedDateValue = dateToYYYYMMDD(date);
    const trimmedTitle = milestoneTitle.trim();
    const hasMilestoneChanges =
        trimmedTitle !== (milestone?.title ?? "") ||
        selectedDateValue !== (milestone?.date ?? "");

    const handleSaveMilestone = async () => {
        if (!trimmedTitle) {
            Alert.alert("Milestone name cannot be empty.");
            return;
        }

        try {
            await upsertMilestone(trimmedTitle as any, selectedDateValue);

            Alert.alert("Milestone saved successfully.");
            setDisplayedDate(formatDate(selectedDateValue));
        } catch (error: any) {
            Alert.alert("Failed to save Milestone.", error?.message ?? "");
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
                        Shared Milestone
                    </CustomText>
                    <CustomText
                        weight="medium"
                        style={settingsScreenStyles.subtitle}
                    >
                        This appears as the shared countdown on Home.
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
                        value={milestoneTitle}
                        onChangeText={setMilestoneTitle}
                        placeholder="Milestone name"
                    />

                    <DisplayDatePickerField
                        label="Date"
                        date={date}
                        displayedDate={displayedDate}
                        setDate={setDate}
                        setDisplayedDate={setDisplayedDate}
                    />

                    <View style={settingsScreenStyles.actionsRow}>
                        <TouchableOpacity
                            activeOpacity={0.78}
                            onPress={handleSaveMilestone}
                            disabled={!trimmedTitle || !hasMilestoneChanges}
                            style={[
                                settingsScreenStyles.primaryButton,
                                (!trimmedTitle || !hasMilestoneChanges) &&
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
