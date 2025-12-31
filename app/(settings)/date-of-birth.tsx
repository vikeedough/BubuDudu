import { GeneralButton } from "@/components/GeneralButton";
import { SettingsField } from "@/components/settings/SettingsField";
import { useAuthContext } from "@/hooks/useAuthContext";
import { dateToYYYYMMDD, formatDate } from "@/utils/settings";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useEffect, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";

export default function DateOfBirth() {
    const { profile, updateProfile } = useAuthContext();
    const [displayedDate, setDisplayedDate] = useState<string>(
        profile?.date_of_birth ? formatDate(profile.date_of_birth) : ""
    );
    const [date, setDate] = useState<Date>(
        profile?.date_of_birth ? new Date(profile.date_of_birth) : new Date()
    );
    const [showPicker, setShowPicker] = useState(false);

    useEffect(() => {
        setDisplayedDate(
            profile?.date_of_birth ? formatDate(profile.date_of_birth) : ""
        );
    }, [profile]);

    const handleSaveDate = async (date: Date) => {
        if (date) {
            const convertedDate = dateToYYYYMMDD(date);
            try {
                await updateProfile({ date_of_birth: convertedDate });
                Alert.alert("Date of Birth saved successfully.");
            } catch (error) {
                Alert.alert("Failed to save Date of Birth.");
            }
        }
    };

    const convertToDisplayDate = (date: Date) => {
        const convertedDate = dateToYYYYMMDD(date);
        return formatDate(convertedDate);
    };

    return (
        <View style={styles.container}>
            {showPicker && (
                <DateTimePicker
                    value={date ? date : new Date()}
                    mode="date"
                    display="default"
                    onChange={(event, date) => {
                        if (date) {
                            setDate(date);
                            setDisplayedDate(convertToDisplayDate(date));
                            setShowPicker(false);
                        }
                    }}
                />
            )}
            <SettingsField
                label="Date of Birth"
                value={displayedDate}
                onPress={() => setShowPicker(true)}
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
