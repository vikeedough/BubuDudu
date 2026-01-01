import CustomText from "@/components/CustomText";
import { GeneralButton } from "@/components/GeneralButton";
import { SettingsField } from "@/components/settings/SettingsField";
import { Colors } from "@/constants/colors";
import { useMilestoneStore } from "@/stores/milestoneStore";
import {
    convertToDisplayDate,
    dateToYYYYMMDD,
    formatDate,
} from "@/utils/settings";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useEffect, useState } from "react";
import {
    Alert,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

export default function SharedMilestone() {
    const milestone = useMilestoneStore((s) => s.milestone);
    const fetchMilestone = useMilestoneStore((s) => s.fetchMilestone);
    const upsertMilestone = useMilestoneStore((s) => s.upsertMilestone);

    const [milestoneTitle, setMilestoneTitle] = useState<string>("");
    const [showPicker, setShowPicker] = useState(false);
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
            {showPicker && (
                <DateTimePicker
                    value={date ?? new Date()}
                    mode="date"
                    display="default"
                    onChange={(_event, selectedDate) => {
                        if (selectedDate) {
                            setDate(selectedDate);
                            setDisplayedDate(
                                convertToDisplayDate(selectedDate)
                            );
                        }
                        setShowPicker(false);
                    }}
                />
            )}

            <CustomText weight="bold">Name</CustomText>
            <TouchableOpacity style={styles.fieldContainer}>
                <TextInput
                    value={milestoneTitle}
                    onChangeText={setMilestoneTitle}
                    placeholder="Enter the name of your shared milestone!"
                    style={styles.textInput}
                />
            </TouchableOpacity>

            <SettingsField
                label="Date"
                value={displayedDate}
                onPress={() => setShowPicker(true)}
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
    fieldContainer: {
        marginTop: 8,
        borderWidth: 1,
        borderColor: Colors.black,
        borderRadius: 12,
        padding: "1%",
        marginBottom: "5%",
    },
    textInput: {
        fontSize: 16,
        fontFamily: "Raleway-Regular",
    },
});
