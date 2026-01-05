import { supabase } from "@/api/clients/supabaseClient";
import type { List } from "@/api/endpoints/types";
import { getSpaceId } from "@/utils/secure-store";
import { create } from "zustand";

type ListDraft = { type: string; content: string };

type ListStore = {
    lists: List[];
    isLoadingLists: boolean;

    // local-only draft (still store-driven; not in DB)
    draft: ListDraft | null;
    isDraftOpen: boolean;

    fetchLists: () => Promise<void>;

    openDraft: () => void;
    updateDraft: (patch: Partial<ListDraft>) => void;
    closeDraft: () => void;

    addList: (type: string, content: string) => Promise<List>;
    updateList: (
        listId: string,
        type: string,
        content: string
    ) => Promise<void>;
    deleteList: (listId: string) => Promise<void>;
};

export const useListStore = create<ListStore>((set, get) => ({
    lists: [],
    isLoadingLists: false,

    draft: null,
    isDraftOpen: false,

    fetchLists: async () => {
        if (get().isLoadingLists) return;

        const spaceId = await getSpaceId();
        if (!spaceId) return;

        set({ isLoadingLists: true });
        try {
            const { data, error } = await supabase
                .from("lists")
                .select("*")
                .eq("space_id", spaceId)
                .order("last_updated_at", { ascending: false });

            if (error) throw error;

            set({ lists: (data ?? []) as List[] });
        } finally {
            set({ isLoadingLists: false });
        }
    },

    openDraft: () =>
        set({ isDraftOpen: true, draft: { type: "", content: "" } }),

    updateDraft: (patch) => {
        const curr = get().draft ?? { type: "", content: "" };
        set({ draft: { ...curr, ...patch } });
    },

    closeDraft: () => set({ isDraftOpen: false, draft: null }),

    addList: async (type, content) => {
        const spaceId = await getSpaceId();
        if (!spaceId) throw new Error("No active spaceId");

        const now = new Date().toISOString();

        const { data, error } = await supabase
            .from("lists")
            .insert({
                space_id: spaceId,
                type,
                content,
                last_updated_at: now,
            })
            .select("*")
            .single();

        if (error) throw error;

        const newList = data as List;

        set((s) => ({
            lists: [newList, ...s.lists],
            isDraftOpen: false,
            draft: null,
        }));

        return newList;
    },

    updateList: async (listId, type, content) => {
        const now = new Date().toISOString();

        const { error } = await supabase
            .from("lists")
            .update({
                type,
                content,
                last_updated_at: now,
            })
            .eq("id", listId);

        if (error) throw error;

        set((s) => {
            const updated: List = s.lists.find((l) => l.id === listId)
                ? ({
                      ...s.lists.find((l) => l.id === listId)!,
                      type,
                      content,
                      last_updated_at: now,
                  } as List)
                : ({
                      id: listId,
                      type,
                      content,
                      last_updated_at: now,
                      space_id: "",
                  } as List);

            const rest = s.lists.filter((l) => l.id !== listId);

            return {
                lists: [updated, ...rest],
            };
        });
    },

    deleteList: async (listId) => {
        const { error } = await supabase
            .from("lists")
            .delete()
            .eq("id", listId);
        if (error) throw error;

        set((s) => ({
            lists: s.lists.filter((l) => l.id !== listId),
        }));
    },
}));
