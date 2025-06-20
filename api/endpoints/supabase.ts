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

export { fetchMilestones, fetchQuotes, fetchUsers, updateNote };
