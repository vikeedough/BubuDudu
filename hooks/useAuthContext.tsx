import { Profile } from "@/api/endpoints/types";
import { Session } from "@supabase/supabase-js";
import { createContext, useContext } from "react";

export interface AuthData {
    session: Session | null;
    profile: Profile | null;
    isLoading: boolean;
    isLoggedIn: boolean;
}

export const AuthContext = createContext<AuthData>({
    session: null,
    profile: null,
    isLoading: true,
    isLoggedIn: false,
});

export const useAuthContext = () => useContext(AuthContext);
