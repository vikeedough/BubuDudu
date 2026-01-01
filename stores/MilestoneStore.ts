import { supabase } from "@/api/clients/supabaseClient";
import { Milestone } from "@/api/endpoints/types";
import { getSpaceId } from "@/utils/secure-store";
import { create } from "zustand";

type MilestoneState = {
    milestone: Milestone | null;
    isLoading: boolean;
    error: string | null;

    fetchMilestone: () => Promise<Milestone | null>;
    upsertMilestone: (title: string, date: string) => Promise<Milestone>;
    clearMilestone: () => void;
};

export const useMilestoneStore = create<MilestoneState>((set) => ({
    milestone: null,
    isLoading: false,
    error: null,

    clearMilestone: () =>
        set({ milestone: null, error: null, isLoading: false }),

    fetchMilestone: async () => {
        set({ isLoading: true, error: null });

        const spaceId = await getSpaceId();
        if (!spaceId) {
            set({ milestone: null, isLoading: false });
            return null;
        }

        const { data, error } = await supabase
            .from("milestones")
            .select("*")
            .eq("space_id", spaceId)
            .maybeSingle();

        if (error) {
            set({ error: error.message, isLoading: false });
            return null;
        }

        set({ milestone: (data as Milestone) ?? null, isLoading: false });
        return (data as Milestone) ?? null;
    },

    upsertMilestone: async (title, date) => {
        set({ isLoading: true, error: null });

        const spaceId = await getSpaceId();
        if (!spaceId) {
            const msg = "No spaceId found";
            set({ error: msg, isLoading: false });
            throw new Error(msg);
        }

        const { data, error } = await supabase
            .from("milestones")
            .upsert(
                { space_id: spaceId, title, date },
                { onConflict: "space_id" }
            )
            .select("*")
            .single();

        if (error) {
            set({ error: error.message, isLoading: false });
            throw error;
        }

        set({ milestone: data as Milestone, isLoading: false });
        return data as Milestone;
    },
}));
