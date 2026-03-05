// components/InlineWheelDatePicker.tsx
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
    const m = monthIndex0 + 1;
    if (m === 2) return isLeapYear(year) ? 29 : 28;
    if ([4, 6, 9, 11].includes(m)) return 30;
    return 31;
}
function clamp(n: number, lo: number, hi: number) {
    return Math.max(lo, Math.min(hi, n));
}
function dateOnly(d: Date) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

const ITEM_H = 44;
const VISIBLE_ROWS = 3;
const WHEEL_H = ITEM_H * VISIBLE_ROWS;
const PAD = ITEM_H;

type WheelProps<T extends string | number> = {
    data: T[];
    value: T;
    onPick: (v: T) => void;
    width: number;
    renderText?: (v: T) => string;
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

    const nativeGesture = useMemo(() => {
        const g = Gesture.Native();
        if (parentScrollRef) g.simultaneousWithExternalGesture(parentScrollRef);
        return g;
    }, [parentScrollRef]);

    const index = useMemo(() => {
        const i = data.findIndex((x) => x === value);
        return i < 0 ? 0 : i;
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

    const begin = () => {
        if (inGestureRef.current) return;
        inGestureRef.current = true;
        onInteractionStart?.();
    };

    const end = () => {
        if (!inGestureRef.current) return;
        inGestureRef.current = false;
        onInteractionEnd?.();
    };

    const settleFromOffsetY = (y: number) => {
        const i = clamp(Math.round((y + 0.001) / ITEM_H), 0, data.length - 1);
        ref.current?.scrollTo({ y: i * ITEM_H, animated: false });
        const v = data[i];
        if (v !== value) onPick(v);
    };

    const clearFinalizeTimer = () => {
        if (finalizeTimerRef.current) {
            clearTimeout(finalizeTimerRef.current);
            finalizeTimerRef.current = null;
        }
    };

    useEffect(() => clearFinalizeTimer, []);

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
                    contentContainerStyle={{ paddingVertical: PAD }}
                    nestedScrollEnabled={nestedScrollEnabled}
                    simultaneousHandlers={parentScrollRef}
                    onScrollBeginDrag={() => {
                        isDraggingRef.current = true;
                        begin();
                    }}
                    onMomentumScrollBegin={() => {
                        isMomentumRef.current = true;
                        clearFinalizeTimer();
                    }}
                    onTouchStart={begin}
                    onMomentumScrollEnd={(e) => {
                        isMomentumRef.current = false;
                        const y = e.nativeEvent.contentOffset.y;
                        settleFromOffsetY(y);
                        end();
                    }}
                    onScrollEndDrag={(e) => {
                        isDraggingRef.current = false;
                        const y = e.nativeEvent.contentOffset.y;
                        const velocityY = Math.abs(
                            e.nativeEvent.velocity?.y ?? 0,
                        );

                        // Prevent committing while momentum is about to start.
                        if (velocityY < 0.05 && !isMomentumRef.current) {
                            settleFromOffsetY(y);
                            end();
                            return;
                        }

                        clearFinalizeTimer();
                        finalizeTimerRef.current = setTimeout(() => {
                            if (!isMomentumRef.current) {
                                settleFromOffsetY(y);
                                end();
                            }
                            finalizeTimerRef.current = null;
                        }, 45);
                    }}
                >
                    {data.map((item, i) => {
                        const selected = item === value;
                        return (
                            <View
                                key={String(i)}
                                style={{
                                    height: ITEM_H,
                                    justifyContent: "center",
                                    alignItems: "center",
                                }}
                            >
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

export type InlineWheelDatePickerProps = {
    value: Date;
    onChange: (d: Date) => void;
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

export default function InlineWheelDatePicker({
    value,
    onChange,
    minYear = 1900,
    maxYear = new Date().getFullYear() + 20,
    textColor = "#4C5A45",
    dimTextColor = "rgba(76,90,69,0.28)",
    cardColor = "#FFFFFF",
    highlightColor = "#EEF0EB",
    nestedScrollEnabled = true,
    onInteractionStart,
    onInteractionEnd,
    parentScrollRef,
}: InlineWheelDatePickerProps) {
    const v = useMemo(() => dateOnly(value), [value]);

    const [month, setMonth] = useState<number>(v.getMonth());
    const [year, setYear] = useState<number>(v.getFullYear());
    const [day, setDay] = useState<number>(v.getDate());

    // sync internal state only when parent value actually changes
    useEffect(() => {
        setMonth(v.getMonth());
        setYear(v.getFullYear());
        setDay(v.getDate());
    }, [v]);

    const years = useMemo(() => {
        const arr: number[] = [];
        for (let y = minYear; y <= maxYear; y++) arr.push(y);
        return arr;
    }, [minYear, maxYear]);

    const days = useMemo(() => {
        const dim = daysInMonth(year, month);
        const arr: number[] = [];
        for (let d = 1; d <= dim; d++) arr.push(d);
        return arr;
    }, [year, month]);

    // clamp day if month/year changes
    useEffect(() => {
        const dim = daysInMonth(year, month);
        if (day > dim) setDay(dim);
    }, [day, year, month]);

    const commit = (nextYear: number, nextMonth: number, nextDay: number) => {
        const d = new Date(nextYear, nextMonth, nextDay);
        onChange(d);
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
                    onPick={(m) => {
                        const nextMonth = MONTHS.indexOf(m);
                        setMonth(nextMonth);
                        const dim = daysInMonth(year, nextMonth);
                        const nextDay = Math.min(day, dim);
                        if (nextDay !== day) setDay(nextDay);
                        commit(year, nextMonth, nextDay);
                    }}
                    width={92}
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
                    onPick={(d) => {
                        setDay(d);
                        commit(year, month, d);
                    }}
                    width={70}
                    renderText={(d) => String(d).padStart(2, "0")}
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
                    onPick={(y) => {
                        setYear(y);
                        const dim = daysInMonth(y, month);
                        const nextDay = Math.min(day, dim);
                        if (nextDay !== day) setDay(nextDay);
                        commit(y, month, nextDay);
                    }}
                    width={96}
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
        gap: 14,
    },
    highlightPill: {
        position: "absolute",
        left: 10,
        right: 10,
        top: 10 + ITEM_H,
        height: ITEM_H,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.65)",
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
    itemText: {
        fontSize: 16,
    },
});
