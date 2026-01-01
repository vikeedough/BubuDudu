import { supabase } from "@/api/clients/supabaseClient";
import { Profile } from "@/api/endpoints/types";
import { AuthContext } from "@/hooks/useAuthContext";
import type { Session } from "@supabase/supabase-js";
import { PropsWithChildren, useCallback, useEffect, useState } from "react";

export default function AuthProvider({ children }: PropsWithChildren) {
    const [session, setSession] = useState<Session | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    // Fetch session and subscribe to auth changes
    useEffect(() => {
        const fetchSession = async () => {
            setIsLoading(true);

            const {
                data: { session },
                error,
            } = await supabase.auth.getSession();

            if (error) {
                console.error("Error fetching session:", error.message);
            }

            setSession(session);
            setIsLoading(false);
        };

        fetchSession();

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const refreshProfile = useCallback(async () => {
        if (!session) {
            setProfile(null);
            return null;
        }

        const { data, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .maybeSingle();

        if (error) throw error;

        setProfile(data as Profile);
        return data as Profile;
    }, [session]);

    // Fetch profile when session changes
    useEffect(() => {
        refreshProfile().catch((e) => {
            console.error("Error fetching profile:", e.message ?? e);
            setProfile(null);
        });
    }, [refreshProfile]);

    const updateProfile = useCallback(
        async (patch: Partial<Profile>) => {
            if (!session) throw new Error("No session");

            const { data, error } = await supabase
                .from("profiles")
                .update(patch)
                .eq("id", session.user.id)
                .select("*")
                .single();

            if (error) throw error;

            setProfile(data as Profile);
            return data as Profile;
        },
        [session]
    );

    return (
        <AuthContext.Provider
            value={{
                session,
                isLoading,
                profile,
                isLoggedIn: session != undefined,
                refreshProfile,
                updateProfile,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}
