import { useUserStore } from "@/stores/UserStore";
import { Stack } from "expo-router";

export default function RootLayout() {
    const isLoggedIn = useUserStore((state) => state.isLoggedIn);

    if (!isLoggedIn) {
        return (
            <Stack>
                <Stack.Screen name="login" options={{ headerShown: false }} />
            </Stack>
        );
    }

    return (
        <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
    );
}
