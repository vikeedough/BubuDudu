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

const insertOrUpdateMilestone = async (
    spaceId: string,
    title: string,
    date: string
) => {
    const { data, error } = await supabase
        .from("milestones")
        .upsert(
            { space_id: spaceId, title: title, date: date },
            { onConflict: "space_id" }
        )
        .select()
        .single();

    if (error) {
        console.error("Error inserting/updating milestone:", error);
        return null;
    }

    return data;
};

export { fetchMilestones, insertOrUpdateMilestone };
