import { Stack } from "expo-router";

export default function LoginLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="new-login" options={{ headerShown: false }} />
            <Stack.Screen
                name="create-account"
                options={{ headerShown: false }}
            />
        </Stack>
    );
}
