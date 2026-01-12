import { useToastStore } from "@/stores/ToastStore";
import type { ToastId } from "@/toast/types";
import React, { useMemo } from "react";
import { Platform, StyleSheet, View } from "react-native";
import Animated, { LinearTransition } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ToastItem } from "./ToastItem";

export const ToastViewport: React.FC = () => {
    const insets = useSafeAreaInsets();

    const order = useToastStore((s) => s.order);
    const byId = useToastStore((s) => s.byId);

    const toasts = useMemo(() => {
        return order.map((id: ToastId) => byId[id]).filter(Boolean);
    }, [order, byId]);

    return (
        <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
            <View
                pointerEvents="box-none"
                style={[styles.container, { paddingTop: insets.top + 8 }]}
            >
                {toasts.map((t) => (
                    <Animated.View
                        key={t.id}
                        layout={LinearTransition.springify()
                            .damping(18)
                            .stiffness(220)}
                        style={styles.itemWrapper}
                        pointerEvents="box-none"
                    >
                        <ToastItem toast={t} />
                    </Animated.View>
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 12,
        zIndex: 9999,
        elevation: Platform.OS === "android" ? 9999 : undefined,
        gap: 10,
    },
    itemWrapper: {
        alignSelf: "stretch",
    },
});
