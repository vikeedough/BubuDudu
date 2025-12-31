import { Profile } from "@/api/endpoints/types";
import { Session } from "@supabase/supabase-js";
import { createContext, useContext } from "react";

export interface AuthData {
    session: Session | null;
    profile: Profile | null;
    isLoading: boolean;
    isLoggedIn: boolean;
    updateProfile: (patch: Partial<Profile>) => Promise<Profile>;
    refreshProfile: () => Promise<Profile | null>;
}

export const AuthContext = createContext<AuthData>({
    session: null,
    profile: null,
    isLoading: true,
    isLoggedIn: false,
    refreshProfile: async () => null,
    updateProfile: async (_profile: Partial<Profile>) => {
        return {} as Profile;
    },
});

export const useAuthContext = () => useContext(AuthContext);
