import { supabase } from "../clients/supabaseClient";

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

const updateNote = async (note: string) => {
    const { data: userResponse, error: userError } =
        await supabase.auth.getUser();
    if (userError) {
        console.error("Error getting user:", userError);
        return false;
    }
    const user = userResponse.user;
    if (!user) return false;

    const { error } = await supabase
        .from("profiles")
        .update({ note, note_updated_at: new Date().toISOString() })
        .eq("id", user.id);

    if (error) {
        console.error("Error updating note:", error);
        return false;
    }

    return true;
};

export { fetchUsers, updateNote };
