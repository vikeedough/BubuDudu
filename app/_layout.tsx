import { useUserStore } from "@/stores/UserStore";
import { Stack } from "expo-router";
import { ActivityIndicator, View } from "react-native";

export default function RootLayout() {
    const hasHydrated = useUserStore((state) => state.hasHydrated);
    const isLoggedIn = useUserStore((state) => state.isLoggedIn);

    if (!hasHydrated) {
        return (
            <View
                style={{
                    flex: 1,
                    justifyContent: "center",
                    alignItems: "center",
                }}
            >
                <ActivityIndicator size="large" />
            </View>
        );
    }

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
