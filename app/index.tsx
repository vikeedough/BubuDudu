import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator } from "react-native";

import { useAuthContext } from "@/hooks/useAuthContext";
import { getSpaceId } from "@/utils/secure-store";

export default function Index() {
    const { isLoading, isLoggedIn } = useAuthContext();
    const [checkingSpace, setCheckingSpace] = useState(true);
    const [hasSpace, setHasSpace] = useState(false);

    useEffect(() => {
        async function checkSpace() {
            // Wait for auth to finish loading first
            if (isLoading) {
                return;
            }

            if (isLoggedIn) {
                const spaceId = await getSpaceId();
                setHasSpace(!!spaceId);
            } else {
                setHasSpace(false);
            }
            setCheckingSpace(false);
        }
        checkSpace();
    }, [isLoggedIn, isLoading]);

    // Show loading while EITHER auth is loading OR space is being checked
    if (isLoading || checkingSpace) {
        return <ActivityIndicator size="large" />;
    }

    if (isLoggedIn) {
        if (!hasSpace) {
            return <Redirect href="/(login)/space-management" />;
        }
        return <Redirect href="/(tabs)/initial" />;
    }

    return <Redirect href="/(login)" />;
}
