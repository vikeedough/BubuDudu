import { Stack } from "expo-router";

export default function OnboardingLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="name" options={{ headerShown: false }} />
            <Stack.Screen name="birthday" options={{ headerShown: false }} />
        </Stack>
    );
}
