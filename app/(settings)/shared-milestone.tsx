import { useEffect, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";

import { GeneralButton } from "@/components/GeneralButton";
import { DatePickerField } from "@/components/settings/DatePickerField";
import { SettingsTextInputField } from "@/components/settings/SettingsTextInputField";
import { useMilestoneStore } from "@/stores/MilestoneStore";
import {
    convertToDisplayDate,
    dateToYYYYMMDD,
    formatDate,
} from "@/utils/settings";

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

    const handleSaveMilestone = async () => {
        const trimmedTitle = milestoneTitle.trim();
        if (!trimmedTitle) {
            Alert.alert("Milestone name cannot be empty.");
            return;
        }

        try {
            const convertedDate = dateToYYYYMMDD(date);

            await upsertMilestone(trimmedTitle as any, convertedDate);

            Alert.alert("Milestone saved successfully.");
            setDisplayedDate(formatDate(convertedDate));
        } catch (error: any) {
            Alert.alert("Failed to save Milestone.", error?.message ?? "");
        }
    };

    return (
        <View style={styles.container}>
            <SettingsTextInputField
                label="Name"
                value={milestoneTitle}
                onChangeText={setMilestoneTitle}
                placeholder="Enter the name of your shared milestone!"
            />

            <DatePickerField
                label="Date"
                value={displayedDate}
                date={date}
                onDateChange={(selectedDate) => {
                    setDate(selectedDate);
                    setDisplayedDate(convertToDisplayDate(selectedDate));
                }}
            />

            <GeneralButton label="Save" onPress={handleSaveMilestone} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: "10%",
    },
});
