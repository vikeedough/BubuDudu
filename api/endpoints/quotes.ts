import {
    getCachedQuotes,
    replaceCachedQuotes,
} from "@/utils/offline/local-db";
import { getIsOnline } from "@/utils/offline/network";
import { supabase } from "../clients/supabaseClient";

const fetchQuotes = async (spaceId: string) => {
    const cached = await getCachedQuotes(spaceId);

    if (!getIsOnline()) {
        return cached;
    }

    const { data: quotes, error } = await supabase
        .from("quotes")
        .select("*")
        .eq("space_id", spaceId)
        .order("created_at", { ascending: false });

    if (error) {
        if (cached.length > 0) return cached;
        console.error("Error fetching quotes:", error);
        return [];
    }

    await replaceCachedQuotes(spaceId, quotes ?? []);
    return quotes;
};

export { fetchQuotes };
