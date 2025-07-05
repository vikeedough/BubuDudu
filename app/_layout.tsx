import { useAppBootstrap } from "@/hooks/useAppBootstrap";
import { useUserStore } from "@/stores/UserStore";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { ActivityIndicator, View } from "react-native";

export default function RootLayout() {
    const { loading } = useAppBootstrap();
    const hasHydrated = useUserStore((state) => state.hasHydrated);
    const isLoggedIn = useUserStore((state) => state.isLoggedIn);

    const [fontsLoaded] = useFonts({
        "Baloo2-Regular": require("@/assets/fonts/Baloo2-Regular.ttf"),
        "Baloo2-Medium": require("@/assets/fonts/Baloo2-Medium.ttf"),
        "Baloo2-SemiBold": require("@/assets/fonts/Baloo2-SemiBold.ttf"),
        "Baloo2-Bold": require("@/assets/fonts/Baloo2-Bold.ttf"),
        "Baloo2-ExtraBold": require("@/assets/fonts/Baloo2-ExtraBold.ttf"),
    });

    if (!hasHydrated || loading || !fontsLoaded) {
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
        <Stack screenOptions={{ headerShown: false }}>
            {isLoggedIn ? (
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            ) : (
                <Stack.Screen name="login" options={{ headerShown: false }} />
            )}
        </Stack>
    );
}
