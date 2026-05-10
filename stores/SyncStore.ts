import { create } from "zustand";

type SyncState = {
    isOnline: boolean;
    isSyncing: boolean;
    pendingCount: number;
    lastSyncedAt: string | null;
    lastError: string | null;

    setOnline: (isOnline: boolean) => void;
    setSyncing: (isSyncing: boolean) => void;
    setPendingCount: (pendingCount: number) => void;
    markSynced: (timestamp: string) => void;
    markFailed: (message: string) => void;
    clearError: () => void;
};

export const useSyncStore = create<SyncState>((set) => ({
    isOnline: true,
    isSyncing: false,
    pendingCount: 0,
    lastSyncedAt: null,
    lastError: null,

    setOnline: (isOnline) => set({ isOnline }),
    setSyncing: (isSyncing) => set({ isSyncing }),
    setPendingCount: (pendingCount) => set({ pendingCount }),
    markSynced: (timestamp) =>
        set({ lastSyncedAt: timestamp, lastError: null, isSyncing: false }),
    markFailed: (message) => set({ lastError: message, isSyncing: false }),
    clearError: () => set({ lastError: null }),
}));
