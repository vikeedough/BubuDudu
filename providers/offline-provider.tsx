import NetInfo from "@react-native-community/netinfo";
import { PropsWithChildren, useEffect, useRef } from "react";

import { useGalleryStore } from "@/stores/GalleryStore";
import { useListStore } from "@/stores/ListStore";
import { useMilestoneStore } from "@/stores/MilestoneStore";
import { useSyncStore } from "@/stores/SyncStore";
import { useWheelStore } from "@/stores/WheelStore";
import { toast } from "@/toast/api";
import { getOfflineDb } from "@/utils/offline/local-db";
import { setIsOnline } from "@/utils/offline/network";
import { flushOutbox, refreshPendingSyncCount } from "@/utils/offline/sync";

const CONNECTIVITY_TOAST_ID = "connectivity-status";
const SYNC_TOAST_ID = "sync-status";

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
    const lastOnlineRef = useRef<boolean | null>(null);

    useEffect(() => {
        void getOfflineDb().then(refreshPendingSyncCount).catch((error) => {
            console.warn("Offline database init failed:", error);
        });

        const applyOnlineState = (next: boolean) => {
            const previous = lastOnlineRef.current;
            lastOnlineRef.current = next;

            setIsOnline(next);
            setOnlineState(next);

            if (previous === null) {
                if (!next) {
                    toast.show(CONNECTIVITY_TOAST_ID, {
                        title: "Offline mode",
                        message:
                            "Changes will stay on this device and sync when you're online.",
                        durationMs: 4000,
                    });
                }
                return;
            }

            if (previous === next) return;

            if (next) {
                const pendingCount = useSyncStore.getState().pendingCount;
                toast.show(CONNECTIVITY_TOAST_ID, {
                    title: "Back online",
                    message:
                        pendingCount > 0
                            ? "Syncing your pending changes now."
                            : "Refreshing the latest updates.",
                    durationMs: 3000,
                });
                return;
            }

            toast.show(CONNECTIVITY_TOAST_ID, {
                title: "You're offline",
                message:
                    "You can keep using the app. Changes will sync later.",
                durationMs: 4000,
            });
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
            const pendingBeforeSync = useSyncStore.getState().pendingCount;
            await flushOutbox();
            if (!cancelled) {
                await refreshStoresAfterSync();
            }
            const pendingAfterSync = useSyncStore.getState().pendingCount;
            const lastErrorAfterSync = useSyncStore.getState().lastError;

            if (
                !cancelled &&
                pendingBeforeSync > 0 &&
                pendingAfterSync === 0 &&
                !lastErrorAfterSync
            ) {
                toast.show(SYNC_TOAST_ID, {
                    title: "Sync complete",
                    message: "Your offline changes are up to date.",
                    durationMs: 3000,
                });
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
        toast.show(SYNC_TOAST_ID, {
            title: "Sync failed",
            message:
                "Some offline changes could not sync yet. We'll keep retrying.",
            durationMs: 5000,
        });
    }, [lastError]);

    return children;
}
