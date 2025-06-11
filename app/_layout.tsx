import { useAppBootstrap } from "@/hooks/useAppBootstrap";
import { useUserStore } from "@/stores/UserStore";
import { Stack } from "expo-router";
import { ActivityIndicator, View } from "react-native";

export default function RootLayout() {
    const { loading } = useAppBootstrap();
    const hasHydrated = useUserStore((state) => state.hasHydrated);
    const isLoggedIn = useUserStore((state) => state.isLoggedIn);

    if (!hasHydrated || loading) {
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

    return (
        <Stack>
            {isLoggedIn ? (
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            ) : (
                <Stack.Screen name="login" options={{ headerShown: false }} />
            )}
        </Stack>
    );
}
