import { supabase } from "@/api/clients/supabaseClient";
import type { List } from "@/api/endpoints/types";
import { getSpaceId } from "@/utils/secure-store";
import { createLocalId } from "@/utils/offline/id";
import {
    enqueueOutbox,
    getCachedLists,
    markCachedListDeleted,
    replaceCachedLists,
    upsertCachedList,
} from "@/utils/offline/local-db";
import { getIsOnline } from "@/utils/offline/network";
import { flushOutbox, refreshPendingSyncCount } from "@/utils/offline/sync";
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

async function enqueueListOperation(
    operation: "insert" | "update" | "delete",
    listId: string,
    payload: unknown,
) {
    const now = new Date().toISOString();
    await enqueueOutbox({
        id: createLocalId(),
        entity: "lists",
        entity_id: listId,
        operation,
        payload_json: JSON.stringify(payload),
        created_at: now,
    });
    await refreshPendingSyncCount();
}

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
            const cached = await getCachedLists(spaceId);
            if (cached.length > 0) {
                set({ lists: cached });
            }

            if (!getIsOnline()) return;

            await flushOutbox();

            const { data, error } = await supabase
                .from("lists")
                .select("*")
                .eq("space_id", spaceId)
                .order("last_updated_at", { ascending: false });

            if (error) {
                if (cached.length > 0) return;
                throw error;
            }

            const lists = ((data ?? []) as Array<
                List & { deleted_at?: string | null }
            >).filter((list) => !list.deleted_at);

            await replaceCachedLists(spaceId, lists);
            set({ lists });
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

        if (!getIsOnline()) {
            const newList: List = {
                id: createLocalId(),
                space_id: spaceId,
                type,
                content,
                last_updated_at: now,
            };

            await upsertCachedList(newList);
            await enqueueListOperation("insert", newList.id, newList);

            set((s) => ({
                lists: [newList, ...s.lists],
                isDraftOpen: false,
                draft: null,
            }));

            return newList;
        }

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

        await upsertCachedList(newList);

        set((s) => ({
            lists: [newList, ...s.lists],
            isDraftOpen: false,
            draft: null,
        }));

        return newList;
    },

    updateList: async (listId, type, content) => {
        const now = new Date().toISOString();

        if (!getIsOnline()) {
            const existing = get().lists.find((l) => l.id === listId);
            const updated: List = existing
                ? { ...existing, type, content, last_updated_at: now }
                : {
                      id: listId,
                      type,
                      content,
                      last_updated_at: now,
                      space_id: (await getSpaceId()) ?? "",
                  };

            await upsertCachedList(updated);
            await enqueueListOperation("update", listId, {
                id: listId,
                type,
                content,
                last_updated_at: now,
            });

            set((s) => ({
                lists: [updated, ...s.lists.filter((l) => l.id !== listId)],
            }));
            return;
        }

        const { error } = await supabase
            .from("lists")
            .update({
                type,
                content,
                last_updated_at: now,
            })
            .eq("id", listId);

        if (error) throw error;

        let cachedUpdated: List | null = null;

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
            cachedUpdated = updated;

            const rest = s.lists.filter((l) => l.id !== listId);

            return {
                lists: [updated, ...rest],
            };
        });

        if (cachedUpdated) {
            await upsertCachedList(cachedUpdated);
        }
    },

    deleteList: async (listId) => {
        if (!getIsOnline()) {
            const now = new Date().toISOString();
            await markCachedListDeleted(listId, now);
            await enqueueListOperation("delete", listId, { id: listId });

            set((s) => ({
                lists: s.lists.filter((l) => l.id !== listId),
            }));
            return;
        }

        const { error } = await supabase
            .from("lists")
            .delete()
            .eq("id", listId);
        if (error) throw error;

        await markCachedListDeleted(listId, new Date().toISOString());

        set((s) => ({
            lists: s.lists.filter((l) => l.id !== listId),
        }));
    },
}));
