import { PropsWithChildren, useCallback, useEffect, useState } from "react";

import { supabase } from "@/api/clients/supabaseClient";
import { Profile } from "@/api/endpoints/types";
import { AuthContext } from "@/hooks/useAuthContext";
import { useCalendarStore } from "@/stores/CalendarStore";
import { getCachedProfile, upsertCachedProfile } from "@/utils/offline/local-db";
import { getIsOnline } from "@/utils/offline/network";
import { getSpaceId } from "@/utils/secure-store";
import { clearWidgetPrivateData, reportWidgetError } from "@/widgets/calendar/sync";

import type { Session } from "@supabase/supabase-js";

export default function AuthProvider({ children }: PropsWithChildren) {
    const [session, setSession] = useState<Session | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    // Fetch session and subscribe to auth changes
    useEffect(() => {
        let currentUserId: string | null = null;
        const acceptSession = (next: Session | null) => {
            const nextUserId = next?.user.id ?? null;
            if (nextUserId !== currentUserId || !next) {
                useCalendarStore.getState().clear();
                if (currentUserId || !next) void clearWidgetPrivateData().catch(reportWidgetError);
            }
            currentUserId = nextUserId;
            setSession(next);
        };
        const fetchSession = async () => {
            setIsLoading(true);

            const {
                data: { session },
                error,
            } = await supabase.auth.getSession();

            if (error) {
                console.error("Error fetching session:", error.message);
            }

            acceptSession(session);
            setIsLoading(false);
        };

        fetchSession();

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            acceptSession(session);
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

        const spaceId = await getSpaceId();
        const cached = spaceId
            ? await getCachedProfile(spaceId, session.user.id)
            : null;

        if (cached) {
            setProfile(cached);
        }

        if (!getIsOnline()) {
            return cached;
        }

        const { data, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .maybeSingle();

        if (error) {
            if (cached) return cached;
            throw error;
        }

        const profile = data as Profile;
        if (spaceId && profile) {
            await upsertCachedProfile(spaceId, profile);
        }

        setProfile(profile);
        return profile;
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

            const { data: updatedRow, error: updateError } = await supabase
                .from("profiles")
                .update(patch)
                .eq("id", session.user.id)
                .select("id")
                .maybeSingle();

            if (updateError) throw updateError;

            if (!updatedRow) {
                const { error: insertError } = await supabase
                    .from("profiles")
                    .insert({ id: session.user.id, ...patch });

                if (insertError) throw insertError;
            }

            const refreshedProfile = await refreshProfile();
            if (!refreshedProfile) {
                throw new Error("Profile row not found after update.");
            }

            return refreshedProfile;
        },
        [refreshProfile, session]
    );

    return (
        <AuthContext.Provider
            value={{
                session,
                isLoading,
                profile,
                isLoggedIn: !!session,
                refreshProfile,
                updateProfile,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}
