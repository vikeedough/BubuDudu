import { Tabs } from "expo-router";
import React from "react";

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: "Home",
                }}
            />
            <Tabs.Screen
                name="gallery"
                options={{
                    title: "Gallery",
                }}
            />
            <Tabs.Screen
                name="lists"
                options={{
                    title: "Lists",
                }}
            />
            <Tabs.Screen
                name="wheel"
                options={{
                    title: "Wheel",
                }}
            />
        </Tabs>
    );
}
