import { StyleSheet, View } from "react-native";

import CustomText from "@/components/CustomText";
import { Colors } from "@/constants/colors";
import { useSyncStore } from "@/stores/SyncStore";

export function SyncIndicator() {
    const isOnline = useSyncStore((s) => s.isOnline);
    const isSyncing = useSyncStore((s) => s.isSyncing);
    const pendingCount = useSyncStore((s) => s.pendingCount);
    const lastError = useSyncStore((s) => s.lastError);

    const label = !isOnline
        ? pendingCount > 0
            ? `Offline · ${pendingCount}`
            : "Offline"
        : isSyncing
          ? "Syncing"
          : lastError
            ? "Sync failed"
            : pendingCount > 0
              ? `Pending · ${pendingCount}`
              : "Synced";

    const tone = !isOnline
        ? styles.offline
        : lastError
          ? styles.failed
          : isSyncing || pendingCount > 0
            ? styles.syncing
            : styles.synced;

    return (
        <View pointerEvents="none" style={[styles.container, tone]}>
            <CustomText weight="semibold" style={styles.text}>
                {label}
            </CustomText>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: "absolute",
        top: 52,
        right: 14,
        zIndex: 5000,
        minHeight: 26,
        paddingHorizontal: 10,
        borderRadius: 999,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.18,
        shadowRadius: 3,
        elevation: 4,
    },
    text: {
        color: Colors.white,
        fontSize: 11,
    },
    offline: {
        backgroundColor: Colors.orangeText,
    },
    failed: {
        backgroundColor: Colors.red,
    },
    syncing: {
        backgroundColor: Colors.darkBlue,
    },
    synced: {
        backgroundColor: Colors.green,
    },
});
