import { Stack } from "expo-router";
import React from "react";

export default function ExpenseTabLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
            }}
        >
            <Stack.Screen
                name="expenses"
                options={{
                    title: "Expenses",
                }}
            />
        </Stack>
    );
}
