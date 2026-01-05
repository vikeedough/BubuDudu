import { supabase } from "@/api/clients/supabaseClient";
import type { Wheel } from "@/api/endpoints/types";
import { getSpaceId } from "@/utils/secure-store";
import { create } from "zustand";

type WheelDraft = { title: string; choices: string[] };

type WheelStore = {
    wheels: Wheel[];
    isLoadingWheels: boolean;

    draft: WheelDraft | null;
    isDraftOpen: boolean;

    fetchWheels: () => Promise<void>;

    openDraft: () => void;
    updateDraft: (patch: Partial<WheelDraft>) => void;
    closeDraft: () => void;

    addWheel: (title: string, choices: string[]) => Promise<Wheel>;
    updateWheelTitle: (wheelId: string, title: string) => Promise<void>;
    updateWheelChoices: (wheelId: string, choices: string[]) => Promise<void>;
    deleteWheel: (wheelId: string) => Promise<void>;
};

export const useWheelStore = create<WheelStore>((set, get) => ({
    wheels: [],
    isLoadingWheels: false,

    draft: null,
    isDraftOpen: false,

    fetchWheels: async () => {
        if (get().isLoadingWheels) return;

        const spaceId = await getSpaceId();
        if (!spaceId) return;

        set({ isLoadingWheels: true });
        try {
            const { data, error } = await supabase
                .from("wheel")
                .select("*")
                .eq("space_id", spaceId)
                .order("created_at", { ascending: false });

            if (error) throw error;

            set({ wheels: (data ?? []) as Wheel[] });
        } finally {
            set({ isLoadingWheels: false });
        }
    },

    openDraft: () =>
        set({ isDraftOpen: true, draft: { title: "", choices: [] } }),

    updateDraft: (patch) => {
        const curr = get().draft ?? { title: "", choices: [] };
        set({ draft: { ...curr, ...patch } });
    },

    closeDraft: () => set({ isDraftOpen: false, draft: null }),

    addWheel: async (title, choices) => {
        const spaceId = await getSpaceId();
        if (!spaceId) throw new Error("No active spaceId");

        const now = new Date().toISOString();

        const { data, error } = await supabase
            .from("wheel")
            .insert({
                space_id: spaceId,
                title,
                choices,
                created_at: now,
            })
            .select("*")
            .single();

        if (error) throw error;

        const newWheel = data as Wheel;

        set((s) => ({
            wheels: [newWheel, ...s.wheels],
            isDraftOpen: false,
            draft: null,
        }));

        return newWheel;
    },

    updateWheelTitle: async (wheelId, title) => {
        const { error } = await supabase
            .from("wheel")
            .update({ title })
            .eq("id", wheelId);

        if (error) throw error;

        // Keep the same ordering as before (created_at DESC)
        // We do NOT reorder on title edit.
        set((s) => ({
            wheels: s.wheels.map((w) =>
                w.id === wheelId ? { ...w, title } : w
            ),
        }));
    },

    updateWheelChoices: async (wheelId, choices) => {
        const { error } = await supabase
            .from("wheel")
            .update({ choices })
            .eq("id", wheelId);

        if (error) throw error;

        set((s) => ({
            wheels: s.wheels.map((w) =>
                w.id === wheelId ? { ...w, choices } : w
            ),
        }));
    },

    deleteWheel: async (wheelId) => {
        const { error } = await supabase
            .from("wheel")
            .delete()
            .eq("id", wheelId);
        if (error) throw error;

        set((s) => ({
            wheels: s.wheels.filter((w) => w.id !== wheelId),
        }));
    },
}));
