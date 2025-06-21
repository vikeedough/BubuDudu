import { Stack } from "expo-router";
import React from "react";

export default function TabLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
            }}
        >
            <Stack.Screen
                name="lists"
                options={{
                    title: "Lists",
                }}
            />
            <Stack.Screen
                name="listContent"
                options={{
                    title: "List Content",
                }}
            />
        </Stack>
    );
}
