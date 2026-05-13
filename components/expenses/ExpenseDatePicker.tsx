import dayjs from "dayjs";
import React, { useEffect, useMemo, useRef } from "react";
import {
    FlatList,
    NativeScrollEvent,
    NativeSyntheticEvent,
    StyleSheet,
    View,
} from "react-native";

import CustomText from "@/components/CustomText";

const ITEM_H = 34;
const VISIBLE_ROWS = 3;
const WHEEL_H = ITEM_H * VISIBLE_ROWS;
const PAD = ITEM_H;

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
};

function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
}

function getDateIndex(date: Date, startDate: dayjs.Dayjs, totalDays: number) {
    const index = dayjs(date).startOf("day").diff(startDate, "day");
    return clamp(Number.isFinite(index) ? index : 0, 0, totalDays - 1);
}

function getDateFromIndex(startDate: dayjs.Dayjs, index: number) {
    return startDate.add(index, "day");
}

function getDateLabel(date: dayjs.Dayjs) {
    return date.isSame(dayjs(), "day") ? "Today" : date.format("D MMM YYYY");
}

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
}: ExpenseDatePickerProps) {
    const listRef = useRef<FlatList<number>>(null);
    const isMomentumRef = useRef(false);
    const hasMountedRef = useRef(false);
    const finalizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const startDate = useMemo(
        () => dayjs(new Date(minYear, 0, 1)).startOf("day"),
        [minYear],
    );
    const endDate = useMemo(
        () => dayjs(new Date(maxYear, 11, 31)).startOf("day"),
        [maxYear],
    );
    const totalDays = useMemo(
        () => Math.max(1, endDate.diff(startDate, "day") + 1),
        [endDate, startDate],
    );
    const data = useMemo(
        () => Array.from({ length: totalDays }, (_, index) => index),
        [totalDays],
    );
    const selectedIndex = useMemo(
        () => getDateIndex(value, startDate, totalDays),
        [startDate, totalDays, value],
    );

    const clearFinalizeTimer = () => {
        if (!finalizeTimerRef.current) return;
        clearTimeout(finalizeTimerRef.current);
        finalizeTimerRef.current = null;
    };

    useEffect(() => clearFinalizeTimer, []);

    useEffect(() => {
        requestAnimationFrame(() => {
            listRef.current?.scrollToOffset({
                offset: selectedIndex * ITEM_H,
                animated: hasMountedRef.current,
            });
            hasMountedRef.current = true;
        });
    }, [selectedIndex]);

    const settleFromOffsetY = (offsetY: number) => {
        const index = clamp(
            Math.round((offsetY + 0.001) / ITEM_H),
            0,
            totalDays - 1,
        );
        listRef.current?.scrollToOffset({
            offset: index * ITEM_H,
            animated: false,
        });

        const nextDate = getDateFromIndex(startDate, index);
        if (!nextDate.isSame(dayjs(value), "day")) {
            onChange(nextDate.toDate());
        }
    };

    const handleScrollEnd = (
        event: NativeSyntheticEvent<NativeScrollEvent>,
    ) => {
        settleFromOffsetY(event.nativeEvent.contentOffset.y);
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
            <FlatList
                ref={listRef}
                data={data}
                keyExtractor={(item) => String(item)}
                renderItem={({ item }) => {
                    const date = getDateFromIndex(startDate, item);
                    const selected = item === selectedIndex;

                    return (
                        <View style={styles.item}>
                            <CustomText
                                weight={selected ? "extrabold" : "semibold"}
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
                                {getDateLabel(date)}
                            </CustomText>
                        </View>
                    );
                }}
                showsVerticalScrollIndicator={false}
                bounces={false}
                nestedScrollEnabled={nestedScrollEnabled}
                decelerationRate="fast"
                snapToInterval={ITEM_H}
                snapToAlignment="start"
                getItemLayout={(_, index) => ({
                    length: ITEM_H,
                    offset: ITEM_H * index,
                    index,
                })}
                initialScrollIndex={selectedIndex}
                contentContainerStyle={styles.content}
                style={styles.list}
                onMomentumScrollBegin={() => {
                    isMomentumRef.current = true;
                    clearFinalizeTimer();
                }}
                onMomentumScrollEnd={(event) => {
                    isMomentumRef.current = false;
                    handleScrollEnd(event);
                }}
                onScrollEndDrag={(event) => {
                    const velocityY = Math.abs(
                        event.nativeEvent.velocity?.y ?? 0,
                    );

                    if (velocityY < 0.05 && !isMomentumRef.current) {
                        handleScrollEnd(event);
                        return;
                    }

                    clearFinalizeTimer();
                    finalizeTimerRef.current = setTimeout(() => {
                        if (!isMomentumRef.current) {
                            handleScrollEnd(event);
                        }
                        finalizeTimerRef.current = null;
                    }, 45);
                }}
                onScrollToIndexFailed={({ index }) => {
                    requestAnimationFrame(() => {
                        listRef.current?.scrollToOffset({
                            offset: index * ITEM_H,
                            animated: false,
                        });
                    });
                }}
            />
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
    list: {
        height: WHEEL_H,
    },
    content: {
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
