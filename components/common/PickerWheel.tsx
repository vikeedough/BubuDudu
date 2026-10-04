import React, { useEffect, useMemo, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { Gesture, GestureDetector, ScrollView } from "react-native-gesture-handler";

import CustomText from "@/components/CustomText";

function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
}
const ITEM_H = 30;
const VISIBLE_ROWS = 3;
const WHEEL_H = ITEM_H * VISIBLE_ROWS;
const PAD = ITEM_H;

type WheelProps<T extends string | number> = {
    accessibilityLabel?: string;
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

export default function PickerWheel<T extends string | number>({
    accessibilityLabel,
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
                    {...(accessibilityLabel ? {
                        accessibilityLabel,
                        accessibilityRole: "adjustable" as const,
                        accessibilityValue: { min: 0, max: data.length - 1, now: index, text: renderText ? renderText(value) : String(value) },
                        accessibilityActions: [{ name: "increment" }, { name: "decrement" }],
                        onAccessibilityAction: (event: { nativeEvent: { actionName: string } }) => {
                            const offset = event.nativeEvent.actionName === "increment" ? 1 : -1;
                            onPick(data[clamp(index + offset, 0, data.length - 1)]);
                        },
                    } : {})}
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

const styles = StyleSheet.create({
    wheelContent: { paddingVertical: PAD },
    item: { height: ITEM_H, justifyContent: "center", alignItems: "center" },
    itemText: { fontSize: 14, textAlign: "center" },
});
