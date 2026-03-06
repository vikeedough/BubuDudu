import React from "react";

import { convertToDisplayDate } from "@/utils/settings";

import { DatePickerField } from "./DatePickerField";

interface DisplayDatePickerFieldProps {
    label: string;
    date: Date;
    displayedDate: string;
    setDate: (date: Date) => void;
    setDisplayedDate: (displayedDate: string) => void;
}

export const DisplayDatePickerField: React.FC<DisplayDatePickerFieldProps> = ({
    label,
    date,
    displayedDate,
    setDate,
    setDisplayedDate,
}) => {
    return (
        <DatePickerField
            label={label}
            value={displayedDate}
            date={date}
            onDateChange={(selectedDate) => {
                setDate(selectedDate);
                setDisplayedDate(convertToDisplayDate(selectedDate));
            }}
        />
    );
};
