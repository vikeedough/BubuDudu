import NetInfo from "@react-native-community/netinfo";
import { PropsWithChildren, useEffect, useRef } from "react";
import { Alert } from "react-native";

import { useGalleryStore } from "@/stores/GalleryStore";
import { useListStore } from "@/stores/ListStore";
import { useMilestoneStore } from "@/stores/MilestoneStore";
import { useSyncStore } from "@/stores/SyncStore";
import { useWheelStore } from "@/stores/WheelStore";
import { getOfflineDb } from "@/utils/offline/local-db";
import { setIsOnline } from "@/utils/offline/network";
import { flushOutbox, refreshPendingSyncCount } from "@/utils/offline/sync";

async function refreshStoresAfterSync() {
    await Promise.allSettled([
        useListStore.getState().fetchLists(),
        useWheelStore.getState().fetchWheels(),
        useMilestoneStore.getState().fetchMilestone(),
        useGalleryStore.getState().refreshGalleries(),
    ]);
}

export function OfflineProvider({ children }: PropsWithChildren) {
    const isOnline = useSyncStore((s) => s.isOnline);
    const lastError = useSyncStore((s) => s.lastError);
    const setOnlineState = useSyncStore((s) => s.setOnline);
    const lastAlertedErrorRef = useRef<string | null>(null);

    useEffect(() => {
        void getOfflineDb().then(refreshPendingSyncCount).catch((error) => {
            console.warn("Offline database init failed:", error);
        });

        const applyOnlineState = (next: boolean) => {
            setIsOnline(next);
            setOnlineState(next);
        };

        NetInfo.fetch()
            .then((state) => {
                const reachable = state.isInternetReachable ?? true;
                applyOnlineState(Boolean(state.isConnected && reachable));
            })
            .catch((error) => {
                console.warn("Connectivity check failed:", error);
            });

        return NetInfo.addEventListener((state) => {
            const reachable = state.isInternetReachable ?? true;
            applyOnlineState(Boolean(state.isConnected && reachable));
        });
    }, [setOnlineState]);

    useEffect(() => {
        if (!isOnline) return;

        let cancelled = false;

        const run = async () => {
            await flushOutbox();
            if (!cancelled) {
                await refreshStoresAfterSync();
            }
        };

        void run().catch((error) => {
            const message = error?.message ?? String(error);
            useSyncStore.getState().markFailed(message);
        });

        return () => {
            cancelled = true;
        };
    }, [isOnline]);

    useEffect(() => {
        if (!lastError) {
            lastAlertedErrorRef.current = null;
            return;
        }
        if (lastAlertedErrorRef.current === lastError) return;
        lastAlertedErrorRef.current = lastError;
        Alert.alert(
            "Sync failed",
            "Some offline changes could not sync yet. We'll keep retrying when you're online.",
        );
    }, [lastError]);

    return children;
}
