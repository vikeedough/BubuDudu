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
                name="gallery"
                options={{
                    title: "Gallery",
                }}
            />
            <Stack.Screen
                name="galleryContent"
                options={{
                    title: "Gallery Content",
                }}
            />
        </Stack>
    );
}
