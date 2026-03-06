import { useEffect, useState } from "react";
import { Alert, View } from "react-native";

import { GeneralButton } from "@/components/GeneralButton";
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
        <View style={settingsScreenStyles.container}>
            <DisplayDatePickerField
                label="Date of Birth"
                date={date}
                displayedDate={displayedDate}
                setDate={setDate}
                setDisplayedDate={setDisplayedDate}
            />
            <GeneralButton label="Save" onPress={() => handleSaveDate(date)} />
        </View>
    );
}
