import { supabase } from "@/api/clients/supabaseClient";
import { Profile } from "@/api/endpoints/types";
import { AuthContext } from "@/hooks/useAuthContext";
import type { Session } from "@supabase/supabase-js";
import { PropsWithChildren, useEffect, useState } from "react";

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

    // Fetch profile when session changes
    useEffect(() => {
        const fetchProfile = async () => {
            if (session) {
                const { data } = await supabase
                    .from("profiles")
                    .select("*")
                    .eq("id", session.user.id)
                    .single();
                setProfile(data as Profile);
            } else {
                setProfile(null);
            }
        };
        fetchProfile();
    }, [session]);

    return (
        <AuthContext.Provider
            value={{
                session,
                isLoading,
                profile,
                isLoggedIn: session != undefined,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}
