import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useState } from "react";

import { SettingsField } from "./SettingsField";

interface DatePickerFieldProps {
    label: string;
    value: string;
    date: Date | null;
    onDateChange: (date: Date) => void;
}

export const DatePickerField: React.FC<DatePickerFieldProps> = ({
    label,
    value,
    date,
    onDateChange,
}) => {
    const [showPicker, setShowPicker] = useState(false);

    return (
        <>
            {showPicker && (
                <DateTimePicker
                    value={date ?? new Date()}
                    mode="date"
                    display="default"
                    onChange={(_event, selectedDate) => {
                        if (selectedDate) {
                            onDateChange(selectedDate);
                        }
                        setShowPicker(false);
                    }}
                />
            )}

            <SettingsField
                label={label}
                value={value}
                onPress={() => setShowPicker(true)}
            />
        </>
    );
};
