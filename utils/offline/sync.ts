import { supabase } from "@/api/clients/supabaseClient";
import { useSyncStore } from "@/stores/SyncStore";
import {
    getPendingOutbox,
    getPendingOutboxCount,
    markOutboxItemFailed,
    removeOutboxItem,
    type OutboxItem,
} from "@/utils/offline/local-db";
import { getIsOnline } from "@/utils/offline/network";

let syncPromise: Promise<void> | null = null;

function parsePayload<T>(item: OutboxItem): T {
    return JSON.parse(item.payload_json) as T;
}

async function syncListItem(item: OutboxItem) {
    const payload = parsePayload<Record<string, unknown>>(item);

    if (item.operation === "insert") {
        const { error } = await supabase.from("lists").insert(payload);
        if (error) throw error;
        return;
    }

    if (item.operation === "update") {
        const { id: _id, ...patch } = payload;
        const { error } = await supabase
            .from("lists")
            .update(patch)
            .eq("id", item.entity_id);
        if (error) throw error;
        return;
    }

    if (item.operation === "delete") {
        const { error } = await supabase
            .from("lists")
            .delete()
            .eq("id", item.entity_id);
        if (error) throw error;
    }
}

async function syncWheelItem(item: OutboxItem) {
    const payload = parsePayload<Record<string, unknown>>(item);

    if (item.operation === "insert") {
        const { error } = await supabase.from("wheel").insert(payload);
        if (error) throw error;
        return;
    }

    if (item.operation === "update") {
        const { id: _id, ...patch } = payload;
        const { error } = await supabase
            .from("wheel")
            .update(patch)
            .eq("id", item.entity_id);
        if (error) throw error;
        return;
    }

    if (item.operation === "delete") {
        const { error } = await supabase
            .from("wheel")
            .delete()
            .eq("id", item.entity_id);
        if (error) throw error;
    }
}

async function syncMilestoneItem(item: OutboxItem) {
    const payload = parsePayload<Record<string, unknown>>(item);

    const { error } = await supabase
        .from("milestones")
        .upsert(payload, { onConflict: "space_id" });

    if (error) throw error;
}

async function syncProfileNoteItem(item: OutboxItem) {
    const payload = parsePayload<{
        userId: string;
        note: string;
        note_updated_at: string;
    }>(item);

    const patch = {
        note: payload.note,
        note_updated_at: payload.note_updated_at,
        updated_at: payload.note_updated_at,
    };

    const { data: updatedRow, error: updateError } = await supabase
        .from("profiles")
        .update(patch)
        .eq("id", payload.userId)
        .select("id")
        .maybeSingle();

    if (updateError) throw updateError;
    if (updatedRow) return;

    const { error: insertError } = await supabase.from("profiles").insert({
        id: payload.userId,
        ...patch,
    });

    if (insertError) throw insertError;
}

async function syncOutboxItem(item: OutboxItem) {
    if (item.entity === "lists") {
        await syncListItem(item);
        return;
    }

    if (item.entity === "wheel") {
        await syncWheelItem(item);
        return;
    }

    if (item.entity === "milestones") {
        await syncMilestoneItem(item);
        return;
    }

    if (item.entity === "profile_note") {
        await syncProfileNoteItem(item);
    }
}

export async function refreshPendingSyncCount() {
    const pendingCount = await getPendingOutboxCount();
    useSyncStore.getState().setPendingCount(pendingCount);
    return pendingCount;
}

export async function flushOutbox() {
    if (!getIsOnline()) return;

    if (syncPromise) {
        await syncPromise;
        return;
    }

    syncPromise = (async () => {
        useSyncStore.getState().setSyncing(true);

        const items = await getPendingOutbox();
        let lastError: string | null = null;

        for (const item of items) {
            try {
                await syncOutboxItem(item);
                await removeOutboxItem(item.id);
            } catch (error: any) {
                const message = error?.message ?? String(error);
                lastError = message;
                await markOutboxItemFailed(item.id, message);
            }
        }

        const pendingCount = await refreshPendingSyncCount();

        if (lastError) {
            useSyncStore.getState().markFailed(lastError);
            return;
        }

        if (items.length > 0 || pendingCount === 0) {
            useSyncStore.getState().markSynced(new Date().toISOString());
        } else {
            useSyncStore.getState().setSyncing(false);
        }
    })();

    try {
        await syncPromise;
    } finally {
        syncPromise = null;
    }
}
