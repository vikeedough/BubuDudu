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
        "Raleway-Regular": require("@/assets/fonts/Raleway-Regular.ttf"),
        "Raleway-Medium": require("@/assets/fonts/Raleway-Medium.ttf"),
        "Raleway-SemiBold": require("@/assets/fonts/Raleway-SemiBold.ttf"),
        "Raleway-Bold": require("@/assets/fonts/Raleway-Bold.ttf"),
        "Raleway-ExtraBold": require("@/assets/fonts/Raleway-ExtraBold.ttf"),
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
