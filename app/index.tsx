import { useUserStore } from "@/stores/UserStore";
import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";

export default function Index() {
    const hasHydrated = useUserStore((state) => state.hasHydrated);
    const isLoggedIn = useUserStore((state) => state.isLoggedIn);

    // Show loading while store is hydrating
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

    // Redirect based on authentication state
    if (isLoggedIn) {
        return <Redirect href="/(tabs)/initial" />;
    }

    return <Redirect href="/(login)" />;
}
