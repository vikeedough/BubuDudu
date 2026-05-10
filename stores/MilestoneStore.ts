import { supabase } from "@/api/clients/supabaseClient";
import { Milestone } from "@/api/endpoints/types";
import { getSpaceId } from "@/utils/secure-store";
import { createLocalId } from "@/utils/offline/id";
import {
    enqueueOutbox,
    getCachedMilestone,
    upsertCachedMilestone,
} from "@/utils/offline/local-db";
import { getIsOnline } from "@/utils/offline/network";
import { flushOutbox, refreshPendingSyncCount } from "@/utils/offline/sync";
import { create } from "zustand";

type MilestoneState = {
    milestone: Milestone | null;
    isLoading: boolean;
    error: string | null;

    fetchMilestone: () => Promise<Milestone | null>;
    upsertMilestone: (title: string, date: string) => Promise<Milestone>;
    clearMilestone: () => void;
};

async function enqueueMilestoneUpsert(
    spaceId: string,
    payload: Record<string, unknown>,
) {
    await enqueueOutbox({
        id: createLocalId(),
        entity: "milestones",
        entity_id: spaceId,
        operation: "upsert",
        payload_json: JSON.stringify(payload),
        created_at: new Date().toISOString(),
    });
    await refreshPendingSyncCount();
}

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

        const cached = await getCachedMilestone(spaceId);
        if (cached) {
            set({ milestone: cached, isLoading: false });
        }

        if (!getIsOnline()) {
            set({ isLoading: false });
            return cached;
        }

        await flushOutbox();

        const { data, error } = await supabase
            .from("milestones")
            .select("*")
            .eq("space_id", spaceId)
            .maybeSingle();

        if (error) {
            set({ error: error.message, isLoading: false });
            return null;
        }

        const milestone = (data as Milestone) ?? null;
        if (milestone) {
            await upsertCachedMilestone(spaceId, milestone);
        }

        set({ milestone, isLoading: false });
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

        if (!getIsOnline()) {
            const offlineMilestone: Milestone = {
                id: 0,
                title,
                date,
            };

            await upsertCachedMilestone(spaceId, {
                ...offlineMilestone,
                updated_at: new Date().toISOString(),
            });
            await enqueueMilestoneUpsert(spaceId, {
                space_id: spaceId,
                title,
                date,
            });

            set({ milestone: offlineMilestone, isLoading: false });
            return offlineMilestone;
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

        const milestone = data as Milestone;
        await upsertCachedMilestone(spaceId, milestone);

        set({ milestone, isLoading: false });
        return milestone;
    },
}));
