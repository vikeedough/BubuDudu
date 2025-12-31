import { Stack } from "expo-router";

export default function SettingsLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="name" options={{ headerShown: false }} />
            <Stack.Screen
                name="date-of-birth"
                options={{ headerShown: false }}
            />
        </Stack>
    );
}
