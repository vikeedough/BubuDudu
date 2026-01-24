// components/toast/ToastItem.tsx
import { Colors } from "@/constants/colors";
import React, { useEffect, useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
    Easing,
    FadeInDown,
    FadeOutUp,
    interpolate,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from "react-native-reanimated";
import { toast } from "../../toast/api";
import type { Toast as ToastModel } from "../../toast/types";
import CustomText from "../CustomText";

type Props = { toast: ToastModel };

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export const ToastItem: React.FC<Props> = ({ toast: t }) => {
    const { id, payload } = t;

    const translateY = useSharedValue(0);
    const dismissing = useSharedValue(0);
    const timerProgress = useSharedValue(1);

    const hasDeterminate = typeof payload.progress === "number";
    const showDeterminateBar = hasDeterminate; // keep upload progress bar
    // const showTimerBar = false; // disabled UI for timer-based dismissal
    const durationMs = payload.durationMs ?? null;
    const persistent = payload.persistent === true || durationMs == null;

    const startTimer = useMemo(() => {
        return () => {
            if (durationMs == null) return;
            if (payload.persistent === true) return;

            timerProgress.value = 1;
            timerProgress.value = withTiming(
                0,
                { duration: durationMs, easing: Easing.linear },
                (finished) => {
                    if (finished) runOnJS(toast.dismiss)(id);
                },
            );
        };
    }, [id, durationMs, payload.persistent, timerProgress]);

    useEffect(() => {
        startTimer();
    }, [startTimer]);

    const onDismiss = () => toast.dismiss(id);

    const pan = Gesture.Pan()
        .onUpdate((e) => {
            const y = Math.min(0, e.translationY);
            translateY.value = y;
            dismissing.value = clamp01(Math.abs(y) / 80);
        })
        .onEnd((e) => {
            const y = Math.min(0, e.translationY);
            const shouldDismiss = y < -60 || e.velocityY < -900;

            if (shouldDismiss) {
                translateY.value = withTiming(
                    -120,
                    { duration: 140 },
                    (finished) => {
                        if (finished) runOnJS(toast.dismiss)(id);
                    },
                );
            } else {
                translateY.value = withSpring(0, {
                    damping: 18,
                    stiffness: 260,
                });
                dismissing.value = withTiming(0, { duration: 120 });
            }
        });

    const containerStyle = useAnimatedStyle(() => {
        const opacity = interpolate(dismissing.value, [0, 1], [1, 0.7]);
        return { transform: [{ translateY: translateY.value }], opacity };
    });

    const determinateValue = hasDeterminate
        ? clamp01(payload.progress as number)
        : null;

    return (
        <GestureDetector gesture={pan}>
            <Animated.View
                entering={FadeInDown.duration(180)}
                exiting={FadeOutUp.duration(160)}
                style={[styles.card, containerStyle]}
            >
                <View style={styles.headerRow}>
                    <View style={styles.textCol}>
                        {!!payload.title && (
                            <CustomText weight="bold" style={styles.title}>
                                {payload.title}
                            </CustomText>
                        )}
                        {!!payload.message && (
                            <CustomText
                                weight="semibold"
                                style={styles.message}
                            >
                                {payload.message}
                            </CustomText>
                        )}
                    </View>

                    <Pressable
                        onPress={onDismiss}
                        hitSlop={10}
                        style={styles.closeBtn}
                    >
                        <CustomText weight="bold" style={styles.closeText}>
                            ×
                        </CustomText>
                    </Pressable>
                </View>

                {showDeterminateBar && (
                    <View style={styles.progressTrack}>
                        <Animated.View
                            style={[
                                styles.progressFill,
                                { width: `${(determinateValue ?? 0) * 100}%` },
                            ]}
                        />
                    </View>
                )}
            </Animated.View>
        </GestureDetector>
    );
};

const styles = StyleSheet.create({
    card: {
        alignSelf: "stretch",
        borderRadius: 14,
        paddingVertical: 12,
        paddingHorizontal: 12,
        backgroundColor: Colors.yellow,
    },
    headerRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
    textCol: { flex: 1, minWidth: 0 },
    title: { color: Colors.brownText, fontSize: 15 },
    message: {
        marginTop: 4,
        color: Colors.brownText,
        fontSize: 13,
        lineHeight: 18,
    },
    closeBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(255,255,255,0.10)",
    },
    closeText: {
        color: Colors.brownText,
        fontSize: 18,
        lineHeight: 20,
        marginTop: -1,
    },
    progressTrack: {
        marginTop: 10,
        height: 4,
        borderRadius: 99,
        overflow: "hidden",
        backgroundColor: "rgba(255,255,255,0.14)",
    },
    progressFill: {
        height: "100%",
        borderRadius: 99,
        backgroundColor: "rgba(255,255,255,0.85)",
    },
});
