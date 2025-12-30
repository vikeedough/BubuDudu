import { supabase } from "../clients/supabaseClient";

const fetchMilestones = async (spaceId: string) => {
    const { data: milestones, error } = await supabase
        .from("milestones")
        .select("*")
        .eq("space_id", spaceId)
        .order("date", { ascending: true });

    if (error) {
        console.error("Error fetching milestones:", error);
        return [];
    }

    return milestones;
};

export { fetchMilestones };
