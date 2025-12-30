import { supabase } from "../clients/supabaseClient";

const fetchQuotes = async (spaceId: string) => {
    const { data: quotes, error } = await supabase
        .from("quotes")
        .select("*")
        .eq("space_id", spaceId)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching quotes:", error);
        return [];
    }

    return quotes;
};

export { fetchQuotes };
