import React, { useMemo, useRef, useState } from "react";
import {
    Animated,
    Easing,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";

import Plus from "@/assets/svgs/plus.svg";
import CustomText from "@/components/CustomText";
import { Colors } from "@/constants/colors";

type ExpenseFloatingAction = {
    key: string;
    label: string;
    shortLabel: string;
    accessibilityLabel: string;
    onPress: () => void;
};

type ExpenseFloatingActionMenuProps = {
    actions: ExpenseFloatingAction[];
};

const ACTION_ITEM_HEIGHT = 40;
const ACTION_GAP = 14;
const ACTION_STACK_MARGIN = 14;
const ACTION_SHADOW_BUFFER = 10;
const EXPAND_DURATION = 150;
const COLLAPSE_DURATION = 150;

function FloatingActionItem({
    action,
    onPress,
}: {
    action: ExpenseFloatingAction;
    onPress: () => void;
}) {
    return (
        <TouchableOpacity
            activeOpacity={0.82}
            accessibilityRole="button"
            accessibilityLabel={action.accessibilityLabel}
            onPress={onPress}
            style={styles.actionItem}
        >
            <CustomText
                weight="semibold"
                style={styles.actionLabel}
                numberOfLines={1}
            >
                {action.label}
            </CustomText>
            <View style={styles.actionBubble}>
                <CustomText weight="extrabold" style={styles.actionBubbleText}>
                    {action.shortLabel}
                </CustomText>
            </View>
        </TouchableOpacity>
    );
}

export default function ExpenseFloatingActionMenu({
    actions,
}: ExpenseFloatingActionMenuProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isStackMounted, setIsStackMounted] = useState(false);
    const expandProgress = useRef(new Animated.Value(0)).current;
    const stackHeight = useMemo(
        () =>
            actions.length * ACTION_ITEM_HEIGHT +
            Math.max(0, actions.length - 1) * ACTION_GAP,
        [actions.length],
    );
    const stackClipHeight = stackHeight + ACTION_SHADOW_BUFFER;

    const expand = () => {
        expandProgress.stopAnimation();
        setIsStackMounted(true);
        setIsExpanded(true);
        Animated.timing(expandProgress, {
            toValue: 1,
            duration: EXPAND_DURATION,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
        }).start();
    };

    const collapse = () => {
        expandProgress.stopAnimation();
        setIsExpanded(false);
        Animated.timing(expandProgress, {
            toValue: 0,
            duration: COLLAPSE_DURATION,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: false,
        }).start(({ finished }) => {
            if (finished) setIsStackMounted(false);
        });
    };

    const stackAnimatedStyle = {
        height: expandProgress.interpolate({
            inputRange: [0, 1],
            outputRange: [0, stackClipHeight],
        }),
        marginBottom: expandProgress.interpolate({
            inputRange: [0, 1],
            outputRange: [
                0,
                Math.max(0, ACTION_STACK_MARGIN - ACTION_SHADOW_BUFFER),
            ],
        }),
        opacity: expandProgress,
    };

    const handleActionPress = (action: ExpenseFloatingAction) => {
        expandProgress.stopAnimation();
        expandProgress.setValue(0);
        setIsExpanded(false);
        setIsStackMounted(false);
        action.onPress();
    };

    const handleToggle = () => {
        if (isExpanded) {
            collapse();
            return;
        }

        expand();
    };

    return (
        <View pointerEvents="box-none" style={styles.container}>
            {isStackMounted ? (
                <Animated.View
                    pointerEvents={isExpanded ? "auto" : "none"}
                    style={[styles.actionStackClip, stackAnimatedStyle]}
                >
                    <View
                        style={[
                            styles.actionStack,
                            {
                                bottom: ACTION_SHADOW_BUFFER,
                                height: stackHeight,
                            },
                        ]}
                    >
                        {actions
                            .slice()
                            .reverse()
                            .map((action) => (
                                <FloatingActionItem
                                    key={action.key}
                                    action={action}
                                    onPress={() => handleActionPress(action)}
                                />
                            ))}
                    </View>
                </Animated.View>
            ) : null}
            <TouchableOpacity
                activeOpacity={0.86}
                accessibilityRole="button"
                accessibilityLabel="Expense actions"
                onPress={handleToggle}
                style={styles.mainButton}
            >
                <View
                    style={[
                        styles.plusIcon,
                        isExpanded && styles.expandedPlusIcon,
                    ]}
                >
                    <Plus />
                </View>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: "absolute",
        right: 22,
        bottom: 120,
        zIndex: 20,
        width: 220,
        alignItems: "flex-end",
    },
    actionStackClip: {
        width: "100%",
        overflow: "hidden",
    },
    actionStack: {
        position: "absolute",
        left: 0,
        right: 0,
        gap: ACTION_GAP,
    },
    mainButton: {
        width: 54,
        height: 54,
        borderRadius: 999,
        backgroundColor: "#FFCC7D",
        alignItems: "center",
        justifyContent: "center",
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.22,
        shadowRadius: 5,
        elevation: 6,
    },
    plusIcon: {
        transform: [{ rotate: "0deg" }],
    },
    expandedPlusIcon: {
        transform: [{ rotate: "45deg" }],
    },
    actionItem: {
        height: ACTION_ITEM_HEIGHT,
        width: "100%",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: 8,
        paddingRight: 9,
    },
    actionLabel: {
        color: Colors.darkGreenText,
        fontSize: 11,
        maxWidth: 112,
        textAlign: "right",
    },
    actionBubble: {
        width: 36,
        height: 36,
        borderRadius: 999,
        backgroundColor: Colors.white,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.14,
        shadowRadius: 4,
        elevation: 4,
    },
    actionBubbleText: {
        color: Colors.brownText,
        fontSize: 16,
    },
});
