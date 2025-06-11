import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface User {
    id: number;
    name: string;
    avatar_url: string;
}

interface UserStore {
    currentUser: User | null;
    login: (user: User) => void;
    logout: () => void;
    isLoggedIn: boolean;
    hasHydrated: boolean;
    setHasHydrated: (v: boolean) => void;
}

export const useUserStore = create<UserStore>()(
    persist(
        (set) => ({
            currentUser: null,
            login: (user: User) => set({ currentUser: user, isLoggedIn: true }),
            logout: () => set({ currentUser: null, isLoggedIn: false }),
            isLoggedIn: false,
            hasHydrated: false,
            setHasHydrated: (v: boolean) => set({ hasHydrated: v }),
        }),
        {
            name: "user-storage",
            storage: createJSONStorage(() => AsyncStorage),
            onRehydrateStorage: () => (state) => {
                state?.setHasHydrated(true);
            },
        }
    )
);
