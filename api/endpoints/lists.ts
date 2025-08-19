import { supabase } from "../clients/supabaseClient";

const fetchLists = async () => {
    const { data, error } = await supabase
        .from("lists")
        .select("*")
        .order("last_updated_at", { ascending: false });

    if (error) {
        console.error("Error fetching lists:", error);
        return [];
    }

    return data;
};

const addNewList = async (type: string, content: string) => {
    const { error } = await supabase.from("lists").insert({
        type: type,
        content: content,
        last_updated_at: new Date().toISOString(),
    });

    if (error) {
        console.error("Error adding new list:", error.message);
        return false;
    }

    return true;
};

const deleteList = async (list_id: string) => {
    const { error } = await supabase.from("lists").delete().eq("id", list_id);

    if (error) {
        console.error("Error deleting list:", error.message);
        return false;
    }

    return true;
};

const updateList = async (list_id: string, type: string, content: string) => {
    const { error } = await supabase
        .from("lists")
        .update({
            type: type,
            content: content,
            last_updated_at: new Date().toISOString(),
        })
        .eq("id", list_id);

    if (error) {
        console.error("Error updating list content:", error.message);
        return false;
    }

    return true;
};

export { addNewList, deleteList, fetchLists, updateList };
