import { supabase } from "@/api/clients/supabaseClient";
import type { Wheel } from "@/api/endpoints/types";
import { getSpaceId } from "@/utils/secure-store";
import { createLocalId } from "@/utils/offline/id";
import {
    enqueueOutbox,
    getCachedWheels,
    markCachedWheelDeleted,
    replaceCachedWheels,
    upsertCachedWheel,
} from "@/utils/offline/local-db";
import { getIsOnline } from "@/utils/offline/network";
import { flushOutbox, refreshPendingSyncCount } from "@/utils/offline/sync";
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

async function enqueueWheelOperation(
    operation: "insert" | "update" | "delete",
    wheelId: string,
    payload: unknown,
) {
    const now = new Date().toISOString();
    await enqueueOutbox({
        id: createLocalId(),
        entity: "wheel",
        entity_id: wheelId,
        operation,
        payload_json: JSON.stringify(payload),
        created_at: now,
    });
    await refreshPendingSyncCount();
}

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
            const cached = await getCachedWheels(spaceId);
            if (cached.length > 0) {
                set({ wheels: cached });
            }

            if (!getIsOnline()) return;

            await flushOutbox();

            const { data, error } = await supabase
                .from("wheel")
                .select("*")
                .eq("space_id", spaceId)
                .order("created_at", { ascending: false });

            if (error) {
                if (cached.length > 0) return;
                throw error;
            }

            const wheels = ((data ?? []) as Array<
                Wheel & { deleted_at?: string | null }
            >).filter((wheel) => !wheel.deleted_at);

            await replaceCachedWheels(spaceId, wheels);
            set({ wheels });
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

        if (!getIsOnline()) {
            const newWheel: Wheel = {
                id: createLocalId(),
                space_id: spaceId,
                title,
                choices,
                created_at: now,
            };

            await upsertCachedWheel(newWheel);
            await enqueueWheelOperation("insert", newWheel.id, newWheel);

            set((s) => ({
                wheels: [newWheel, ...s.wheels],
                isDraftOpen: false,
                draft: null,
            }));

            return newWheel;
        }

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

        await upsertCachedWheel(newWheel);

        set((s) => ({
            wheels: [newWheel, ...s.wheels],
            isDraftOpen: false,
            draft: null,
        }));

        return newWheel;
    },

    updateWheelTitle: async (wheelId, title) => {
        if (!getIsOnline()) {
            const existing = get().wheels.find((w) => w.id === wheelId);
            const updatedWheel = existing ? { ...existing, title } : null;

            if (updatedWheel) {
                set((s) => ({
                    wheels: s.wheels.map((w) =>
                        w.id === wheelId ? updatedWheel : w,
                    ),
                }));
                await upsertCachedWheel({
                    ...updatedWheel,
                    updated_at: new Date().toISOString(),
                });
            }

            await enqueueWheelOperation("update", wheelId, { id: wheelId, title });
            return;
        }

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

        const updated = get().wheels.find((w) => w.id === wheelId);
        if (updated) {
            await upsertCachedWheel({
                ...updated,
                updated_at: new Date().toISOString(),
            });
        }
    },

    updateWheelChoices: async (wheelId, choices) => {
        if (!getIsOnline()) {
            const existing = get().wheels.find((w) => w.id === wheelId);
            const updatedWheel = existing ? { ...existing, choices } : null;

            if (updatedWheel) {
                set((s) => ({
                    wheels: s.wheels.map((w) =>
                        w.id === wheelId ? updatedWheel : w,
                    ),
                }));
                await upsertCachedWheel({
                    ...updatedWheel,
                    updated_at: new Date().toISOString(),
                });
            }

            await enqueueWheelOperation("update", wheelId, {
                id: wheelId,
                choices,
            });
            return;
        }

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

        const updated = get().wheels.find((w) => w.id === wheelId);
        if (updated) {
            await upsertCachedWheel({
                ...updated,
                updated_at: new Date().toISOString(),
            });
        }
    },

    deleteWheel: async (wheelId) => {
        if (!getIsOnline()) {
            const now = new Date().toISOString();
            await markCachedWheelDeleted(wheelId, now);
            await enqueueWheelOperation("delete", wheelId, { id: wheelId });

            set((s) => ({
                wheels: s.wheels.filter((w) => w.id !== wheelId),
            }));
            return;
        }

        const { error } = await supabase
            .from("wheel")
            .delete()
            .eq("id", wheelId);
        if (error) throw error;

        await markCachedWheelDeleted(wheelId, new Date().toISOString());

        set((s) => ({
            wheels: s.wheels.filter((w) => w.id !== wheelId),
        }));
    },
}));
