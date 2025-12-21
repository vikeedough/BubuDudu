import FocusedGalleryIcon from "@/assets/svgs/nav-bar/gallery-focused.svg";
import GalleryIcon from "@/assets/svgs/nav-bar/gallery.svg";
import FocusedHomeIcon from "@/assets/svgs/nav-bar/home-focused.svg";
import HomeIcon from "@/assets/svgs/nav-bar/home.svg";
import FocusedListsIcon from "@/assets/svgs/nav-bar/lists-focused.svg";
import ListsIcon from "@/assets/svgs/nav-bar/lists.svg";
import FocusedWheelIcon from "@/assets/svgs/nav-bar/wheel-focused.svg";
import WheelIcon from "@/assets/svgs/nav-bar/wheel.svg";
import { Colors } from "@/constants/colors";
import { Tabs } from "expo-router";
import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet } from "react-native";

interface AnimatedTabIconProps {
    focused: boolean;
    children: React.ReactNode;
}

function AnimatedTabIcon({ focused, children }: AnimatedTabIconProps) {
    const scaleValue = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (focused) {
            // More pronounced pop animation with bounce effect
            Animated.sequence([
                Animated.timing(scaleValue, {
                    toValue: 1.6,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.timing(scaleValue, {
                    toValue: 0.9,
                    duration: 100,
                    useNativeDriver: true,
                }),
                Animated.timing(scaleValue, {
                    toValue: 1,
                    duration: 100,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [focused, scaleValue]);

    if (focused) {
        return (
            <Animated.View
                style={[
                    styles.focusedIcon,
                    { transform: [{ scale: scaleValue }] },
                ]}
            >
                {children}
            </Animated.View>
        );
    }

    return <>{children}</>;
}

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: Colors.lightBlue,
                tabBarInactiveTintColor: Colors.black,
                headerShown: false,
                tabBarShowLabel: false,
                tabBarStyle: styles.tabBar,
                tabBarItemStyle: styles.tabBarItem,
            }}
        >
            <Tabs.Screen
                name="initial"
                options={{
                    title: "Home",
                    tabBarIcon: ({ focused }) => (
                        <AnimatedTabIcon focused={focused}>
                            {focused ? <FocusedHomeIcon /> : <HomeIcon />}
                        </AnimatedTabIcon>
                    ),
                }}
            />
            <Tabs.Screen
                name="(gallery)"
                options={{
                    title: "Gallery",
                    tabBarIcon: ({ focused }) => (
                        <AnimatedTabIcon focused={focused}>
                            {focused ? <FocusedGalleryIcon /> : <GalleryIcon />}
                        </AnimatedTabIcon>
                    ),
                }}
            />
            <Tabs.Screen
                name="(lists)"
                options={{
                    title: "Lists",
                    tabBarIcon: ({ focused }) => (
                        <AnimatedTabIcon focused={focused}>
                            {focused ? <FocusedListsIcon /> : <ListsIcon />}
                        </AnimatedTabIcon>
                    ),
                }}
            />
            <Tabs.Screen
                name="(wheel)"
                options={{
                    title: "Wheel",
                    tabBarIcon: ({ focused }) => (
                        <AnimatedTabIcon focused={focused}>
                            {focused ? <FocusedWheelIcon /> : <WheelIcon />}
                        </AnimatedTabIcon>
                    ),
                }}
            />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    tabBar: {
        position: "absolute",
        backgroundColor: Colors.green,
        shadowColor: "#000",
        borderTopLeftRadius: 60,
        borderTopRightRadius: 60,
        borderBottomLeftRadius: 60,
        borderBottomRightRadius: 60,
        bottom: 35,
        height: 51,
        alignSelf: "center",
        marginHorizontal: 30,
    },
    tabBarItem: {
        marginTop: 5,
        paddingHorizontal: 5,
        flex: 1,
    },
    focusedIcon: {
        backgroundColor: "#FFFFFF40",
        height: 42,
        width: 42,
        borderRadius: 999,
        alignItems: "center",
        justifyContent: "center",
    },
});
