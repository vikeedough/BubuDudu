import { getSpaceId } from "@/utils/secure-store";
import { supabase } from "../clients/supabaseClient";
import { SpaceInvite } from "./types";

export const fetchSpaceInvite = async (): Promise<SpaceInvite | null> => {
    const spaceId = await getSpaceId();

    const { data: invite, error } = await supabase
        .from("space_invites")
        .select("*")
        .eq("space_id", spaceId)
        .single();

    if (error) {
        console.error("Error fetching milestones:", error);
        return null;
    }

    return invite;
};
