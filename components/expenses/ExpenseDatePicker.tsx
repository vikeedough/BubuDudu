import React, { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import {
    Gesture,
    GestureDetector,
    ScrollView,
} from "react-native-gesture-handler";

import CustomText from "@/components/CustomText";

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

function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
}

function isToday(year: number, month: number, day: number) {
    const today = new Date();
    return (
        year === today.getFullYear() &&
        month === today.getMonth() &&
        day === today.getDate()
    );
}

const ITEM_H = 30;
const VISIBLE_ROWS = 3;
const WHEEL_H = ITEM_H * VISIBLE_ROWS;
const PAD = ITEM_H;

type WheelProps<T extends string | number> = {
    data: T[];
    value: T;
    onPick: (value: T) => void;
    width: number;
    renderText?: (value: T) => string;
    textColor: string;
    dimTextColor: string;
    nestedScrollEnabled?: boolean;
    onInteractionStart?: () => void;
    onInteractionEnd?: () => void;
    parentScrollRef?: React.RefObject<any>;
};

function Wheel<T extends string | number>({
    data,
    value,
    onPick,
    width,
    renderText,
    textColor,
    dimTextColor,
    nestedScrollEnabled,
    onInteractionStart,
    onInteractionEnd,
    parentScrollRef,
}: WheelProps<T>) {
    const ref = useRef<ScrollView>(null);
    const inGestureRef = useRef(false);
    const isDraggingRef = useRef(false);
    const isMomentumRef = useRef(false);
    const hasMountedRef = useRef(false);
    const finalizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const touchEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const onInteractionStartRef = useRef(onInteractionStart);
    const onInteractionEndRef = useRef(onInteractionEnd);

    const nativeGesture = useMemo(() => {
        const gesture = Gesture.Native();
        if (parentScrollRef) {
            gesture.simultaneousWithExternalGesture(parentScrollRef);
        }
        return gesture;
    }, [parentScrollRef]);

    const index = useMemo(() => {
        const found = data.findIndex((item) => item === value);
        return found < 0 ? 0 : found;
    }, [data, value]);

    useEffect(() => {
        if (!isDraggingRef.current && !isMomentumRef.current) {
            ref.current?.scrollTo({
                y: index * ITEM_H,
                animated: hasMountedRef.current,
            });
        }
        hasMountedRef.current = true;
    }, [index]);

    useEffect(() => {
        onInteractionStartRef.current = onInteractionStart;
        onInteractionEndRef.current = onInteractionEnd;
    }, [onInteractionEnd, onInteractionStart]);

    const clearFinalizeTimer = () => {
        if (!finalizeTimerRef.current) return;
        clearTimeout(finalizeTimerRef.current);
        finalizeTimerRef.current = null;
    };

    const clearTouchEndTimer = () => {
        if (!touchEndTimerRef.current) return;
        clearTimeout(touchEndTimerRef.current);
        touchEndTimerRef.current = null;
    };

    const beginInteraction = () => {
        clearTouchEndTimer();
        if (inGestureRef.current) return;
        inGestureRef.current = true;
        onInteractionStartRef.current?.();
    };

    const endInteraction = () => {
        if (!inGestureRef.current) return;
        inGestureRef.current = false;
        onInteractionEndRef.current?.();
    };

    const queueTouchEnd = () => {
        clearTouchEndTimer();
        touchEndTimerRef.current = setTimeout(() => {
            if (!isDraggingRef.current && !isMomentumRef.current) {
                endInteraction();
            }
            touchEndTimerRef.current = null;
        }, 80);
    };

    useEffect(
        () => () => {
            if (finalizeTimerRef.current) {
                clearTimeout(finalizeTimerRef.current);
                finalizeTimerRef.current = null;
            }
            if (touchEndTimerRef.current) {
                clearTimeout(touchEndTimerRef.current);
                touchEndTimerRef.current = null;
            }
            if (inGestureRef.current) {
                inGestureRef.current = false;
                onInteractionEndRef.current?.();
            }
        },
        [],
    );

    const settleFromOffsetY = (offsetY: number) => {
        const nextIndex = clamp(
            Math.round((offsetY + 0.001) / ITEM_H),
            0,
            data.length - 1,
        );
        ref.current?.scrollTo({ y: nextIndex * ITEM_H, animated: false });
        const nextValue = data[nextIndex];
        if (nextValue !== value) onPick(nextValue);
    };

    return (
        <GestureDetector gesture={nativeGesture}>
            <View style={{ width, height: WHEEL_H, alignItems: "center" }}>
                <ScrollView
                    ref={ref}
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                    decelerationRate="fast"
                    snapToInterval={ITEM_H}
                    snapToAlignment="start"
                    contentContainerStyle={styles.wheelContent}
                    nestedScrollEnabled={nestedScrollEnabled}
                    simultaneousHandlers={parentScrollRef}
                    onTouchStart={beginInteraction}
                    onTouchEnd={queueTouchEnd}
                    onTouchCancel={queueTouchEnd}
                    onScrollBeginDrag={() => {
                        isDraggingRef.current = true;
                        beginInteraction();
                    }}
                    onMomentumScrollBegin={() => {
                        isMomentumRef.current = true;
                        clearFinalizeTimer();
                        clearTouchEndTimer();
                    }}
                    onMomentumScrollEnd={(event) => {
                        isMomentumRef.current = false;
                        settleFromOffsetY(event.nativeEvent.contentOffset.y);
                        endInteraction();
                    }}
                    onScrollEndDrag={(event) => {
                        isDraggingRef.current = false;
                        const offsetY = event.nativeEvent.contentOffset.y;
                        const velocityY = Math.abs(
                            event.nativeEvent.velocity?.y ?? 0,
                        );

                        if (velocityY < 0.05 && !isMomentumRef.current) {
                            settleFromOffsetY(offsetY);
                            endInteraction();
                            return;
                        }

                        clearFinalizeTimer();
                        finalizeTimerRef.current = setTimeout(() => {
                            if (!isMomentumRef.current) {
                                settleFromOffsetY(offsetY);
                                endInteraction();
                            }
                            finalizeTimerRef.current = null;
                        }, 45);
                    }}
                >
                    {data.map((item, itemIndex) => {
                        const selected = item === value;
                        return (
                            <View key={String(itemIndex)} style={styles.item}>
                                <CustomText
                                    weight="extrabold"
                                    style={[
                                        styles.itemText,
                                        {
                                            color: selected
                                                ? textColor
                                                : dimTextColor,
                                        },
                                    ]}
                                    numberOfLines={1}
                                >
                                    {renderText
                                        ? renderText(item)
                                        : String(item)}
                                </CustomText>
                            </View>
                        );
                    })}
                </ScrollView>
            </View>
        </GestureDetector>
    );
}

type ExpenseDatePickerProps = {
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
                <Wheel
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
                    width={86}
                    textColor={textColor}
                    dimTextColor={dimTextColor}
                    nestedScrollEnabled={nestedScrollEnabled}
                    onInteractionStart={onInteractionStart}
                    onInteractionEnd={onInteractionEnd}
                    parentScrollRef={parentScrollRef}
                />

                <Wheel
                    data={days}
                    value={day}
                    onPick={(pickedDay) => {
                        setDay(pickedDay);
                        commit(year, month, pickedDay);
                    }}
                    width={92}
                    renderText={(pickedDay) =>
                        isToday(year, month, pickedDay)
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

                <Wheel
                    data={years}
                    value={year}
                    onPick={(pickedYear) => {
                        setYear(pickedYear);
                        const totalDays = daysInMonth(pickedYear, month);
                        const nextDay = Math.min(day, totalDays);
                        if (nextDay !== day) setDay(nextDay);
                        commit(pickedYear, month, nextDay);
                    }}
                    width={90}
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
    wheelContent: {
        paddingVertical: PAD,
    },
    item: {
        height: ITEM_H,
        justifyContent: "center",
        alignItems: "center",
    },
    itemText: {
        fontSize: 14,
        textAlign: "center",
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
