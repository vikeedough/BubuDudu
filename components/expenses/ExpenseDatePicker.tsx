import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import PickerWheel from "@/components/common/PickerWheel";

const MONTHS = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
];

function isLeapYear(year: number) {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function daysInMonth(year: number, monthIndex0: number) {
    const month = monthIndex0 + 1;
    if (month === 2) return isLeapYear(year) ? 29 : 28;
    if ([4, 6, 9, 11].includes(month)) return 30;
    return 31;
}

function isToday(year: number, month: number, day: number, today = new Date()) {
    return (
        year === today.getFullYear() &&
        month === today.getMonth() &&
        day === today.getDate()
    );
}

const ITEM_H = 30;

type ExpenseDatePickerProps = {
    compact?: boolean;
    today?: Date;
    value: Date;
    onChange: (date: Date) => void;
    minYear?: number;
    maxYear?: number;
    textColor?: string;
    dimTextColor?: string;
    cardColor?: string;
    highlightColor?: string;
    nestedScrollEnabled?: boolean;
    onInteractionStart?: () => void;
    onInteractionEnd?: () => void;
    parentScrollRef?: React.RefObject<any>;
};

export default function ExpenseDatePicker({
    compact = false,
    today,
    value,
    onChange,
    minYear = 1900,
    maxYear = new Date().getFullYear() + 1,
    textColor = "#4C5A45",
    dimTextColor = "rgba(76,90,69,0.28)",
    cardColor = "#FFFFFF",
    highlightColor = "#EEF0EB",
    nestedScrollEnabled = true,
    onInteractionStart,
    onInteractionEnd,
    parentScrollRef,
}: ExpenseDatePickerProps) {
    const selectedValue = useMemo(
        () => (Number.isNaN(value.getTime()) ? new Date() : value),
        [value],
    );
    const [month, setMonth] = useState(selectedValue.getMonth());
    const [year, setYear] = useState(selectedValue.getFullYear());
    const [day, setDay] = useState(selectedValue.getDate());

    useEffect(() => {
        setMonth(selectedValue.getMonth());
        setYear(selectedValue.getFullYear());
        setDay(selectedValue.getDate());
    }, [selectedValue]);

    const years = useMemo(() => {
        const startYear = Math.min(minYear, selectedValue.getFullYear());
        const endYear = Math.max(maxYear, selectedValue.getFullYear());
        const items: number[] = [];
        for (let itemYear = startYear; itemYear <= endYear; itemYear += 1) {
            items.push(itemYear);
        }
        return items;
    }, [maxYear, minYear, selectedValue]);

    const days = useMemo(() => {
        const totalDays = daysInMonth(year, month);
        const items: number[] = [];
        for (let itemDay = 1; itemDay <= totalDays; itemDay += 1) {
            items.push(itemDay);
        }
        return items;
    }, [month, year]);

    useEffect(() => {
        const totalDays = daysInMonth(year, month);
        if (day > totalDays) setDay(totalDays);
    }, [day, month, year]);

    const commit = (
        nextYear: number,
        nextMonth: number,
        nextDay: number,
    ) => {
        onChange(new Date(nextYear, nextMonth, nextDay));
    };

    return (
        <View style={[styles.card, { backgroundColor: cardColor }]}>
            <View pointerEvents="none" style={styles.highlightShadow} />
            <View
                pointerEvents="none"
                style={[
                    styles.highlightPill,
                    { backgroundColor: highlightColor },
                ]}
            />
            <View style={styles.columns}>
                <PickerWheel
                    data={MONTHS}
                    value={MONTHS[month]}
                    onPick={(pickedMonth) => {
                        const nextMonth = MONTHS.indexOf(pickedMonth);
                        setMonth(nextMonth);
                        const totalDays = daysInMonth(year, nextMonth);
                        const nextDay = Math.min(day, totalDays);
                        if (nextDay !== day) setDay(nextDay);
                        commit(year, nextMonth, nextDay);
                    }}
                    width={compact ? 70 : 86}
                    textColor={textColor}
                    dimTextColor={dimTextColor}
                    nestedScrollEnabled={nestedScrollEnabled}
                    onInteractionStart={onInteractionStart}
                    onInteractionEnd={onInteractionEnd}
                    parentScrollRef={parentScrollRef}
                />

                <PickerWheel
                    data={days}
                    value={day}
                    onPick={(pickedDay) => {
                        setDay(pickedDay);
                        commit(year, month, pickedDay);
                    }}
                    width={compact ? 74 : 92}
                    renderText={(pickedDay) =>
                        isToday(year, month, pickedDay, today)
                            ? "Today"
                            : String(pickedDay).padStart(2, "0")
                    }
                    textColor={textColor}
                    dimTextColor={dimTextColor}
                    nestedScrollEnabled={nestedScrollEnabled}
                    onInteractionStart={onInteractionStart}
                    onInteractionEnd={onInteractionEnd}
                    parentScrollRef={parentScrollRef}
                />

                <PickerWheel
                    data={years}
                    value={year}
                    onPick={(pickedYear) => {
                        setYear(pickedYear);
                        const totalDays = daysInMonth(pickedYear, month);
                        const nextDay = Math.min(day, totalDays);
                        if (nextDay !== day) setDay(nextDay);
                        commit(pickedYear, month, nextDay);
                    }}
                    width={compact ? 72 : 90}
                    textColor={textColor}
                    dimTextColor={dimTextColor}
                    nestedScrollEnabled={nestedScrollEnabled}
                    onInteractionStart={onInteractionStart}
                    onInteractionEnd={onInteractionEnd}
                    parentScrollRef={parentScrollRef}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        width: "100%",
        borderRadius: 10,
        paddingVertical: 10,
        paddingHorizontal: 10,
        borderWidth: 1,
        borderColor: "#EBEAEC",
        overflow: "hidden",
    },
    columns: {
        flexDirection: "row",
        justifyContent: "center",
        gap: 10,
    },
    highlightPill: {
        position: "absolute",
        left: 10,
        right: 10,
        top: 10 + ITEM_H,
        height: ITEM_H,
        borderRadius: 10,
    },
    highlightShadow: {
        position: "absolute",
        left: 12,
        right: 12,
        top: 10 + ITEM_H + 2,
        height: ITEM_H,
        borderRadius: 10,
        backgroundColor: "rgba(0,0,0,0.12)",
    },
});
