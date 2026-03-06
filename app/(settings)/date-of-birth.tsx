import { useEffect, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";

import { GeneralButton } from "@/components/GeneralButton";
import { DatePickerField } from "@/components/settings/DatePickerField";
import { useAuthContext } from "@/hooks/useAuthContext";
import {
    convertToDisplayDate,
    dateToYYYYMMDD,
    formatDate,
} from "@/utils/settings";

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

    const handleSaveDate = async (date: Date) => {
        if (date) {
            const convertedDate = dateToYYYYMMDD(date);
            try {
                await updateProfile({ date_of_birth: convertedDate });
                Alert.alert("Date of Birth saved successfully.");
            } catch {
                Alert.alert("Failed to save Date of Birth.");
            }
        }
    };

    return (
        <View style={styles.container}>
            <DatePickerField
                label="Date of Birth"
                value={displayedDate}
                date={date}
                onDateChange={(selectedDate) => {
                    setDate(selectedDate);
                    setDisplayedDate(convertToDisplayDate(selectedDate));
                }}
            />
            <GeneralButton label="Save" onPress={() => handleSaveDate(date)} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: "10%",
    },
});
