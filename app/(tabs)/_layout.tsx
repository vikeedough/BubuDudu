import { Tabs } from "expo-router";
import React, { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import FocusedGalleryIcon from "@/assets/svgs/nav-bar/gallery-focused.svg";
import GalleryIcon from "@/assets/svgs/nav-bar/gallery.svg";
import FocusedHomeIcon from "@/assets/svgs/nav-bar/home-focused.svg";
import HomeIcon from "@/assets/svgs/nav-bar/home.svg";
import FocusedListsIcon from "@/assets/svgs/nav-bar/lists-focused.svg";
import ListsIcon from "@/assets/svgs/nav-bar/lists.svg";
import FocusedWheelIcon from "@/assets/svgs/nav-bar/wheel-focused.svg";
import WheelIcon from "@/assets/svgs/nav-bar/wheel.svg";
import { Colors } from "@/constants/colors";

import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

type TabRouteName = "initial" | "(gallery)" | "(lists)" | "(wheel)";

interface AnimatedTabIconProps {
    focused: boolean;
    children: React.ReactNode;
}

const TAB_CONFIG: Record<
    TabRouteName,
    {
        label: string;
        ActiveIcon: React.ComponentType;
        InactiveIcon: React.ComponentType;
    }
> = {
    initial: {
        label: "Home",
        ActiveIcon: FocusedHomeIcon,
        InactiveIcon: HomeIcon,
    },
    "(gallery)": {
        label: "Gallery",
        ActiveIcon: FocusedGalleryIcon,
        InactiveIcon: GalleryIcon,
    },
    "(lists)": {
        label: "Lists",
        ActiveIcon: FocusedListsIcon,
        InactiveIcon: ListsIcon,
    },
    "(wheel)": {
        label: "Wheel",
        ActiveIcon: FocusedWheelIcon,
        InactiveIcon: WheelIcon,
    },
};

const TAB_BAR_BASE_BOTTOM_OFFSET = 5;

function isTabRouteName(name: string): name is TabRouteName {
    return name in TAB_CONFIG;
}

function AnimatedTabIcon({ focused, children }: AnimatedTabIconProps) {
    const scaleValue = useRef(new Animated.Value(1)).current;
    const backgroundOpacity = useRef(
        new Animated.Value(focused ? 1 : 0),
    ).current;

    useEffect(() => {
        if (focused) {
            scaleValue.setValue(0.8);
            backgroundOpacity.setValue(0);

            Animated.parallel([
                Animated.sequence([
                    Animated.spring(scaleValue, {
                        toValue: 1.14,
                        tension: 170,
                        friction: 6,
                        useNativeDriver: true,
                    }),
                    Animated.spring(scaleValue, {
                        toValue: 1,
                        tension: 180,
                        friction: 8,
                        useNativeDriver: true,
                    }),
                ]),
                Animated.timing(backgroundOpacity, {
                    toValue: 1,
                    duration: 180,
                    useNativeDriver: true,
                }),
            ]).start();
            return;
        }

        Animated.parallel([
            Animated.timing(scaleValue, {
                toValue: 1,
                duration: 140,
                useNativeDriver: true,
            }),
            Animated.timing(backgroundOpacity, {
                toValue: 0,
                duration: 140,
                useNativeDriver: true,
            }),
        ]).start();
    }, [focused, scaleValue, backgroundOpacity]);

    return (
        <Animated.View
            style={[styles.iconWrapper, { transform: [{ scale: scaleValue }] }]}
        >
            <Animated.View
                pointerEvents="none"
                style={[
                    styles.focusedIconBackground,
                    { opacity: backgroundOpacity },
                ]}
            />
            {children}
        </Animated.View>
    );
}

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
    const insets = useSafeAreaInsets();
    const bottomOffset = TAB_BAR_BASE_BOTTOM_OFFSET + insets.bottom;

    return (
        <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
            <View style={[styles.tabBar, { bottom: bottomOffset }]}>
                {state.routes.map((route, index) => {
                    if (!isTabRouteName(route.name)) {
                        return null;
                    }

                    const isFocused = state.index === index;
                    const { ActiveIcon, InactiveIcon, label } =
                        TAB_CONFIG[route.name];
                    const options = descriptors[route.key]?.options;

                    const onPress = () => {
                        const event = navigation.emit({
                            type: "tabPress",
                            target: route.key,
                            canPreventDefault: true,
                        });

                        if (!isFocused && !event.defaultPrevented) {
                            navigation.navigate(route.name, route.params);
                        }
                    };

                    const onLongPress = () => {
                        navigation.emit({
                            type: "tabLongPress",
                            target: route.key,
                        });
                    };

                    return (
                        <Pressable
                            key={route.key}
                            accessibilityLabel={
                                options?.tabBarAccessibilityLabel ?? label
                            }
                            accessibilityRole="button"
                            accessibilityState={
                                isFocused ? { selected: true } : {}
                            }
                            onLongPress={onLongPress}
                            onPress={onPress}
                            style={({ pressed }) => [
                                styles.tabButton,
                                pressed ? styles.tabButtonPressed : null,
                            ]}
                            testID={options?.tabBarButtonTestID}
                        >
                            <AnimatedTabIcon focused={isFocused}>
                                {isFocused ? <ActiveIcon /> : <InactiveIcon />}
                            </AnimatedTabIcon>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
}

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={{ headerShown: false }}
            tabBar={(props) => <CustomTabBar {...props} />}
        >
            <Tabs.Screen
                name="initial"
                options={{ title: TAB_CONFIG.initial.label }}
            />
            <Tabs.Screen
                name="(gallery)"
                options={{ title: TAB_CONFIG["(gallery)"].label }}
            />
            <Tabs.Screen
                name="(lists)"
                options={{ title: TAB_CONFIG["(lists)"].label }}
            />
            <Tabs.Screen
                name="(wheel)"
                options={{ title: TAB_CONFIG["(wheel)"].label }}
            />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    tabBar: {
        position: "absolute",
        left: 20,
        right: 20,
        height: 50,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: Colors.green,
        borderRadius: 60,
        shadowColor: "#000",
    },
    tabButton: {
        flex: 1,
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
    },
    tabButtonPressed: {
        opacity: 0.85,
    },
    iconWrapper: {
        height: 42,
        width: 42,
        alignItems: "center",
        justifyContent: "center",
    },
    focusedIconBackground: {
        position: "absolute",
        height: 42,
        width: 42,
        borderRadius: 999,
        backgroundColor: "#FFFFFF40",
    },
});
