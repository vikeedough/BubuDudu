import { supabase } from "@/api/clients/supabaseClient";
import type { OutboxItem } from "@/utils/offline/local-db";
function parsePayload<T>(item: OutboxItem): T { return JSON.parse(item.payload_json) as T; }
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
