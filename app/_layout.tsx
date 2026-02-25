import "react-native-gesture-handler";

import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { ToastRoot } from "@/components/toast/ToastRoot";
import AuthProvider from "@/providers/auth-provider";

export default function RootLayout() {
    const [fontsLoaded] = useFonts({
        "Raleway-Regular": require("@/assets/fonts/Raleway-Regular.ttf"),
        "Raleway-Medium": require("@/assets/fonts/Raleway-Medium.ttf"),
        "Raleway-SemiBold": require("@/assets/fonts/Raleway-SemiBold.ttf"),
        "Raleway-Bold": require("@/assets/fonts/Raleway-Bold.ttf"),
        "Raleway-ExtraBold": require("@/assets/fonts/Raleway-ExtraBold.ttf"),
    });

    if (!fontsLoaded) {
        return (
            <GestureHandlerRootView style={{ flex: 1 }}>
                <View
                    style={{
                        flex: 1,
                        justifyContent: "center",
                        alignItems: "center",
                    }}
                >
                    <ActivityIndicator size="large" />
                </View>
            </GestureHandlerRootView>
        );
    }

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <AuthProvider>
                <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen
                        name="index"
                        options={{ headerShown: false }}
                    />
                    <Stack.Screen
                        name="(login)"
                        options={{ headerShown: false }}
                    />
                    <Stack.Screen
                        name="(tabs)"
                        options={{ headerShown: false }}
                    />
                    <Stack.Screen
                        name="(settings)"
                        options={{ headerShown: false }}
                    />
                </Stack>
                <ToastRoot />
            </AuthProvider>
        </GestureHandlerRootView>
    );
}
