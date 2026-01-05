import { SplashScreen } from "expo-router";

import { useAuthContext } from "@/hooks/useAuthContext";

export function SplashScreenController() {
    const { isLoading } = useAuthContext();

    if (!isLoading) {
        SplashScreen.hideAsync();
    }

    return null;
}
