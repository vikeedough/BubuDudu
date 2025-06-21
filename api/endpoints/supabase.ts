import { supabase } from "../clients/supabaseClient";

const fetchMilestones = async () => {
    const { data, error } = await supabase
        .from("milestones")
        .select("*")
        .order("id", { ascending: true });

    if (error) {
        console.error("Error fetching milestones:", error);
        return [];
    }

    return data;
};

const fetchQuotes = async () => {
    const { data, error } = await supabase.from("quotes").select("*");

    if (error) {
        console.error("Error fetching quotes:", error);
        return [];
    }

    return data;
};

const fetchUsers = async () => {
    const { data, error } = await supabase
        .from("users")
        .select("*")
        .order("id", { ascending: true });

    if (error) {
        console.error("Error fetching users:", error);
        return [];
    }

    return data;
};

const fetchLists = async () => {
    const { data, error } = await supabase.from("lists").select("*");

    if (error) {
        console.error("Error fetching lists:", error);
        return [];
    }

    return data;
};
const updateNote = async (note: string, user_id: number) => {
    const { error } = await supabase
        .from("users")
        .update({ note: note, note_updated_at: new Date().toISOString() })
        .eq("id", user_id);

    if (error) {
        console.error("Error updating note:", error);
        return false;
    }

    return true;
};

const uploadAvatarAndUpdateUser = async (user_id: number, fileUri: string) => {
    const fileName = `${user_id}-${Date.now()}-avatar.jpg`;

    const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, {
            uri: fileUri,
            type: "image/jpeg",
            name: fileName,
        } as any);

    if (uploadError) {
        console.error("Error uploading avatar:", uploadError.message);
        return null;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);
    const publicUrl = data.publicUrl;

    const { error: updateError } = await supabase
        .from("users")
        .update({ avatar_url: publicUrl })
        .eq("id", user_id);

    if (updateError) {
        console.error("Error updating user avatar:", updateError.message);
        return null;
    }

    return publicUrl;
};

const addNewList = async (type: string) => {
    const { error } = await supabase.from("lists").insert({ type: type });

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
        .update({ type: type, content: content })
        .eq("id", list_id);

    if (error) {
        console.error("Error updating list content:", error.message);
        return false;
    }

    return true;
};

export {
    addNewList,
    deleteList,
    fetchLists,
    fetchMilestones,
    fetchQuotes,
    fetchUsers,
    updateList,
    updateNote,
    uploadAvatarAndUpdateUser,
};
